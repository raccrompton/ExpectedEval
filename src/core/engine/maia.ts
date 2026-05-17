/**
 * Maia Neural Network Engine Implementation (Maia 3)
 *
 * This file provides the Maia chess engine that predicts human-like moves.
 * Unlike Stockfish (which finds the best moves), Maia predicts what moves
 * humans of a given skill level are likely to play.
 *
 * Maia 3 was trained on millions of games from Lichess, learning patterns
 * of how humans at different ELO levels actually play. It outputs:
 * - Move probabilities: "45% chance they play e5, 30% chance they play d5..."
 * - Win probability: "Based on position and typical human play, 58% chance of winning"
 *
 * Technical details:
 * - Uses a Web Worker to run ONNX inference off the main thread
 * - Worker runs onnxruntime-web internally; model file (~ONNX) is cached in IndexedDB
 * - Main thread communicates via postMessage/onmessage
 *
 * @example
 * const maia = new RealMaia()
 * await maia.init()  // Downloads model on first use
 *
 * const result = await maia.predict(fen, { eloLevel: 1500 })
 * console.log(result.policy)  // { "e7e5": 0.45, "d7d5": 0.30, ... }
 * console.log(result.value)   // 0.58 (58% win probability)
 */

import type { MaiaAdapter, MaiaConfig, MaiaEvaluation } from './types'
import { DEFAULT_EW_CONFIG } from '../analysis/types'
import { preprocessMaia3 } from './maia3/tensor'
import { processMaia3Outputs } from './maia3/processOutputs'

/**
 * Default URL for the Maia 3 ONNX model file.
 * Located in the public folder, served statically by Next.js.
 */
const DEFAULT_MODEL_URL = '/maia3/maia3_simplified.onnx'

/** M2: Model version sent to the worker in the init message. */
const MAIA_MODEL_VERSION = '3'

/** Timeout (ms) for the worker to report ready during init. */
const INIT_TIMEOUT_MS = 60_000

/** Timeout (ms) for a single inference request. */
const INFERENCE_TIMEOUT_MS = 30_000

/** Shape of a pending inference request awaiting a worker response. */
interface PendingInference {
  resolve: (_result: { logitsMove: ArrayBuffer; logitsValue: ArrayBuffer }) => void
  reject: (_err: Error) => void
}

