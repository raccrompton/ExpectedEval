/**
 * Maia Neural Network Engine Implementation
 *
 * This file provides the Maia chess engine that predicts human-like moves.
 * Unlike Stockfish (which finds the best moves), Maia predicts what moves
 * humans of a given skill level are likely to play.
 *
 * Maia was trained on millions of games from Lichess, learning patterns
 * of how humans at different ELO levels actually play. It outputs:
 * - Move probabilities: "45% chance they play e5, 30% chance they play d5..."
 * - Win probability: "Based on position and typical human play, 58% chance of winning"
 *
 * Technical details:
 * - Uses ONNX (Open Neural Network Exchange) format
 * - Runs in browser via onnxruntime-web
 * - Model file is ~89MB, cached in IndexedDB
 *
 * @example
 * const maia = new RealMaia()
 * await maia.init()  // Downloads model on first use
 *
 * const result = await maia.predict(fen, { eloLevel: 1500 })
 * console.log(result.policy)  // { "e7e5": 0.45, "d7d5": 0.30, ... }
 * console.log(result.value)   // 0.58 (58% win probability)
 */

import { InferenceSession, Tensor } from 'onnxruntime-web'
import type { MaiaAdapter, MaiaConfig, MaiaEvaluation } from './types'
import { preprocess, mirrorMove, allPossibleMovesReversed } from './tensor'
import { MaiaModelStorage } from './storage'
import { Chess } from 'chessops/chess'
import { parseFen } from 'chessops/fen'
import { makeSquare } from 'chessops/util'
import { SquareSet } from 'chessops/squareSet'

/**
 * Default URL for the Maia ONNX model file.
 * Located in the public folder, served statically by Next.js.
 */
const DEFAULT_MODEL_URL = '/maia2/maia_rapid.onnx'

/**
 * Real Maia engine implementation using ONNX Runtime Web.
 *
 * This class implements the MaiaAdapter interface, providing:
 * - Model downloading with progress tracking
 * - IndexedDB caching (so model is only downloaded once)
 * - Move probability prediction
 * - Win probability estimation
 *
 * The model takes:
 * - Board position as an 18-channel 8x8 tensor
 * - ELO ratings for both players (as category indices)
 *
 * And outputs:
 * - Policy logits for each possible move
 * - Value (win probability) for the position
 *
 * @example
 * const maia = new RealMaia()
 * await maia.init()
 *
 * const prediction = await maia.predict(fen, { eloLevel: 1500 })
 * // prediction.policy = { "e7e5": 0.45, "c7c5": 0.25, ... }
 * // prediction.value = 0.52 (52% win probability)
 */
export class RealMaia implements MaiaAdapter {
  // ONNX inference session (the loaded model)
  private model: InferenceSession | null = null

  // URL where the model can be downloaded
  private modelUrl: string

  // IndexedDB storage for caching the model
  private storage: MaiaModelStorage

  // Track initialization state
  private ready = false
  private initializing = false

  // Progress callback for download tracking
  private onProgress?: (_progress: number) => void

  /**
   * Creates a new Maia instance.
   *
   * @param modelUrl - URL to the ONNX model file (default: /maia2/maia_rapid.onnx)
   * @param onProgress - Optional callback for download progress (0-100)
   */
  constructor(modelUrl: string = DEFAULT_MODEL_URL, onProgress?: (_progress: number) => void) {
    this.modelUrl = modelUrl
    this.onProgress = onProgress
    this.storage = new MaiaModelStorage()
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
   * Initializes the Maia engine.
   *
   * This will:
   * 1. Check IndexedDB for cached model
   * 2. If not cached, download the model (~89MB)
   * 3. Store in IndexedDB for future use
   * 4. Create ONNX inference session
   *
   * @throws Error if initialization fails
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

    if (this.ready) return

    this.initializing = true

    try {
      // Request persistent storage (optional, may improve reliability)
      await this.storage.requestPersistentStorage()

      console.log('Maia: Checking for cached model...')

      // Try to load from IndexedDB cache
      const cachedBuffer = await this.storage.getModel(this.modelUrl)

      if (cachedBuffer) {
        console.log('Maia: Found cached model, loading...')
        await this.initializeModel(cachedBuffer)
        console.log('Maia: Model loaded from cache')
      } else {
        console.log('Maia: No cached model, downloading...')
        await this.downloadAndInitialize()
        console.log('Maia: Model downloaded and initialized')
      }

      this.ready = true
    } catch (error) {
      console.error('Maia: Initialization failed:', error)
      this.ready = false
      throw error
    } finally {
      this.initializing = false
    }
  }

  /**
   * Downloads the model and initializes it.
   *
   * Shows download progress via the onProgress callback.
   * Stores the downloaded model in IndexedDB for caching.
   */
  private async downloadAndInitialize(): Promise<void> {
    // Fetch the model with progress tracking
    const response = await fetch(this.modelUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch model: ${response.status} ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    const contentLength = +(response.headers.get('Content-Length') ?? 0)

    if (!reader) {
      throw new Error('No response body available')
    }

    // Read the response stream with progress tracking
    const chunks: Uint8Array[] = []
    let receivedLength = 0
    let lastReportedProgress = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      chunks.push(value)
      receivedLength += value.length

      // Report progress every 10%
      const currentProgress = Math.floor((receivedLength / contentLength) * 100)
      if (currentProgress >= lastReportedProgress + 10) {
        this.onProgress?.(currentProgress)
        lastReportedProgress = currentProgress
      }
    }

    // Combine chunks into a single buffer
    const buffer = new Uint8Array(receivedLength)
    let position = 0
    for (const chunk of chunks) {
      buffer.set(chunk, position)
      position += chunk.length
    }

    // Store in IndexedDB for next time
    await this.storage.storeModel(this.modelUrl, buffer.buffer)

    // Initialize the ONNX session
    await this.initializeModel(buffer.buffer)
  }

