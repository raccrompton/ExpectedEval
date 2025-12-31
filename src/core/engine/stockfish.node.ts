/**
 * Stockfish Chess Engine - Node.js Implementation
 *
 * This file provides a Node.js-compatible version of the Stockfish engine.
 * It spawns the stockfish binary as a child process and communicates via
 * UCI (Universal Chess Interface) protocol through stdin/stdout.
 *
 * This allows running and testing Stockfish outside of a browser, which is
 * useful for:
 * - Automated testing without browser/WASM setup
 * - Command-line tools and scripts
 * - CI/CD pipelines
 * - Debugging engine integration
 *
 * Requirements:
 * - Stockfish binary installed on the system
 * - Install via: brew install stockfish (macOS)
 *              : apt install stockfish (Linux)
 *              : winget install stockfish (Windows)
 *
 * The API is identical to the browser version (implements StockfishAdapter),
 * so code using the adapter interface works with either implementation.
 *
 * @example
 * // In a Node.js script or test:
 * import { NodeStockfish } from './stockfish.node'
 *
 * const sf = new NodeStockfish()  // Uses 'stockfish' from PATH
 * await sf.init()
 *
 * const result = await sf.evaluate(fen, { depth: 15 })
 * console.log(result.bestMove)  // "e2e4"
 * console.log(result.cp)        // Centipawn evaluation
 */

import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import * as readline from 'readline'

// Import shared types
import type {
  StockfishAdapter,
  StockfishConfig,
  StockfishEvaluation,
} from './types'
import { cpToWinrate } from './types'
import { computeMateInfo } from './stockfish'

// Import chessops for legal move calculation
import { Chess } from 'chessops/chess'
import { parseFen } from 'chessops/fen'
import { makeSquare } from 'chessops/util'
import { SquareSet } from 'chessops/squareSet'

/**
 * Node.js implementation of the Stockfish adapter.
 *
 * Spawns stockfish as a child process and communicates via UCI protocol.
 * This is simpler and more reliable than WASM in Node.js environments.
 *
 * UCI Protocol basics:
 * - Send "uci" to initialize
 * - Send "isready" and wait for "readyok"
 * - Send "position fen <fen>" to set position
 * - Send "go depth <n>" to start analysis
 * - Receive "info depth N ... score cp X pv MOVES"
 * - Receive "bestmove <move>" when analysis completes
 */
export class NodeStockfish implements StockfishAdapter {
  // Path to stockfish binary
  private stockfishPath: string

  // Child process reference
  private process: ChildProcessWithoutNullStreams | null = null

  // Readline interface for parsing output
  private rl: readline.Interface | null = null

  // Track engine state
  private ready = false
  private isEvaluating = false

  // Current evaluation context
  private currentFen = ''
  private legalMoves: string[] = []
  private targetDepth = 0

  // Store evaluations as they come in (keyed by depth)
  private store: Record<number, EvaluationData> = {}

  // Promise resolution for evaluation results
  private evaluationResolver: ((_value: StockfishEvaluation) => void) | null =
    null
  private evaluationRejecter: ((_reason?: unknown) => void) | null = null

  /**
   * Creates a new Node.js Stockfish instance.
   *
   * @param stockfishPath - Path to stockfish binary (default: 'stockfish')
   *                        If just 'stockfish', it must be in PATH
   *
   * @example
   * // Use system stockfish from PATH
   * const sf = new NodeStockfish()
   *
   * // Use specific binary path
   * const sf = new NodeStockfish('/usr/local/bin/stockfish')
   */
  constructor(stockfishPath: string = 'stockfish') {
    this.stockfishPath = stockfishPath
  }

  /**
   * Checks if the engine is ready to receive commands.
   *
   * @returns true if initialized and ready
   */
  isReady(): boolean {
    return this.ready && this.process !== null
  }