/**
 * Real Maia 3 engine implementation — a thin proxy to the Maia Web Worker.
 *
 * All heavy lifting (ONNX session management, IndexedDB caching, tensor
 * operations) runs in the worker. The main thread only preprocesses input
 * (boardTokens / legalMoves), sends buffers over the structured-clone
 * channel, and decodes the returned logits via `processMaia3Outputs`.
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
  // The Web Worker that owns the ONNX session
  private worker: Worker | null = null

  // URL where the model can be downloaded
  private modelUrl: string

  // Track readiness
  private ready = false

  // C1: Whether the init promise has already settled (resolved or rejected)
  private initSettled = false

  // I2: Memoised init promise — returned on every subsequent init() call
  private initPromise: Promise<void> | null = null

  // Progress callback for download tracking (0–100)
  private onProgress?: (_progress: number) => void

  // Pending inference map: requestId → { resolve, reject }
  private pendingInferences: Map<number, PendingInference> = new Map()
  private nextRequestId = 0

  /**
   * Creates a new Maia instance.
   *
   * @param modelUrl   - URL to the ONNX model file (default: /maia3/maia3_simplified.onnx)
   * @param onProgress - Optional callback for download progress (0-100)
   */
  constructor(
    modelUrl: string = DEFAULT_MODEL_URL,
    onProgress?: (_progress: number) => void,
  ) {
    this.modelUrl = modelUrl
    this.onProgress = onProgress
  }

  /**
   * Checks if the engine is ready to receive commands.
   *
   * @returns true once the worker has reported `status: 'ready'`
   */
  isReady(): boolean {
    return this.ready
  }

  /**
   * Initialises the Maia engine.
   *
   * Spawns the Web Worker, wires message handlers, and posts an `init`
   * message. The worker handles cache checking and model downloading
   * internally; it reports progress and emits `status: 'ready'` when done.
   *
   * I2: Concurrent calls are safe — the same Promise is returned for all
   * callers until init has settled.
   *
   * I1: Rejects after INIT_TIMEOUT_MS if the worker never reports ready.
   *
   * @throws Error in SSR/Node environments where `Worker` is unavailable.
   * @throws Error if the worker reports an error during initialisation.
   */
  async init(): Promise<void> {
    // I2: Return memoised promise so concurrent callers share one worker
    if (this.initPromise !== null) return this.initPromise

    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      throw new Error(
        'RealMaia: Web Workers are not available in this environment (SSR/Node). ' +
          'Use MockMaia for server-side rendering or testing.',
      )
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      this.worker = new Worker('/maia-worker.js')

      // I1: Timeout guard — reject if the worker never reports ready
      let initTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        initTimer = null
        if (!this.initSettled) {
          this.initSettled = true
          this.worker?.terminate()
          this.worker = null
          this.initPromise = null
          reject(
            new Error(
              `Maia worker did not become ready within ${INIT_TIMEOUT_MS / 1000}s. ` +
                'Check that the worker script loaded correctly.',
            ),
          )
        }
      }, INIT_TIMEOUT_MS)

      /** Settle the init promise exactly once. */
      const settleInit = (settleFn: () => void) => {
        if (this.initSettled) return
        this.initSettled = true
        if (initTimer !== null) {
          clearTimeout(initTimer)
          initTimer = null
        }
        settleFn()
      }

      this.worker.onmessage = (e: MessageEvent) => {
        const msg = e.data as Record<string, unknown>

        switch (msg.type) {
          case 'status': {
            const status = msg.status as string
            if (status === 'no-cache') {
              // Model not cached — tell the worker to start downloading
              this.worker!.postMessage({ type: 'download' })
            } else if (status === 'ready') {
              settleInit(() => {
                this.ready = true
                this.onProgress?.(100)
                resolve()
              })
            }
            // M3: removed dead 'error' branch — worker never sends status:'error'
            break
          }

          case 'progress': {
            const progress = msg.progress as number
            this.onProgress?.(progress)
            break
          }

          case 'error': {
            const id = msg.id as number | undefined
            if (id !== undefined) {
              // Per-inference error (safe to handle at any time)
              const pending = this.pendingInferences.get(id)
              if (pending) {
                pending.reject(new Error((msg.message as string) ?? 'Maia inference error'))
                this.pendingInferences.delete(id)
              }
            } else {
              // C1: Global worker error — reject all pending inferences
              const err = new Error((msg.message as string) ?? 'Maia worker error')
              for (const pending of this.pendingInferences.values()) {
                pending.reject(err)
              }
              this.pendingInferences.clear()

              // C1: Only touch init promise if not yet settled
              if (!this.initSettled) {
                settleInit(() => reject(err))
              }
            }
            break
          }

          case 'inference-result': {
            const id = msg.id as number
            const pending = this.pendingInferences.get(id)
            if (pending) {
              pending.resolve({
                logitsMove: msg.logitsMove as ArrayBuffer,
                logitsValue: msg.logitsValue as ArrayBuffer,
              })
              this.pendingInferences.delete(id)
            }
            break
          }
        }
      }

      this.worker.onerror = (err: ErrorEvent) => {
        console.error('Maia worker crashed:', err)
        const error = new Error(err.message ?? 'Maia worker crashed')
        // C1: Reject all in-flight inferences regardless of init state
        for (const pending of this.pendingInferences.values()) {
          pending.reject(error)
        }
        this.pendingInferences.clear()

        // C1: Only reject init if it hasn't settled yet
        if (!this.initSettled) {
          settleInit(() => reject(error))
        }
      }

      // Tell the worker which model to load (M2: use constant)
      this.worker.postMessage({
        type: 'init',
        modelUrl: this.modelUrl,
        modelVersion: MAIA_MODEL_VERSION,
      })
    })

    return this.initPromise
  }

  /**
   * Posts an `inference` message to the worker and awaits the matching result.
   *
   * Buffers are transferred (zero-copy) to avoid serialisation overhead.
   *
   * I4: Each request has a per-request timeout (INFERENCE_TIMEOUT_MS). On
   * expiry the promise is rejected and the pending entry is removed so the
   * slot cannot be resolved/rejected by a late response.
   */
  private runInference(
    tokens: Float32Array,
    eloSelfs: Float32Array,
    eloOppos: Float32Array,
    batchSize: number,
  ): Promise<{ logitsMove: ArrayBuffer; logitsValue: ArrayBuffer }> {
    if (!this.worker) {
      return Promise.reject(new Error('Maia worker not initialised. Call init() first.'))
    }

    const id = this.nextRequestId++

    return new Promise((resolve, reject) => {
      // I4: Per-request timeout
      const timer = setTimeout(() => {
        if (this.pendingInferences.has(id)) {
          this.pendingInferences.delete(id)
          reject(
            new Error(
              `Maia inference request ${id} timed out after ${INFERENCE_TIMEOUT_MS / 1000}s`,
            ),
          )
        }
      }, INFERENCE_TIMEOUT_MS)

      this.pendingInferences.set(id, {
        resolve: (result) => {
          clearTimeout(timer)
          resolve(result)
        },
        reject: (err) => {
          clearTimeout(timer)
          reject(err)
        },
      })

      // Transfer ArrayBuffers for zero-copy send
      this.worker!.postMessage(
        {
          type: 'inference',
          id,
          tokens: tokens.buffer,
          eloSelfs: eloSelfs.buffer,
          eloOppos: eloOppos.buffer,
          batchSize,
        },
        [tokens.buffer, eloSelfs.buffer, eloOppos.buffer],
      )
    })
  }

  /**
   * Predicts move probabilities for a position.
   *
   * @param fen    - Position in FEN notation
   * @param config - Configuration (ELO level); defaults to the app's default Maia level
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
  async predict(fen: string, config?: Partial<MaiaConfig>): Promise<MaiaEvaluation> {
    // I3: Guard against calling predict before init() has resolved
    if (!this.ready) {
      throw new Error('Maia is not ready — call init() and await it first.')
    }

    // Resolve ELO level: explicit config → app default (1500)
    const eloLevel = config?.eloLevel ?? DEFAULT_EW_CONFIG.maiaLevel

    // Preprocess: build board tokens and legal-move mask
    const { boardTokens, legalMoves } = preprocessMaia3(fen)

    // Run inference on the worker (M1: new Float32Array instead of Float32Array.from)
    const { logitsMove, logitsValue } = await this.runInference(
      boardTokens,
      new Float32Array([eloLevel]),
      new Float32Array([eloLevel]), // symmetric: use same ELO for both sides
      1,
    )

    // Decode worker output into policy + value
    const { policy, value } = processMaia3Outputs(
      fen,
      new Float32Array(logitsMove),
      new Float32Array(logitsValue),
      legalMoves,
    )

    return { policy, value, eloLevel }
  }

  /**
   * Cleans up resources.
   *
   * Terminates the Web Worker and clears all state.
   */
  destroy(): void {
    this.worker?.terminate()
    this.worker = null
    this.ready = false
    // Reject any pending inferences
    for (const pending of this.pendingInferences.values()) {
      pending.reject(new Error('Maia engine destroyed'))
    }
    this.pendingInferences.clear()
  }
}

/**
 * Factory function to create a Maia instance.
 *
 * @param modelUrl   - Optional custom model URL
 * @param onProgress - Optional progress callback for downloads (0-100)
 * @returns A new RealMaia instance (not yet initialised)
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
