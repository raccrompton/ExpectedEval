/**
 * Stockfish WebAssembly Engine Implementation
 *
 * This file provides a real Stockfish chess engine that runs in the browser
 * using WebAssembly. Stockfish is the strongest open-source chess engine,
 * and this implementation wraps the lila-stockfish-web package (used by Lichess).
 *
 * How it works:
 * 1. Load Stockfish WASM module into browser
 * 2. Load NNUE (neural network) files for modern evaluation
 * 3. Send UCI commands to analyze positions
 * 4. Parse engine output to extract evaluations
 *
 * UCI (Universal Chess Interface) is a protocol for communicating with chess engines.
 * Commands like "go depth 15" tell the engine to analyze to a certain depth.
 *
 * Requirements:
 * - SharedArrayBuffer support (needs CORS headers)
 * - WASM files in /public/stockfish/
 * - NNUE files in /public/stockfish/
 *
 * @example
 * const stockfish = new RealStockfish()
 * await stockfish.init()
 *
 * const result = await stockfish.evaluate(
 *   'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
 *   { depth: 15 }
 * )
 * console.log(result.cp)       // Centipawn evaluation
 * console.log(result.bestMove) // Best move like "e7e5"
 */

import type StockfishWeb from 'lila-stockfish-web'
import type { StockfishAdapter, StockfishConfig, StockfishEvaluation } from './types'
import { Chess } from 'chessops/chess'
import { parseFen } from 'chessops/fen'
import { makeSquare } from 'chessops/util'
import { SquareSet } from 'chessops/squareSet'
// Types used for documentation/clarity but not directly in this file

/**
 * Result of computing mate information from engine data.
 */
export interface MateInfo {
  isMate: boolean
  mateIn: number | undefined
}

/**
 * Computes mate information from engine evaluation data.
 *
 * Ensures the invariant: if isMate is true, mateIn must be defined.
 * This prevents displaying "Mundefined" when mate_vec has entries
 * for moves other than the best move.
 *
 * @param mateVec - Map of move to mate distance, or undefined if no mates
 * @param bestMove - The best move selected by the engine
 * @returns Object with isMate and mateIn fields
 */
export function computeMateInfo(
  mateVec: Record<string, number> | undefined,
  bestMove: string
): MateInfo {
  const mateIn = mateVec?.[bestMove]
  const isMate = mateIn !== undefined

  return { isMate, mateIn }
}

/**
 * Converts a centipawn evaluation from side-to-move's perspective to White's perspective.
 *
 * UCI Stockfish outputs scores from the side-to-move's perspective:
 * - Positive = good for the player whose turn it is
 * - Negative = bad for the player whose turn it is
 *
 * Standard chess UI convention is White's perspective:
 * - Positive = White is better
 * - Negative = Black is better
 *
 * @param cp - Centipawn value from UCI (side-to-move's perspective)
 * @param fen - FEN string to determine whose turn it is
 * @returns Centipawn value from White's perspective
 */
export function convertToWhitePerspective(cp: number, fen: string): number {
  // Handle zero explicitly to avoid -0 quirk
  if (cp === 0) return 0

  const isBlackTurn = fen.split(' ')[1] === 'b'
  return isBlackTurn ? -cp : cp
}

/**
 * Checks if SharedArrayBuffer is actually functional in the current environment.
 *
 * SharedArrayBuffer is required for Stockfish multi-threading. It's only
 * available when proper CORS headers are set:
 * - Cross-Origin-Opener-Policy: same-origin
 * - Cross-Origin-Embedder-Policy: require-corp
 *
 * Note: We actually try to CREATE a SharedArrayBuffer, not just check if it's
 * defined. This catches the case where SharedArrayBuffer exists but is "neutered"
 * (non-functional) due to missing CORS headers.
 *
 * @returns true if SharedArrayBuffer is functional, false otherwise
 */
export function checkSharedArrayBufferSupport(): boolean {
  if (typeof SharedArrayBuffer === 'undefined') {
    return false
  }

  // Try to actually create a SharedArrayBuffer - it may be defined but neutered
  try {
    new SharedArrayBuffer(1)
    return true
  } catch {
    return false
  }
}

/**
 * Creates shared WebAssembly memory for Stockfish multi-threading.
 *
 * @param minPages - Minimum number of 64KB pages to allocate
 * @returns WebAssembly.Memory instance with shared buffer
 * @throws Error if SharedArrayBuffer is unavailable (missing CORS headers)
 * @throws Error if memory allocation fails
 */
