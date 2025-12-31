/**
 * Maia Neural Network Engine - Node.js Implementation
 *
 * This file provides a Node.js-compatible version of the Maia engine.
 * It uses onnxruntime-node instead of onnxruntime-web, and reads the
 * model from the filesystem instead of fetching it from a URL.
 *
 * This allows running and testing the Maia engine outside of a browser,
 * which is useful for:
 * - Automated testing without browser setup
 * - Command-line tools and scripts
 * - CI/CD pipelines
 * - Debugging engine integration
 *
 * The API is identical to the browser version (implements MaiaAdapter),
 * so code using the adapter interface works with either implementation.
 *
 * @example
 * // In a Node.js script or test:
 * import { NodeMaia } from './maia.node'
 *
 * const maia = new NodeMaia('./public/maia2/maia_rapid.onnx')
 * await maia.init()
 *
 * const result = await maia.predict(fen, { eloLevel: 1500 })
 * console.log(result.policy)  // Move probabilities
 * console.log(result.value)   // Win probability
 */

// Use Node.js ONNX runtime (same API as web version)
import { InferenceSession, Tensor } from 'onnxruntime-node'
import * as fs from 'fs'
import * as path from 'path'

// Import shared types and tensor preprocessing
// These are pure TypeScript with no browser dependencies
import type { MaiaAdapter, MaiaConfig, MaiaEvaluation } from './types'
import { preprocess, mirrorMove, allPossibleMovesReversed } from './tensor'

// Import chessops for legal move generation (works in Node.js)
import { Chess } from 'chessops/chess'
import { parseFen } from 'chessops/fen'
import { makeSquare } from 'chessops/util'
import { SquareSet } from 'chessops/squareSet'

/**
 * Node.js implementation of the Maia adapter.
 *
 * Differences from browser version:
 * - Reads model from filesystem instead of fetching from URL
 * - Uses onnxruntime-node instead of onnxruntime-web
 * - No IndexedDB caching (not needed for local files)
 *
 * The tensor preprocessing and output processing are identical
 * to the browser version since they use shared code.
 */
export class NodeMaia implements MaiaAdapter {
  // ONNX inference session (the loaded model)
  private model: InferenceSession | null = null

  // Path to the model file on disk
  private modelPath: string

  // Track initialization state
  private ready = false
  private initializing = false

  /**
   * Creates a new Node.js Maia instance.
   *
   * @param modelPath - Path to the ONNX model file on disk
   *                    Can be absolute or relative to cwd
   *
   * @example
   * // Relative path from project root
   * const maia = new NodeMaia('./public/maia2/maia_rapid.onnx')
   *
   * // Absolute path
   * const maia = new NodeMaia('/path/to/model.onnx')
   */
  constructor(modelPath: string) {
    // Resolve to absolute path if relative
    this.modelPath = path.resolve(modelPath)
  }

  /**
   * Checks if the engine is ready to receive commands.
   *
   * @returns true if model is loaded and ready
   */
  isReady(): boolean {
    return this.ready && this.model !== null
  }

  /**
   * Initializes the Maia engine by loading the ONNX model.
   *
   * In Node.js, this reads directly from the filesystem,
   * which is much faster than downloading over HTTP.
   *
   * @throws Error if model file doesn't exist or can't be loaded
   *
   * @example
   * const maia = new NodeMaia('./public/maia2/maia_rapid.onnx')
   * await maia.init()  // Loads model from disk
   */
  async init(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initializing) {
      // Wait for existing initialization to complete
      while (this.initializing) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      return
    }

    // Already initialized
    if (this.ready) return

    this.initializing = true

