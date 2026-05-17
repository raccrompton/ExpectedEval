/**
 * Mock Engine Implementations for Testing
 *
 * These mock implementations allow us to test the Expected Winrate
 * algorithm without loading real WASM/ONNX engines. They return
 * predictable, configurable results.
 *
 * Benefits:
 * - Unit tests run fast (no engine loading)
 * - Predictable outputs for assertions
 * - Can simulate edge cases (mate, errors, etc.)
 * - No browser requirements (SharedArrayBuffer, etc.)
 */

import type {
  StockfishAdapter,
  MaiaAdapter,
  StockfishEvaluation,
  MaiaEvaluation,
  StockfishConfig,
  MaiaConfig,
} from './types'
import { cpToWinrate } from './types'

// ============================================================================
// MOCK STOCKFISH
// ============================================================================

/**
 * Configuration for mock Stockfish behavior.
 */
export interface MockStockfishOptions {
  /**
   * Default evaluation to return (centipawns).
   * Positive = White advantage.
   */
  defaultCp?: number

  /**
   * Custom evaluations for specific positions (FEN → cp).
   * Allows testing specific scenarios.
   */
  positionEvaluations?: Record<string, number>

  /**
   * Delay in ms before returning results.
   * Simulates real engine thinking time.
   */
  delay?: number

  /**
   * If true, will throw an error on evaluate().
   * For testing error handling.
   */
  shouldFail?: boolean

  /**
   * Error message when shouldFail is true.
   */
  errorMessage?: string
}

/**
 * Mock Stockfish adapter for testing.
 *
 * Returns configurable, predictable evaluations without
 * actually running Stockfish WASM.
 *
 * @example
 * // Basic usage
 * const sf = new MockStockfish({ defaultCp: 50 })
 * await sf.init()
 * const result = await sf.evaluate(fen)
 * // result.cp === 50
 *
 * @example
 * // Position-specific evaluations
 * const sf = new MockStockfish({
 *   positionEvaluations: {
 *     'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1': 30
 *   }
 * })
 */
export class MockStockfish implements StockfishAdapter {
  // Configuration options
  private options: MockStockfishOptions

  // Engine state
  private ready = false

  // Dynamic overrides (set at runtime for tests)
  private moveEvaluationsOverride: Record<string, number> | null = null

  /**
   * Create a mock Stockfish instance.
   *
   * @param options - Configuration for mock behavior
   */
  constructor(options: MockStockfishOptions = {}) {
    this.options = {
      defaultCp: 20,  // Slight White advantage by default
      delay: 0,       // No delay by default (fast tests)
      shouldFail: false,
      ...options,
    }
  }

  /**
   * Set move evaluations for testing.
   * These override the default evaluations when evaluate() is called.
   * Values are winrates (0-1), not centipawns.
   */
  setMoveEvaluations(evaluations: Record<string, number>): void {
    this.moveEvaluationsOverride = evaluations
  }

  /**
   * Check if mock engine is ready.
   */
  isReady(): boolean {
    return this.ready
  }

  /**
   * Initialize the mock engine.
   * In the mock, this just sets the ready flag.
   */
  async init(): Promise<void> {
    // Simulate brief initialization
    if (this.options.delay) {
      await delay(this.options.delay / 10)
    }
    this.ready = true
  }

  /**
   * Evaluate a position.
   *
   * Returns a mock evaluation based on configured options.
   * Uses position-specific evaluations if available,
   * otherwise falls back to default.
   */
  async evaluate(
    fen: string,
    config?: Partial<StockfishConfig>
  ): Promise<StockfishEvaluation> {
    // Check if engine is ready
    if (!this.ready) {
      throw new Error('MockStockfish: Engine not initialized. Call init() first.')
    }

    // Check if we should fail
    if (this.options.shouldFail) {
      throw new Error(this.options.errorMessage || 'MockStockfish: Simulated failure')
    }

    // Simulate thinking time
    if (this.options.delay) {
      await delay(this.options.delay)
    }

    // Get evaluation for this position
    let cp: number
    if (this.options.positionEvaluations?.[fen] !== undefined) {
      cp = this.options.positionEvaluations[fen]
    } else {
      cp = this.options.defaultCp ?? 20
    }

    // Calculate winrate from centipawns
    const winrate = cpToWinrate(cp)

    // Generate mock best move (just pick something reasonable)
    const bestMove = this.getMockBestMove(fen)

    // Build moveWinrates if we have overrides
    let moveWinrates: Record<string, number> | undefined
    let moveEvaluations: Record<string, number> | undefined
    if (this.moveEvaluationsOverride) {
      moveWinrates = { ...this.moveEvaluationsOverride }
      // Convert winrates to centipawns for moveEvaluations
      moveEvaluations = {}
      for (const [move, wr] of Object.entries(this.moveEvaluationsOverride)) {
        // Approximate cp from winrate using inverse formula
        moveEvaluations[move] = Math.round(-400 * Math.log10((1 - wr) / wr))
      }
    }

    return {
      depth: config?.depth ?? 14,
      bestMove,
      cp,
      winrate,
      isMate: false,
      moveWinrates,
      moveEvaluations,
    }
  }

  /**
   * Stop analysis (no-op in mock).
   */
  stop(): void {
    // No-op for mock
  }

  /**
   * Clean up (no-op in mock).
   */
  destroy(): void {
    this.ready = false
  }