export function createSharedMemory(minPages: number): WebAssembly.Memory {
  if (!checkSharedArrayBufferSupport()) {
    throw new Error(
      'SharedArrayBuffer is not available. This requires Cross-Origin headers (CORS). ' +
      'Ensure your server sends: Cross-Origin-Opener-Policy: same-origin and ' +
      'Cross-Origin-Embedder-Policy: require-corp'
    )
  }

  return new WebAssembly.Memory({
    shared: true,
    initial: minPages,
    maximum: 32767,
  })
}

/**
 * Creates shared WebAssembly memory for Stockfish.
 *
 * Stockfish uses multi-threading for parallel search, which requires
 * SharedArrayBuffer. This function tries to allocate the requested
 * amount of memory, falling back to smaller amounts if necessary.
 *
 * Memory is specified in 64KB "pages":
 * - 2560 pages = 160MB (good for strong analysis)
 * - Lower values use less memory but may be slower
 *
 * @param lo - Minimum pages to allocate
 * @param hi - Maximum pages to try (default: 32767 = ~2GB)
 * @returns WebAssembly.Memory instance with shared buffer
 */
function sharedWasmMemory(lo: number, hi = 32767): WebAssembly.Memory {
  let shrink = 4 // Shrink factor for retry attempts

  // Keep trying with smaller maximum until we succeed
  while (true) {
    try {
      // Try to create shared memory with current maximum
      return new WebAssembly.Memory({
        shared: true,   // Required for multi-threading
        initial: lo,    // Minimum pages to allocate
        maximum: hi,    // Maximum pages allowed
      })
    } catch (e) {
      // If we can't allocate, try with smaller maximum
      if (hi <= lo || !(e instanceof RangeError)) throw e

      // Reduce maximum and try again
      hi = Math.max(lo, Math.ceil(hi - hi / shrink))
      // Alternate between shrinking by 1/4 and 1/3
      shrink = shrink === 4 ? 3 : 4
    }
  }
}

/**
 * Loads and initializes the Stockfish WASM module.
 *
 * This involves:
 * 1. Dynamically importing the JS wrapper
 * 2. Creating shared memory for threading
 * 3. Loading the WASM binary
 * 4. Downloading and loading NNUE neural network files
 *
 * The NNUE files are essential for modern Stockfish evaluation accuracy.
 * Without them, evaluation quality drops significantly.
 *
 * @returns Promise resolving to initialized Stockfish instance
 */
async function setupStockfish(): Promise<StockfishWeb> {
  return new Promise<StockfishWeb>((resolve, reject) => {
    // Check SharedArrayBuffer support before attempting WASM initialization
    if (!checkSharedArrayBufferSupport()) {
      reject(new Error(
        'SharedArrayBuffer is not available. This requires Cross-Origin headers (CORS). ' +
        'Ensure your server sends: Cross-Origin-Opener-Policy: same-origin and ' +
        'Cross-Origin-Embedder-Policy: require-corp'
      ))
      return
    }

    // Dynamically import the Stockfish module
    // Using dynamic import because it's a heavy WASM file
    import('lila-stockfish-web/sf171-79.js')
      .then((makeModule) => {
        // Initialize the WASM module with configuration
        makeModule
          .default({
            // Allocate shared memory for multi-threading
            // 2560 pages ≈ 160MB, good balance of memory vs performance
            wasmMemory: sharedWasmMemory(2560),

            // Handle initialization errors
            onError: (msg: string) => reject(new Error(msg)),

            // Tell the module where to find its files
            // Looks in /public/stockfish/ for .wasm and .nnue files
            locateFile: (name: string) => `/stockfish/${name}`,
          })
          .then(async (instance: StockfishWeb) => {
            // Load NNUE (neural network) evaluation files
            // Stockfish 17 uses two NNUE files for different position types

            // Fetch both NNUE files in parallel for faster loading
            Promise.all([
              fetch(`/stockfish/${instance.getRecommendedNnue(0)}`),
              fetch(`/stockfish/${instance.getRecommendedNnue(1)}`),
            ])
              .then((responses) => {
                // Surface HTTP errors so callers don't silently wedge on
                // an HTML 404 page being decoded as an NNUE buffer.
                for (const r of responses) {
                  if (!r.ok) {
                    throw new Error(
                      `NNUE fetch failed: ${r.status} ${r.statusText} (${r.url})`,
                    )
                  }
                }
                return Promise.all([
                  responses[0].arrayBuffer(),
                  responses[1].arrayBuffer(),
                ])
              })
              .then((buffers) => {
                // Load NNUE data into the engine
                instance.setNnueBuffer(new Uint8Array(buffers[0]), 0)
                instance.setNnueBuffer(new Uint8Array(buffers[1]), 1)

                // Now Stockfish is fully ready
                resolve(instance)
              })
              .catch((error) => {
                console.error('Failed to load NNUE models:', error)
                reject(error)
              })
          })
          .catch(reject)
      })
      .catch((error) => {
        // Without this, a dynamic-import failure (network / 404 / parse)
        // left setupStockfish() hanging forever.
        reject(error)
      })
  })
}