    try {
      // Check if model file exists
      if (!fs.existsSync(this.modelPath)) {
        throw new Error(`Maia model not found at: ${this.modelPath}`)
      }

      console.log(`[NodeMaia] Loading model from: ${this.modelPath}`)
      const startTime = Date.now()

      // Read model file from disk
      // Note: InferenceSession.create can take a file path directly,
      // which is more memory-efficient than reading into buffer
      this.model = await InferenceSession.create(this.modelPath)

      const loadTime = Date.now() - startTime
      console.log(`[NodeMaia] Model loaded in ${loadTime}ms`)

      this.ready = true
    } catch (error) {
      console.error('[NodeMaia] Initialization failed:', error)
      this.ready = false
      throw error
    } finally {
      this.initializing = false
    }
  }

  /**
   * Predicts move probabilities for a position.
   *
   * This method is identical to the browser version - only the
   * initialization differs. The tensor preprocessing, inference,
   * and output processing are all the same.
   *
   * @param fen - Position in FEN notation
   * @param config - Configuration (ELO level)
   * @returns Move probabilities and win probability
   *
   * @example
   * const result = await maia.predict(
   *   'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
   *   { eloLevel: 1500 }
   * )
   * console.log(result.policy.e7e5)  // 0.45 (45% chance of e5)
   */
  async predict(
    fen: string,
    config?: Partial<MaiaConfig>,
  ): Promise<MaiaEvaluation> {
    // Ensure model is loaded
    if (!this.model) {
      throw new Error('Maia model not initialized. Call init() first.')
    }

    // Default ELO level (1500 is average club player)
    const eloLevel = config?.eloLevel ?? 1500

    // Get legal moves using chessops (works identically in Node.js)
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
    const legalMoves: string[] = []

    // Iterate over all legal moves using allDests()
    const ctx = pos.ctx()
    for (const [from, dests] of pos.allDests(ctx)) {
      // Get the piece on this square to check for promotions
      const piece = pos.board.get(from)
      const isPawn = piece?.role === 'pawn'

      // Iterate over all destination squares
      for (const to of dests) {
        const fromStr = makeSquare(from)
        const toStr = makeSquare(to)

        // Check if this move would be a promotion
        const backrank =
          pos.turn === 'white'
            ? SquareSet.fromRank(7) // 8th rank
            : SquareSet.fromRank(0) // 1st rank
        const isPromotion = isPawn && backrank.has(to)

        if (isPromotion) {
          // Add all promotion variants
          legalMoves.push(`${fromStr}${toStr}q`)
          legalMoves.push(`${fromStr}${toStr}r`)
          legalMoves.push(`${fromStr}${toStr}b`)
          legalMoves.push(`${fromStr}${toStr}n`)
        } else {
          legalMoves.push(`${fromStr}${toStr}`)
        }
      }
    }

    // Handle positions with no legal moves (checkmate or stalemate)
    if (legalMoves.length === 0) {
      const inCheck = pos.isCheck()
      return {
        policy: {},
        value: inCheck ? 0.0 : 0.5, // Checkmate = loss, Stalemate = draw
        eloLevel,
      }
    }

    // Preprocess the position for the neural network
    // This handles perspective normalization (Black positions are mirrored)
    const { boardInput, eloSelfCategory, eloOppoCategory, legalMovesMask } =
      preprocess(
        fen,
        eloLevel,
        eloLevel, // Use same ELO for opponent (symmetric)
        legalMoves,
      )

    // Prepare input tensors for ONNX runtime
    // Note: Tensor API is identical between onnxruntime-node and onnxruntime-web
    const feeds: Record<string, Tensor> = {
      // Board tensor: [batch_size=1, channels=18, height=8, width=8]
      boards: new Tensor('float32', boardInput, [1, 18, 8, 8]),

      // ELO categories as 64-bit integers (model requirement)
      elo_self: new Tensor(
        'int64',
        BigInt64Array.from([BigInt(eloSelfCategory)]),
      ),
      elo_oppo: new Tensor(
        'int64',
        BigInt64Array.from([BigInt(eloOppoCategory)]),
      ),
    }

    // Run inference
    const result = await this.model.run(feeds)
    const logits_maia = result.logits_maia
    const logits_value = result.logits_value

    // Process outputs into move probabilities
    const { policy, value } = this.processOutputs(
      fen,
      logits_maia,
      logits_value,
      legalMovesMask,
      legalMoves,
    )

    return {
      policy,
      value,
      eloLevel,
    }
  }

  /**
   * Processes model outputs into move probabilities and win probability.
   *
   * This is identical to the browser version - the tensor processing
   * is pure JavaScript with no browser dependencies.
   *
   * @param fen - Original FEN (for perspective checking)
   * @param logits_maia - Policy logits from model
   * @param logits_value - Value logits from model
   * @param legalMovesMask - Binary mask of legal moves
   * @param legalMoves - List of legal moves in UCI format
   * @returns Processed policy and value
   */
  private processOutputs(
    fen: string,
    logits_maia: Tensor,
    logits_value: Tensor,
    legalMovesMask: Float32Array,
    _legalMoves: string[],
  ): { policy: Record<string, number>; value: number } {
    const logits = logits_maia.data as Float32Array
    const value = logits_value.data as Float32Array

    // Convert value from [-1, 1] to [0, 1] range
    // The model outputs value from the SIDE-TO-MOVE's perspective after board mirroring.
    // For Black positions, the board is mirrored so Black appears as White to the model.
    // The raw output is the side-to-move's expected score.
    const rawValue = value[0] as number
    let winProb = Math.min(Math.max(rawValue / 2 + 0.5, 0), 1)

    // Value is from side-to-move's perspective (matches types.ts documentation).
    // Consumers (e.g., treeBuilder.ts) normalize to root player's perspective.
    // NO flip here - that would cause double-inversion bugs.

    // Check if it's Black's turn (needed for move mirroring below)
    const isBlackTurn = fen.split(' ')[1] === 'b'

    // Round to 4 decimal places
    winProb = Math.round(winProb * 10000) / 10000

    // Get indices of legal moves from the mask
    const legalMoveIndices: number[] = []
    for (let i = 0; i < legalMovesMask.length; i++) {
      if (legalMovesMask[i] > 0) {
        legalMoveIndices.push(i)
      }
    }

    // Map legal move indices back to UCI notation
    // If Black's turn, we need to un-mirror the moves
    const legalMovesMirrored: string[] = []
    for (const moveIndex of legalMoveIndices) {
      let move = allPossibleMovesReversed[moveIndex]
      if (isBlackTurn) {
        // Un-mirror the move back to Black's perspective
        move = mirrorMove(move)
      }
      legalMovesMirrored.push(move)
    }

    // Extract logits only for legal moves
    const legalLogits = legalMoveIndices.map((idx) => logits[idx])

    // Apply softmax to convert logits to probabilities
    const maxLogit = Math.max(...legalLogits)
    const expLogits = legalLogits.map((logit) => Math.exp(logit - maxLogit))
    const sumExp = expLogits.reduce((a, b) => a + b, 0)
    const probs = expLogits.map((expLogit) => expLogit / sumExp)

    // Build the policy dictionary mapping moves to probabilities
    const moveProbs: Record<string, number> = {}
    for (let i = 0; i < legalMoveIndices.length; i++) {
      moveProbs[legalMovesMirrored[i]] = probs[i]
    }

    // Sort by probability (highest first) for convenience
    const sortedMoveProbs = Object.keys(moveProbs)
      .sort((a, b) => moveProbs[b] - moveProbs[a])
      .reduce(
        (acc, key) => {
          acc[key] = moveProbs[key]
          return acc
        },
        {} as Record<string, number>,
      )

    return { policy: sortedMoveProbs, value: winProb }
  }

  /**
   * Cleans up resources.
   *
   * In Node.js, ONNX runtime cleans up automatically,
   * but we set model to null to allow garbage collection.
   */
  destroy(): void {
    this.model = null
    this.ready = false
  }
}

/**
 * Factory function to create a Node.js Maia instance.
 *
 * @param modelPath - Path to the ONNX model file
 * @returns A new NodeMaia instance (not yet initialized)
 *
 * @example
 * const maia = createNodeMaia('./public/maia2/maia_rapid.onnx')
 * await maia.init()
 * const result = await maia.predict(fen, { eloLevel: 1500 })
 */
export function createNodeMaia(modelPath: string): MaiaAdapter {
  return new NodeMaia(modelPath)
}