  /**
   * Initializes the ONNX inference session from a model buffer.
   *
   * @param buffer - The model file as an ArrayBuffer
   */
  private async initializeModel(buffer: ArrayBuffer): Promise<void> {
    // Create ONNX inference session
    // onnxruntime-web will use WebAssembly for inference
    this.model = await InferenceSession.create(buffer)
    this.ready = true
  }

  /**
   * Predicts move probabilities for a position.
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
   * console.log(result.policy.e7e5)  // 0.45 (45% chance of playing e5)
   * console.log(result.value)         // 0.48 (48% win probability for Black)
   */
  async predict(
    fen: string,
    config?: Partial<MaiaConfig>,
  ): Promise<MaiaEvaluation> {
    if (!this.model) {
      throw new Error('Maia model not initialized. Call init() first.')
    }

    // Default ELO level (1500 is average club player)
    const eloLevel = config?.eloLevel ?? 1500

    // Get legal moves using chessops
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
          legalMoves.push(`${fromStr}${toStr}q`)
          legalMoves.push(`${fromStr}${toStr}r`)
          legalMoves.push(`${fromStr}${toStr}b`)
          legalMoves.push(`${fromStr}${toStr}n`)
        } else {
          legalMoves.push(`${fromStr}${toStr}`)
        }
      }
    }

    // Handle positions with no legal moves
    if (legalMoves.length === 0) {
      const inCheck = pos.isCheck()
      return {
        policy: {},
        value: inCheck ? 0.0 : 0.5,  // Checkmate = loss, Stalemate = draw
        eloLevel,
      }
    }

    // Preprocess the position for the neural network
    // This handles perspective normalization (Black positions are mirrored)
    const { boardInput, eloSelfCategory, eloOppoCategory, legalMovesMask } = preprocess(
      fen,
      eloLevel,
      eloLevel, // Use same ELO for opponent (symmetric)
      legalMoves,
    )

    // Prepare input tensors for ONNX runtime
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
    const { logits_maia, logits_value } = await this.model.run(feeds)

    // Process outputs into move probabilities
    const { policy, value } = this.processOutputs(
      fen,
      logits_maia,
      logits_value,
      legalMovesMask,
      legalMoves,
    )

    // Dispose input tensors to free memory
    feeds.boards.dispose()
    feeds.elo_self.dispose()
    feeds.elo_oppo.dispose()

    // Dispose output tensors to free memory (critical for preventing leaks!)
    // Per ONNX Runtime docs: "Call tensor.dispose() explicitly to destroy
    // the underlying buffer when it is no longer needed."
    logits_maia.dispose()
    logits_value.dispose()

    return {
      policy,
      value,
      eloLevel,
    }
  }

  /**
   * Processes model outputs into move probabilities and win probability.
   *
   * The model outputs:
   * - logits_maia: Raw scores for each possible move (1880 values)
   * - logits_value: Win probability prediction (-1 to +1)
   *
   * We need to:
   * 1. Mask illegal moves
   * 2. Apply softmax to get probabilities
   * 3. Convert value to 0-1 range
   * 4. Handle perspective (flip for Black)
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
    // Model outputs value from current player's perspective (after board normalization)
    // Since Black positions are mirrored to look like White, the model always outputs
    // from the "current player's" perspective (who appears as White after mirroring)
    const rawValue = value[0] as number
    let winProb = Math.min(Math.max(rawValue / 2 + 0.5, 0), 1)

    // Check if it's Black's turn
    const isBlackTurn = fen.split(' ')[1] === 'b'

    // Note: Model outputs value from perspective of side-to-move after mirroring
    // For Black positions, board is mirrored so Black appears as White

    // The model outputs value from the perspective of the side-to-move AFTER mirroring.
    // For Black positions, the board is mirrored so Black pieces become White.
    // So the model's value is already from Black's perspective.
    // We should NOT flip it - removing the flip that was here.
    // if (isBlackTurn) {
    //   winProb = 1 - winProb
    // }

    // Round to 4 decimal places
    winProb = Math.round(winProb * 10000) / 10000

    // Get indices of legal moves from the mask
    const legalMoveIndices = legalMovesMask
      .map((value, index) => (value > 0 ? index : -1))
      .filter((index) => index !== -1)

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
    // Softmax: exp(x_i) / sum(exp(x_j))
    // We subtract max for numerical stability
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
   * Call when done using the engine to free memory.
   */
  destroy(): void {
    // ONNX runtime doesn't have explicit cleanup
    // Setting to null allows garbage collection
    this.model = null
    this.ready = false
  }

  /**
   * Gets storage information (for debugging/display).
   *
   * @returns Storage info including model size and cache status
   */
  async getStorageInfo(): Promise<{
    supported: boolean
    quota?: number
    usage?: number
    modelSize?: number
    modelTimestamp?: number
  }> {
    return this.storage.getStorageInfo()
  }

  /**
   * Clears the cached model from IndexedDB.
   *
   * Use if you need to force re-download.
   */
  async clearCache(): Promise<void> {
    await this.storage.clearAllStorage()
  }
}

/**
 * Factory function to create a Maia instance.
 *
 * @param modelUrl - Optional custom model URL
 * @param onProgress - Optional progress callback for downloads
 * @returns A new RealMaia instance (not yet initialized)
 *
 * @example
 * const maia = createMaia()
 * await maia.init()  // Must call init before use
 */
export function createMaia(
  modelUrl?: string,
  onProgress?: (_progress: number) => void,
): MaiaAdapter {
  return new RealMaia(modelUrl, onProgress)
}