/**
 * Real Stockfish engine implementation using WebAssembly.
 *
 * This class implements the StockfishAdapter interface, providing:
 * - Initialization with WASM and NNUE loading
 * - Position evaluation with configurable depth
 * - Per-move evaluations using MultiPV mode
 * - Proper perspective handling (White vs Black)
 *
 * @example
 * const sf = new RealStockfish()
 * await sf.init()  // Downloads and loads ~75MB of files
 *
 * const eval = await sf.evaluate(fen, { depth: 18 })
 * console.log(`Best move: ${eval.bestMove}`)
 * console.log(`Evaluation: ${eval.cp} centipawns`)
 *
 * sf.destroy()  // Clean up when done
 */
export class RealStockfish implements StockfishAdapter {
  // The actual Stockfish WASM instance
  private stockfish: StockfishWeb | null = null

  // Track engine state
  private ready = false
  private nnueLoaded = false
  private isEvaluating = false

  // For managing evaluation results
  private currentFen = ''
  private legalMoveCount = 0
  private legalMoves: string[] = []
  private targetDepth = 18  // Target search depth

  // Promise resolution for evaluation results
  private evaluationResolver: ((_value: StockfishEvaluation) => void) | null = null
  private evaluationRejecter: ((_reason?: unknown) => void) | null = null

  // Track the timer + a monotonic token per evaluate() call so that a
  // late-firing timeout from a previous evaluation cannot cancel a later one.
  private evalTimer: ReturnType<typeof setTimeout> | null = null
  private evalToken = 0

  // Store evaluations as they come in (keyed by depth)
  private store: Record<number, EvaluationData> = {}

  /**
   * Checks if the engine is ready to receive commands.
   *
   * @returns true if initialized and ready
   */
  isReady(): boolean {
    return this.ready && this.stockfish !== null && this.nnueLoaded
  }

