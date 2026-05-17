/**
 * Maia Neural Network Engine - Node.js Implementation (Maia 3)
 *
 * This file provides a Node.js-compatible version of the Maia 3 engine.
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
 * Input feeds mirror the maia-worker.js exactly:
 *   tokens:    float32 [batchSize, 64, 12]
 *   elo_self:  float32 [batchSize]
 *   elo_oppo:  float32 [batchSize]
 *
 * Output names: logits_move, logits_value
 *
 * @example
 * // In a Node.js script or test:
 * import { NodeMaia } from './maia.node'
 *
 * const maia = new NodeMaia()
 * await maia.init()
 *
 * const result = await maia.predict(fen, { eloLevel: 1500 })
 * console.log(result.policy)  // Move probabilities
 * console.log(result.value)   // Win probability
 */

// Use Node.js ONNX runtime (same Tensor API as onnxruntime-web)
import { InferenceSession, Tensor } from 'onnxruntime-node'
import * as fs from 'fs'
import * as path from 'path'

// Import shared types
import type { MaiaAdapter, MaiaConfig, MaiaEvaluation } from './types'
import { DEFAULT_EW_CONFIG } from '../analysis/types'

// Import Maia 3 preprocessing and output processing — pure TS, works in Node
import { preprocessMaia3 } from './maia3/tensor'
import { processMaia3Outputs } from './maia3/processOutputs'

/** Number of floats per position in the tokens tensor (64 squares × 12 piece channels). */
const TOKENS_PER_POSITION = 64 * 12

/** Number of move logits per position (Maia 3 vocabulary size). */
const MOVE_LOGITS_PER_ITEM = 4352

/** Number of value logits per position (Loss / Draw / Win). */
const VALUE_LOGITS_PER_ITEM = 3

/** Default path to the Maia 3 ONNX model relative to the project root. */
const DEFAULT_MODEL_PATH = './public/maia3/maia3_simplified.onnx'

