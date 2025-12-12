/**
 * Engine Types - Interfaces for Chess Engine Adapters
 *
 * This file defines the interfaces that all engine implementations must follow.
 * By using interfaces, we can:
 * 1. Easily mock engines for testing
 * 2. Swap engine implementations without changing calling code
 * 3. Run unit tests without loading heavy WASM/ONNX files
 *
 * Both Stockfish and Maia implement these interfaces, allowing
 * the Expected Winrate algorithm to work with either or mock versions.
 */

// ============================================================================
// STOCKFISH TYPES
// ============================================================================

/**
 * Stockfish evaluation result for a position.
 *
 * Contains the engine's analysis: best moves, centipawn score,
 * and win probability (converted from centipawns).
 */
export interface StockfishEvaluation {
  /**
   * Search depth reached by the engine.
   * Higher depth = more accurate but slower.
   */
  depth: number

  /**
   * The best move according to Stockfish (UCI format, e.g., "e2e4").
   */
  bestMove: string

  /**
   * Centipawn evaluation from White's perspective.
   * Positive = White is better, Negative = Black is better.
   * 100 cp ≈ 1 pawn advantage.
   */
  cp: number

  /**
   * Win probability from the side to move's perspective (0.0 to 1.0).
   * Derived from centipawn evaluation using standard formula.
   */
  winrate: number

  /**
   * Evaluation for each legal move (UCI format → centipawns).
   * Useful for filtering candidate moves.
   */
  moveEvaluations?: Record<string, number>

  /**
   * Win probability for each legal move (UCI format → probability).
   * Useful for comparing move quality.
   */
  moveWinrates?: Record<string, number>

  /**
   * Whether this is a mate score (not centipawns).
   * If true, `mateIn` contains the number of moves to mate.
   */
  isMate: boolean

  /**
   * Moves until mate (positive = mating, negative = being mated).
   * Only valid when `isMate` is true.
   */
  mateIn?: number
}

/**
 * Configuration options for Stockfish analysis.
 */
export interface StockfishConfig {
  /**
   * Search depth (higher = more accurate but slower).
   * Typical values: 12-20.
   */
  depth: number

  /**
   * Number of best lines to calculate (MultiPV).
   * Set higher to get evaluations for multiple moves.
   */
  multiPv?: number

  /**
   * Time limit in milliseconds.
   * The engine will stop when this time is reached.
   */
  timeLimit?: number

  /**
   * Number of threads to use.
   * More threads = faster, but depends on available cores.
   */
  threads?: number

  /**
   * Hash table size in MB.
   * Larger = better for long analysis.
   */
  hash?: number
}

// ============================================================================
// MAIA TYPES
// ============================================================================

/**
 * Maia prediction result for a position.
 *
 * Contains move probabilities (what humans likely play) and
 * win probability (how likely the current player wins).
 */
export interface MaiaEvaluation {
  /**
   * Move probabilities (UCI format → probability 0.0 to 1.0).
   * Represents how likely a human at this ELO would play each move.
   *
   * Example: { "e2e4": 0.35, "d2d4": 0.28, "g1f3": 0.15, ... }
   */
  policy: Record<string, number>

  /**
   * Win probability from the side to move's perspective (0.0 to 1.0).
   * Based on Maia's neural network value head.
   */
  value: number

  /**
   * The ELO level used for this prediction.
   * Different ELO levels predict different move preferences.
   */
  eloLevel: number
}

/**
 * Configuration options for Maia analysis.
 */
export interface MaiaConfig {
  /**
   * ELO level for predictions (1100-1900 in steps of 100).
   * Higher ELO = more accurate play, lower = more human-like mistakes.
   */
  eloLevel: number
}

// ============================================================================
// ENGINE ADAPTER INTERFACES
// ============================================================================

/**
 * Adapter interface for Stockfish engine.
 *
 * Implementations must provide position evaluation and lifecycle management.
 * The actual implementation uses WebAssembly, but mocks can be synchronous.
 */
export interface StockfishAdapter {
  /**
   * Check if the engine is ready to receive commands.
   */
  isReady(): boolean

  /**
   * Initialize the engine. Must be called before use.
   * This may download/load WASM files.
   */
  init(): Promise<void>

  /**
   * Evaluate a position given by FEN string.
   *
   * @param fen - Position in FEN notation
   * @param config - Analysis configuration
   * @returns Evaluation results
   */
  evaluate(fen: string, config?: Partial<StockfishConfig>): Promise<StockfishEvaluation>

  /**
   * Stop any ongoing analysis.
   * Useful for cancelling when user navigates away.
   */
  stop(): void

  /**
   * Clean up resources. Call when done with the engine.
   */
  destroy(): void
}

/**
 * Adapter interface for Maia engine.
 *
 * Implementations must provide move probability predictions.
 * The actual implementation uses ONNX Runtime, but mocks can be synchronous.
 */
export interface MaiaAdapter {
  /**
   * Check if the engine is ready to receive commands.
   */
  isReady(): boolean

  /**
   * Initialize the engine. Must be called before use.
   * This may download/load ONNX model files.
   */
  init(): Promise<void>

  /**
   * Predict move probabilities for a position.
   *
   * @param fen - Position in FEN notation
   * @param config - Prediction configuration
   * @returns Move probabilities and value
   */
  predict(fen: string, config?: Partial<MaiaConfig>): Promise<MaiaEvaluation>

  /**
   * Clean up resources. Call when done with the engine.
   */
  destroy(): void
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Engine loading status for UI feedback.
 */
export type EngineStatus =
  | 'not_initialized'  // Engine hasn't been initialized yet
  | 'loading'          // Engine is loading (downloading files, initializing)
  | 'ready'            // Engine is ready to receive commands
  | 'error'            // Engine failed to load
  | 'analyzing'        // Engine is currently analyzing

/**
 * Information about engine loading progress.
 */
export interface EngineLoadingProgress {
  status: EngineStatus
  progress: number     // 0-100
  message: string      // Human-readable status message
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert centipawn evaluation to win probability.
 *
 * Uses the standard formula: winrate = 1 / (1 + 10^(-cp/400))
 * This is the same formula used by Lichess and Chess.com.
 *
 * @param cp - Centipawn evaluation
 * @returns Win probability (0.0 to 1.0)
 */
export function cpToWinrate(cp: number): number {
  // Handle mate scores
  if (cp >= 10000) return 1.0
  if (cp <= -10000) return 0.0

  // Standard logistic function
  return 1 / (1 + Math.pow(10, -cp / 400))
}

/**
 * Convert win probability to centipawns.
 *
 * Inverse of cpToWinrate.
 *
 * @param winrate - Win probability (0.0 to 1.0)
 * @returns Centipawn evaluation (clamped to reasonable range)
 */
export function winrateToCp(winrate: number): number {
  // Handle edge cases
  if (winrate >= 0.999) return 10000
  if (winrate <= 0.001) return -10000

  // Inverse logistic function
  return -400 * Math.log10((1 - winrate) / winrate)
}