  /**
   * Initializes the Stockfish engine.
   *
   * Spawns the stockfish process and configures it via UCI commands.
   *
   * @throws Error if stockfish binary not found or initialization fails
   *
   * @example
   * const sf = new NodeStockfish()
   * await sf.init()  // Spawns stockfish process
   */
  async init(): Promise<void> {
    if (this.ready) return

    return new Promise<void>((resolve, reject) => {
      try {
        // Spawn stockfish process
        console.log(`[NodeStockfish] Spawning: ${this.stockfishPath}`)
        this.process = spawn(this.stockfishPath, [], {
          stdio: ['pipe', 'pipe', 'pipe'],
        })

        // Handle process errors (e.g., binary not found)
        this.process.on('error', (err) => {
          const message = err.message.includes('ENOENT')
            ? `Stockfish binary not found at '${this.stockfishPath}'. ` +
              'Install with: brew install stockfish (macOS) or apt install stockfish (Linux)'
            : `Failed to start Stockfish: ${err.message}`
          reject(new Error(message))
        })

        // Handle process exit
        this.process.on('exit', (code) => {
          if (!this.ready) {
            reject(new Error(`Stockfish exited with code ${code}`))
          }
          this.ready = false
          this.process = null
        })

        // Set up readline interface for parsing output line-by-line
        this.rl = readline.createInterface({
          input: this.process.stdout,
          crlfDelay: Infinity,
        })

        // Track initialization state
        let uciOk = false
        // eslint-disable-next-line no-unused-vars
        let _readyOk = false

        // Process each line of output
        this.rl.on('line', (line) => {
          // During initialization, wait for uciok and readyok
          if (!this.ready) {
            if (line === 'uciok') {
              uciOk = true
              // Configure engine and check if ready
              this.sendCommand('setoption name MultiPV value 100')
              this.sendCommand('isready')
            } else if (line === 'readyok' && uciOk) {
              _readyOk = true
              this.ready = true
              console.log('[NodeStockfish] Engine ready')
              resolve()
            }
            return
          }

          // During evaluation, process info and bestmove lines
          if (this.isEvaluating) {
            this.processLine(line)
          }
        })

        // Log stderr for debugging
        this.process.stderr.on('data', (data) => {
          console.error('[NodeStockfish stderr]', data.toString())
        })

        // Send initial UCI command to start handshake
        this.sendCommand('uci')

        // Timeout for initialization
        setTimeout(() => {
          if (!this.ready) {
            reject(new Error('Stockfish initialization timed out'))
          }
        }, 10000)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Sends a UCI command to the stockfish process.
   *
   * @param command - UCI command string (e.g., "go depth 15")
   */
  private sendCommand(command: string): void {
    if (this.process && this.process.stdin.writable) {
      this.process.stdin.write(command + '\n')
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
   * const result = await sf.evaluate(
   *   'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
   *   { depth: 15 }
   * )
   * console.log(result.bestMove)  // "e7e5"
   * console.log(result.cp)        // Centipawns from side to move's perspective
   */
  async evaluate(
    fen: string,
    config?: Partial<StockfishConfig>,
  ): Promise<StockfishEvaluation> {
    if (!this.process || !this.ready) {
      throw new Error('Stockfish not initialized. Call init() first.')
    }

    // Stop any previous evaluation
    this.stop()

    // Reset state for new evaluation
    this.store = {}
    this.currentFen = fen
    this.targetDepth = config?.depth ?? 15

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

    const ctx = pos.ctx()
    for (const [from, dests] of pos.allDests(ctx)) {
      const piece = pos.board.get(from)
      const isPawn = piece?.role === 'pawn'

      for (const to of dests) {
        const fromStr = makeSquare(from)
        const toStr = makeSquare(to)

        // Check if this move would be a promotion
        const backrank =
          pos.turn === 'white'
            ? SquareSet.fromRank(7)
            : SquareSet.fromRank(0)
        const isPromotion = isPawn && backrank.has(to)

        if (isPromotion) {
          this.legalMoves.push(`${fromStr}${toStr}q`)
          this.legalMoves.push(`${fromStr}${toStr}r`)
          this.legalMoves.push(`${fromStr}${toStr}b`)
          this.legalMoves.push(`${fromStr}${toStr}n`)
        } else {
          this.legalMoves.push(`${fromStr}${toStr}`)
        }
      }
    }

    // Handle checkmate or stalemate
    if (this.legalMoves.length === 0) {
      const inCheck = pos.isCheck()
      return {
        depth: 0,
        bestMove: '',
        cp: inCheck ? -10000 : 0,
        winrate: inCheck ? 0 : 0.5,
        isMate: inCheck,
        mateIn: inCheck ? 0 : undefined,
        moveEvaluations: {},
        moveWinrates: {},
      }
    }

    // Start evaluation
    this.isEvaluating = true
    this.sendCommand('ucinewgame')
    this.sendCommand(`position fen ${fen}`)
    this.sendCommand(`go depth ${this.targetDepth}`)

    return new Promise<StockfishEvaluation>((resolve, reject) => {
      this.evaluationResolver = resolve
      this.evaluationRejecter = reject

      // Timeout to prevent hanging
      const timeout = config?.timeLimit ?? 60000 // 60 seconds default
      setTimeout(() => {
        if (this.isEvaluating) {
          this.stop()
          // Return whatever we have so far
          const depths = Object.keys(this.store).map(Number)
          if (depths.length > 0) {
            const bestDepth = Math.max(...depths)
            this.resolveEvaluation(bestDepth)
          } else {
            reject(new Error('Evaluation timeout with no results'))
          }
        }
      }, timeout)
    })
  }

  /**
   * Processes a line of output from Stockfish.
   *
   * Parses UCI info lines to extract move evaluations.
   *
   * @param line - A line of output from stockfish
   */
  private processLine(line: string): void {
    // Check for bestmove (evaluation complete)
    if (line.startsWith('bestmove')) {
      // Evaluation is complete - resolve with best depth we have
      const depths = Object.keys(this.store).map(Number)
      if (depths.length > 0) {
        const bestDepth = Math.max(...depths)
        this.resolveEvaluation(bestDepth)
      }
      return
    }

    // Parse UCI info lines
    // Format: info depth N seldepth N multipv N score cp N|mate N pv MOVES
    const infoMatch = line.match(
      /info depth (\d+) seldepth \d+ multipv (\d+) score (cp (-?\d+)|mate (-?\d+)).* pv (.+)/,
    )

    if (!infoMatch) return

    const depth = parseInt(infoMatch[1], 10)
    const multipv = parseInt(infoMatch[2], 10)
    let cp = parseInt(infoMatch[4], 10)
    const mate = parseInt(infoMatch[5], 10)
    const pv = infoMatch[6]
    const move = pv.split(' ')[0]

    // Skip if not a legal move (shouldn't happen)
    if (!this.legalMoves.includes(move)) return

    // Handle mate scores
    let mateIn: number | undefined = undefined
    if (!isNaN(mate) && isNaN(cp)) {
      mateIn = mate
      cp = mate > 0 ? 10000 : -10000
    }

    // Convert cp from side-to-move's perspective to White's perspective
    // UCI Stockfish reports scores from the SIDE-TO-MOVE's perspective,
    // but our interface expects White's perspective (positive = White better).
    const isBlackTurn = this.currentFen.split(' ')[1] === 'b'
    if (isBlackTurn) {
      cp *= -1
    }

    // Store evaluation data
    if (this.store[depth]) {
      this.store[depth].cp_vec[move] = cp
      if (mateIn !== undefined) {
        if (!this.store[depth].mate_vec) {
          this.store[depth].mate_vec = {}
        }
        this.store[depth].mate_vec[move] = mateIn
      }
      const winrate = cpToWinrate(cp * (isBlackTurn ? -1 : 1))
      if (!this.store[depth].winrate_vec) {
        this.store[depth].winrate_vec = {}
      }
      this.store[depth].winrate_vec[move] = winrate
    } else {
      const winrate = cpToWinrate(cp * (isBlackTurn ? -1 : 1))
      this.store[depth] = {
        depth,
        model_move: move,
        model_optimal_cp: cp,
        cp_vec: { [move]: cp },
        winrate_vec: { [move]: winrate },
        mate_vec: mateIn !== undefined ? { [move]: mateIn } : undefined,
        sent: false,
      }
    }

    // Check if we have all legal moves at target depth
    if (
      depth >= this.targetDepth &&
      multipv === this.legalMoves.length &&
      !this.store[depth].sent
    ) {
      this.store[depth].sent = true
      // Don't resolve yet - wait for bestmove to ensure analysis is complete
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

    // Build the evaluation result
    const result: StockfishEvaluation = {
      depth,
      bestMove,
      cp,
      winrate: bestWinrate,
      isMate,
      mateIn,
      moveEvaluations: { ...data.cp_vec },
      moveWinrates: { ...winrateVec },
    }

    // Stop evaluation and resolve promise
    this.isEvaluating = false
    this.evaluationResolver(result)
    this.evaluationResolver = null
    this.evaluationRejecter = null
  }

  /**
   * Stops any ongoing analysis.
   */
  stop(): void {
    if (this.process && this.isEvaluating) {
      this.isEvaluating = false
      this.sendCommand('stop')
    }
  }

  /**
   * Cleans up resources.
   *
   * Terminates the stockfish process.
   */
  destroy(): void {
    this.stop()
    if (this.process) {
      this.sendCommand('quit')
      this.process.kill()
      this.process = null
    }
    if (this.rl) {
      this.rl.close()
      this.rl = null
    }
    this.ready = false
  }
}

/**
 * Internal type for storing evaluation data during analysis.
 */
interface EvaluationData {
  depth: number
  model_move: string
  model_optimal_cp: number
  cp_vec: Record<string, number>
  winrate_vec?: Record<string, number>
  mate_vec?: Record<string, number>
  sent: boolean
}

/**
 * Factory function to create a Node.js Stockfish instance.
 *
 * @param stockfishPath - Optional path to stockfish binary
 * @returns A new NodeStockfish instance (not yet initialized)
 *
 * @example
 * const sf = createNodeStockfish()
 * await sf.init()
 * const result = await sf.evaluate(fen, { depth: 15 })
 */
export function createNodeStockfish(stockfishPath?: string): StockfishAdapter {
  return new NodeStockfish(stockfishPath)
}