/**
 * Node.js implementation of the Maia 3 adapter.
 *
 * Differences from the browser RealMaia:
 * - Reads model from filesystem instead of downloading via fetch
 * - Uses onnxruntime-node instead of onnxruntime-web / Web Worker
 * - No IndexedDB caching (not needed for local files)
 * - predictBatch runs a true batched ONNX session.run (mirrors RealMaia)
 *
 * The tensor preprocessing (preprocessMaia3) and output processing
 * (processMaia3Outputs) are shared with the browser implementation.
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
   * Creates a new Node.js Maia 3 instance.
   *
   * @param modelPath - Path to the Maia 3 ONNX model file on disk.
   *                    Can be absolute or relative to cwd.
   *                    Defaults to './public/maia3/maia3_simplified.onnx'.
   *
   * @example
   * // Use default (Maia 3)
   * const maia = new NodeMaia()
   *
   * // Explicit path
   * const maia = new NodeMaia('./public/maia3/maia3_simplified.onnx')
   */
  constructor(modelPath: string = DEFAULT_MODEL_PATH) {
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
   * Initializes the Maia 3 engine by loading the ONNX model from disk.
   *
   * @throws Error if model file doesn't exist or can't be loaded
   *
   * @example
   * const maia = new NodeMaia()
   * await maia.init()  // Loads model from disk
   */
  async init(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initializing) {
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
        throw new Error(`Maia 3 model not found at: ${this.modelPath}`)
      }

      console.log(`[NodeMaia] Loading Maia 3 model from: ${this.modelPath}`)
      const startTime = Date.now()

      // InferenceSession.create accepts a file path directly — more memory-efficient
      // than reading the whole buffer first.
      //
      // Workaround: onnxruntime-node 1.23.x segfaults during Level-2+ graph
      // transformation of the Maia 3 model. 'basic' (Level 1 only) avoids the
      // crash while still applying constant-folding and rule-based rewrites.
      this.model = await InferenceSession.create(this.modelPath, {
        graphOptimizationLevel: 'basic',
      })

      const loadTime = Date.now() - startTime
      console.log(`[NodeMaia] Maia 3 model loaded in ${loadTime}ms`)

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
   * Predicts move probabilities and win probability for multiple positions
   * in a single batched ONNX inference call.
   *
   * Mirrors RealMaia.predictBatch: concatenates all board tokens into one
   * flat Float32Array, runs one session.run, then slices the returned logits
   * per item and processes each with processMaia3Outputs.
   *
   * @param fens   - Positions in FEN notation
   * @param config - Configuration (ELO level); defaults to app default Maia level
   * @returns Move probabilities and win probability for each position, in input order
   */
  async predictBatch(
    fens: string[],
    config?: Partial<MaiaConfig>,
  ): Promise<MaiaEvaluation[]> {
    if (!this.model) {
      throw new Error('Maia 3 model not initialized. Call init() first.')
    }

    if (fens.length === 0) return []

    const eloLevel = config?.eloLevel ?? DEFAULT_EW_CONFIG.maiaLevel

    // Preprocess every position
    const preprocessed = fens.map((fen) => preprocessMaia3(fen))

    // Concatenate all board tokens into one flat array: [N, 64, 12] flattened
    const combinedTokens = new Float32Array(fens.length * TOKENS_PER_POSITION)
    for (let i = 0; i < preprocessed.length; i++) {
      combinedTokens.set(preprocessed[i].boardTokens, i * TOKENS_PER_POSITION)
    }

    // ELO arrays — same value for self and opponent for all items
    const eloSelfs = new Float32Array(fens.length).fill(eloLevel)
    const eloOppos = new Float32Array(fens.length).fill(eloLevel)

    // Build ONNX feeds matching the tensor names from maia-worker.js exactly
    const feeds: Record<string, Tensor> = {
      tokens: new Tensor('float32', combinedTokens, [fens.length, 64, 12]),
      elo_self: new Tensor('float32', eloSelfs, [fens.length]),
      elo_oppo: new Tensor('float32', eloOppos, [fens.length]),
    }

    let resultTensors: InferenceSession.OnnxValueMapType | undefined
    try {
      resultTensors = await this.model.run(feeds)

      const moveLogitsAll = resultTensors.logits_move.data as Float32Array
      const valueLogitsAll = resultTensors.logits_value.data as Float32Array

      // Slice per-item and decode with shared Maia 3 output processor
      return fens.map((fen, i) => {
        const moveSlice = moveLogitsAll.slice(
          i * MOVE_LOGITS_PER_ITEM,
          (i + 1) * MOVE_LOGITS_PER_ITEM,
        )
        const valueSlice = valueLogitsAll.slice(
          i * VALUE_LOGITS_PER_ITEM,
          (i + 1) * VALUE_LOGITS_PER_ITEM,
        )
        const { policy, value } = processMaia3Outputs(
          fen,
          moveSlice,
          valueSlice,
          preprocessed[i].legalMoves,
        )
        return { policy, value, eloLevel }
      })
    } finally {
      // Dispose input tensors to avoid native memory leaks in long-running scripts
      feeds.tokens.dispose()
      feeds.elo_self.dispose()
      feeds.elo_oppo.dispose()
      // Dispose output tensors if session.run succeeded
      if (resultTensors) {
        resultTensors.logits_move?.dispose()
        resultTensors.logits_value?.dispose()
      }
    }
  }

  /**
   * Predicts move probabilities for a single position.
   *
   * Delegates to predictBatch to eliminate duplicated logic.
   *
   * @param fen    - Position in FEN notation
   * @param config - Configuration (ELO level)
   * @returns Move probabilities and win probability
   *
   * @example
   * const result = await maia.predict(
   *   'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
   *   { eloLevel: 1500 }
   * )
   * console.log(result.policy.e7e5)  // e.g. 0.45
   * console.log(result.value)         // e.g. 0.48 (Black's win probability)
   */
  async predict(
    fen: string,
    config?: Partial<MaiaConfig>,
  ): Promise<MaiaEvaluation> {
    return (await this.predictBatch([fen], config))[0]
  }

  /**
   * Cleans up resources.
   *
   * Sets model to null to allow garbage collection of the ONNX session.
   */
  destroy(): void {
    this.model = null
    this.ready = false
  }
}

/**
 * Factory function to create a Node.js Maia 3 instance.
 *
 * @param modelPath - Optional path to the ONNX model file (defaults to Maia 3 model)
 * @returns A new NodeMaia instance (not yet initialized)
 *
 * @example
 * const maia = createNodeMaia()
 * await maia.init()
 * const result = await maia.predict(fen, { eloLevel: 1500 })
 */
export function createNodeMaia(modelPath?: string): MaiaAdapter {
  return new NodeMaia(modelPath)
}