  /**
   * Initializes the Stockfish engine.
   *
   * This downloads and loads:
   * - WASM binary (~470KB)
   * - NNUE file 1 (~71MB)
   * - NNUE file 2 (~3.5MB)
   *
   * Total: ~75MB on first load (subsequent loads use browser cache)
   *
   * @throws Error if initialization fails
   */
  async init(): Promise<void> {
    try {
      // Load the Stockfish WASM module with NNUE
      this.stockfish = await setupStockfish()

      // Configure the engine using UCI commands
      this.stockfish.uci('uci')       // Initialize UCI mode
      this.stockfish.uci('isready')   // Wait for engine ready

      // Set MultiPV to analyze many moves at once (not just the best)
      // 100 is high enough to get all legal moves in most positions
      this.stockfish.uci('setoption name MultiPV value 100')

      // Enable native WDL (Win/Draw/Loss) output instead of calculating from cp
      this.stockfish.uci('setoption name UCI_ShowWDL value true')

      // Set up message handlers
      this.stockfish.onError = this.onError.bind(this)
      this.stockfish.listen = this.onMessage.bind(this)

      this.ready = true
      this.nnueLoaded = true

      console.log('Stockfish initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error)
      this.ready = false
      throw error
    }
  }

  /**
   * Evaluates a chess position.
   *
   * Sends the position to Stockfish and waits for analysis to complete.
   * Returns the best move and evaluation, plus evaluations for all legal moves.
   *
   * @param fen - Position in FEN notation
   * @param config - Analysis configuration (depth, etc.)
   * @returns Evaluation results including best move and centipawn score
   *
   * @example
   * const result = await stockfish.evaluate(
   *   'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
   *   { depth: 18 }
   * )
   * console.log(result.bestMove)  // "e7e5"
   * console.log(result.cp)        // Centipawns from side to move's perspective
   */
  async evaluate(
    fen: string,
    config?: Partial<StockfishConfig>,
  ): Promise<StockfishEvaluation> {
    // Check if engine is ready
    if (!this.stockfish || !this.ready) {
      throw new Error('Stockfish not initialized. Call init() first.')
    }

    // Stop any previous evaluation
    this.stop()

    // Reset state for new evaluation
    this.store = {}
    this.currentFen = fen

    // Calculate legal moves using chessops
    const setup = parseFen(fen)
    if (setup.isErr) {
      throw new Error(`Invalid FEN: ${fen}`)
    }

    const chess = Chess.fromSetup(setup.value)
    if (chess.isErr) {
      throw new Error(`Invalid position: ${chess.error}`)
    }

    // Get all legal moves in UCI format
    const pos = chess.value
    this.legalMoves = []

    // Iterate over all legal moves using allDests()
    // allDests() returns Map<Square, SquareSet> where:
    // - Square is the source square (0-63)
    // - SquareSet contains all legal destination squares
    const ctx = pos.ctx()
    for (const [from, dests] of pos.allDests(ctx)) {
      // Get the piece on this square to check for promotions
      const piece = pos.board.get(from)
      const isPawn = piece?.role === 'pawn'

      // Check if this is a promotion rank (7th rank for White, 2nd for Black)
      const promotionRanks = pos.turn === 'white'
        ? SquareSet.fromRank(6)  // 7th rank (index 6)
        : SquareSet.fromRank(1)  // 2nd rank (index 1)
      // eslint-disable-next-line no-unused-vars
      const _isPromotionSource = isPawn && promotionRanks.has(from)

      // Iterate over all destination squares
      for (const to of dests) {
        // Build UCI string
        const fromStr = makeSquare(from)
        const toStr = makeSquare(to)

        // Check if this move would be a promotion
        const backrank = pos.turn === 'white'
          ? SquareSet.fromRank(7)  // 8th rank
          : SquareSet.fromRank(0)  // 1st rank
        const isPromotion = isPawn && backrank.has(to)

        if (isPromotion) {
          // Add all promotion variants (queen, rook, bishop, knight)
          this.legalMoves.push(`${fromStr}${toStr}q`)
          this.legalMoves.push(`${fromStr}${toStr}r`)
          this.legalMoves.push(`${fromStr}${toStr}b`)
          this.legalMoves.push(`${fromStr}${toStr}n`)
        } else {
          this.legalMoves.push(`${fromStr}${toStr}`)
        }
      }
    }

    this.legalMoveCount = this.legalMoves.length

    // Handle checkmate or stalemate
    if (this.legalMoveCount === 0) {
      const inCheck = pos.isCheck()
      return {
        depth: 0,
        bestMove: '',
        cp: inCheck ? -10000 : 0,  // Checkmate = -10000, Stalemate = 0
        winrate: inCheck ? 0 : 0.5,
        isMate: inCheck,
        mateIn: inCheck ? 0 : undefined,
        moveEvaluations: {},
        moveWinrates: {},
      }
    }

    // Set evaluation depth (default: 18)
    this.targetDepth = config?.depth ?? 18

    // Mark as evaluating before issuing commands, since onMessage handlers may
    // fire synchronously during uci() and call resolveEvaluation().
    this.isEvaluating = true

    // Return a promise that resolves when evaluation completes.
    // Install the resolver BEFORE issuing the `go depth` command so that
    // synchronous completion (cached/mate/depth-1) can find the resolver.
    return new Promise<StockfishEvaluation>((resolve, reject) => {
      this.evaluationResolver = resolve
      this.evaluationRejecter = reject

      // Track this evaluation's timeout so we can clear it on resolution.
      // Capture local references so a later evaluation's timer can't cancel
      // an in-flight one.
      const evalToken = ++this.evalToken
      const timeout = config?.timeLimit ?? 30000  // Default 30 seconds
      const timer = setTimeout(() => {
        // Only act if this timer's evaluation is still the active one.
        if (this.isEvaluating && this.evalToken === evalToken) {
          this.stop()
          const bestDepth = Math.max(...Object.keys(this.store).map(Number))
          if (bestDepth > 0 && this.store[bestDepth]) {
            this.resolveEvaluation(bestDepth)
          } else {
            reject(new Error('Evaluation timeout'))
          }
        }
      }, timeout)
      this.evalTimer = timer

      try {
        this.stockfish!.uci('ucinewgame')
        this.stockfish!.uci(`position fen ${fen}`)
        this.stockfish!.uci(`go depth ${this.targetDepth}`)
      } catch (err) {
        clearTimeout(timer)
        this.isEvaluating = false
        this.evaluationResolver = null
        this.evaluationRejecter = null
        reject(err)
      }
    })
  }

  /**
   * Stops any ongoing analysis.
   *
   * Sends the "stop" command to Stockfish and resets evaluation state.
   * Also rejects any pending Promise to prevent orphaned Promises from hanging.
   */
  stop(): void {
    if (this.stockfish && this.isEvaluating) {
      this.isEvaluating = false
      this.stockfish.uci('stop')

      if (this.evalTimer) {
        clearTimeout(this.evalTimer)
        this.evalTimer = null
      }

      // Reject pending Promise to prevent hanging
      // This is critical for preventing race conditions when
      // multiple evaluate() calls are made rapidly
      if (this.evaluationRejecter) {
        const rejecter = this.evaluationRejecter
        this.evaluationResolver = null
        this.evaluationRejecter = null
        rejecter(new Error('Evaluation cancelled by new request'))
      }
    }
  }

  /**
   * Cleans up resources.
   *
   * Call when done using the engine to free memory.
   */
  destroy(): void {
    this.stop()
    // Note: lila-stockfish-web doesn't have an explicit destroy method
    // The WASM memory will be garbage collected when all references are gone
    this.stockfish = null
    this.ready = false
    this.nnueLoaded = false
  }

  /**
   * Handles UCI messages from Stockfish.
   *
   * Stockfish outputs analysis in UCI format like:
   * "info depth 15 multipv 1 score cp 35 pv e2e4 e7e5 g1f3"
   *
   * We parse this to extract:
   * - depth: How deep the search went
   * - multipv: Which line this is (1 = best, 2 = second best, etc.)
   * - score cp: Centipawn evaluation (or "mate N" for mate in N)
   * - pv: Principal variation (best line of play)
   *
   * @param msg - UCI message from engine
   */
  private onMessage(msg: string): void {
    // Only process messages while evaluating
    if (!this.isEvaluating) return

    // Parse UCI info lines with regex
    // Format: info depth N seldepth N multipv N score cp N|mate N wdl W D L ... pv MOVES
    const matches = [
      ...msg.matchAll(
        /info depth (\d+) seldepth (\d+) multipv (\d+) score (?:cp (-?\d+)|mate (-?\d+)) wdl (\d+) (\d+) (\d+).+ pv ((?:\S+\s*)+)/g,
      ),
    ][0]

    if (!matches || !matches.length) return

    // Extract values from regex groups
    const depth = parseInt(matches[1], 10)
    const multipv = parseInt(matches[3], 10)
    let cp = parseInt(matches[4], 10)
    const mate = parseInt(matches[5], 10)
    const wdlWin = parseInt(matches[6], 10)   // Win permille (out of 1000)
    const wdlDraw = parseInt(matches[7], 10)  // Draw permille
    const wdlLoss = parseInt(matches[8], 10)  // Loss permille
    const pv = matches[9]
    const move = pv.split(' ')[0]  // First move of the principal variation

    // Skip if not a legal move (shouldn't happen, but be safe)
    if (!this.legalMoves.includes(move)) return

    // Handle mate scores
    // Convert mate-in-N to a large centipawn value
    let mateIn: number | undefined = undefined
    if (!isNaN(mate) && isNaN(cp)) {
      mateIn = mate
      // Use 10000 as "infinity" for mate scores
      cp = mate > 0 ? 10000 : -10000
    }

    // Convert cp from side-to-move's perspective to White's perspective
    // UCI Stockfish reports scores from the SIDE-TO-MOVE's perspective,
    // but our interface expects White's perspective (positive = White better).
    cp = convertToWhitePerspective(cp, this.currentFen)

    // Calculate winrate from native WDL (Win/Draw/Loss permille)
    // WDL is also from side-to-move's perspective per UCI spec
    // Formula: (win + draw/2) / 1000 treats draws as half-wins
    const winrate = (wdlWin + wdlDraw / 2) / 1000

    // Convert WDL permille to percentages (already from side-to-move's view)
    const wdl = { win: wdlWin / 10, draw: wdlDraw / 10, loss: wdlLoss / 10 }

    // Store or update evaluation data for this depth
    if (this.store[depth]) {
      // Add this move to existing depth data
      this.store[depth].cp_vec[move] = cp

      if (mateIn !== undefined) {
        if (!this.store[depth].mate_vec) {
          this.store[depth].mate_vec = {}
        }
        this.store[depth].mate_vec[move] = mateIn
      }

      if (!this.store[depth].winrate_vec) {
        this.store[depth].winrate_vec = {}
      }
      this.store[depth].winrate_vec[move] = winrate

      if (!this.store[depth].wdl_vec) {
        this.store[depth].wdl_vec = {}
      }
      this.store[depth].wdl_vec[move] = wdl
    } else {
      // First move at this depth - create new entry
      this.store[depth] = {
        depth,
        model_move: move,
        model_optimal_cp: cp,
        cp_vec: { [move]: cp },
        winrate_vec: { [move]: winrate },
        wdl_vec: { [move]: wdl },
        mate_vec: mateIn !== undefined ? { [move]: mateIn } : undefined,
        sent: false,
      }
    }

    // Check if we have evaluations for all legal moves at target depth
    // MultiPV reports move N when it has evaluated N moves
    // Only resolve when we've reached the requested depth (not earlier depths)
    if (
      depth >= this.targetDepth &&
      multipv === this.legalMoveCount &&
      !this.store[depth].sent
    ) {
      this.store[depth].sent = true
      this.resolveEvaluation(depth)
    }
  }

  /**
   * Resolves the evaluation promise with results from a given depth.
   *
   * @param depth - The depth to use for results
   */
  private resolveEvaluation(depth: number): void {
    if (!this.evaluationResolver || !this.store[depth]) return

    const data = this.store[depth]

    // Find the best move (highest winrate for side to move)
    let bestMove = data.model_move
    let bestWinrate = -Infinity

    const winrateVec = data.winrate_vec || {}
    for (const move in winrateVec) {
      if (winrateVec[move] > bestWinrate) {
        bestWinrate = winrateVec[move]
        bestMove = move
      }
    }

    // Check for checkmate - only true if bestMove leads to mate
    const { isMate, mateIn } = computeMateInfo(data.mate_vec, bestMove)

    // Get centipawn for best move
    const cp = data.cp_vec[bestMove] ?? data.model_optimal_cp

    // Get WDL for best move
    const wdl = data.wdl_vec?.[bestMove]

    // Build the evaluation result
    const result: StockfishEvaluation = {
      depth,
      bestMove,
      cp,
      winrate: bestWinrate,
      wdl,
      isMate,
      mateIn,
      moveEvaluations: { ...data.cp_vec },
      moveWinrates: { ...winrateVec },
    }

    // Stop evaluation and resolve promise
    this.isEvaluating = false
    if (this.evalTimer) {
      clearTimeout(this.evalTimer)
      this.evalTimer = null
    }
    const resolver = this.evaluationResolver
    this.evaluationResolver = null
    this.evaluationRejecter = null
    resolver(result)
  }

  /**
   * Handles error messages from Stockfish.
   *
   * @param msg - Error message
   */
  private onError(msg: string): void {
    console.error('Stockfish error:', msg)

    if (this.evaluationRejecter) {
      this.evaluationRejecter(new Error(msg))
      this.evaluationResolver = null
      this.evaluationRejecter = null
    }

    this.isEvaluating = false
  }
}

/**
 * Internal type for storing evaluation data during analysis.
 * Not exported - only used within this module.
 */
interface EvaluationData {
  depth: number
  model_move: string
  model_optimal_cp: number
  cp_vec: Record<string, number>
  winrate_vec?: Record<string, number>
  wdl_vec?: Record<string, { win: number; draw: number; loss: number }>
  mate_vec?: Record<string, number>
  sent: boolean
}

/**
 * Factory function to create a Stockfish instance.
 *
 * @returns A new RealStockfish instance (not yet initialized)
 *
 * @example
 * const stockfish = createStockfish()
 * await stockfish.init()  // Must call init before use
 */
export function createStockfish(): StockfishAdapter {
  return new RealStockfish()
}