  /**
   * Generate a plausible mock best move.
   * This is just for testing - doesn't consider legality.
   */
  private getMockBestMove(fen: string): string {
    // Parse whose turn it is from FEN
    const parts = fen.split(' ')
    const isWhite = parts[1] === 'w'

    // Return common opening moves based on turn
    // These are just placeholders for testing
    if (isWhite) {
      return 'e2e4'  // Classic King's Pawn
    } else {
      return 'e7e5'  // Classic response
    }
  }
}

// ============================================================================
// MOCK MAIA
// ============================================================================

/**
 * Configuration for mock Maia behavior.
 */
export interface MockMaiaOptions {
  /**
   * Default move probabilities to return.
   * Map of UCI move → probability (should sum to ~1.0).
   */
  defaultPolicy?: Record<string, number>

  /**
   * Default win probability (value head output).
   */
  defaultValue?: number

  /**
   * Custom predictions for specific positions.
   */
  positionPredictions?: Record<string, MaiaEvaluation>

  /**
   * Delay in ms before returning results.
   */
  delay?: number

  /**
   * If true, will throw an error on predict().
   */
  shouldFail?: boolean

  /**
   * Error message when shouldFail is true.
   */
  errorMessage?: string
}

/**
 * Mock Maia adapter for testing.
 *
 * Returns configurable move probabilities and value predictions
 * without loading ONNX models.
 *
 * @example
 * const maia = new MockMaia({
 *   defaultPolicy: { 'e7e5': 0.45, 'c7c5': 0.30, 'd7d6': 0.15 },
 *   defaultValue: 0.48
 * })
 * await maia.init()
 * const result = await maia.predict(fen)
 */
export class MockMaia implements MaiaAdapter {
  // Configuration options
  private options: MockMaiaOptions

  // Engine state
  private ready = false

  // Dynamic overrides (set at runtime for tests)
  private policyOverride: Record<string, number> | null = null
  private valueOverride: number | null = null

  /**
   * Create a mock Maia instance.
   *
   * @param options - Configuration for mock behavior
   */
  constructor(options: MockMaiaOptions = {}) {
    this.options = {
      defaultPolicy: {
        'e7e5': 0.35,
        'c7c5': 0.25,
        'd7d6': 0.15,
        'e7e6': 0.10,
        'g8f6': 0.08,
      },
      defaultValue: 0.50,
      delay: 0,
      shouldFail: false,
      ...options,
    }
  }

  /**
   * Set policy (move probabilities) override for testing.
   */
  setPolicyOverride(policy: Record<string, number>): void {
    this.policyOverride = policy
  }

  /**
   * Set value override for testing.
   * The value represents win probability from side-to-move perspective.
   */
  setValueOverride(value: number): void {
    this.valueOverride = value
  }

  /**
   * Check if mock engine is ready.
   */
  isReady(): boolean {
    return this.ready
  }

  /**
   * Initialize the mock engine.
   */
  async init(): Promise<void> {
    if (this.options.delay) {
      await delay(this.options.delay / 10)
    }
    this.ready = true
  }

  /**
   * Predict move probabilities for a position.
   *
   * Returns mock predictions based on configured options.
   */
  async predict(
    fen: string,
    config?: Partial<MaiaConfig>
  ): Promise<MaiaEvaluation> {
    // Check if engine is ready
    if (!this.ready) {
      throw new Error('MockMaia: Engine not initialized. Call init() first.')
    }

    // Check if we should fail
    if (this.options.shouldFail) {
      throw new Error(this.options.errorMessage || 'MockMaia: Simulated failure')
    }

    // Simulate thinking time
    if (this.options.delay) {
      await delay(this.options.delay)
    }

    // Check for position-specific prediction
    if (this.options.positionPredictions?.[fen]) {
      return this.options.positionPredictions[fen]
    }

    // Use overrides if set, otherwise use defaults
    const policy = this.policyOverride ?? { ...this.options.defaultPolicy! }
    const value = this.valueOverride ?? this.options.defaultValue!

    return {
      policy,
      value,
      eloLevel: config?.eloLevel ?? 1500,
    }
  }

  /**
   * Predict move probabilities for multiple positions.
   *
   * Mock implementation delegates to predict() for each position.
   */
  async predictBatch(
    fens: string[],
    config?: Partial<MaiaConfig>
  ): Promise<MaiaEvaluation[]> {
    return Promise.all(fens.map((f) => this.predict(f, config)))
  }

  /**
   * Clean up (no-op in mock).
   */
  destroy(): void {
    this.ready = false
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Promise-based delay helper.
 *
 * @param ms - Milliseconds to wait
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a mock Stockfish with common default settings.
 *
 * @returns Ready-to-use mock Stockfish adapter
 */
export function createMockStockfish(
  options?: MockStockfishOptions
): MockStockfish {
  return new MockStockfish(options)
}

/**
 * Create a mock Maia with common default settings.
 *
 * @returns Ready-to-use mock Maia adapter
 */
export function createMockMaia(options?: MockMaiaOptions): MockMaia {
  return new MockMaia(options)
}

/**
 * Create both mock engines with coordinated settings.
 *
 * Useful for testing Expected Winrate which needs both engines.
 *
 * @returns Object with both mock adapters
 */
export function createMockEngines(
  stockfishOptions?: MockStockfishOptions,
  maiaOptions?: MockMaiaOptions
): { stockfish: MockStockfish; maia: MockMaia } {
  return {
    stockfish: createMockStockfish(stockfishOptions),
    maia: createMockMaia(maiaOptions),
  }
}
