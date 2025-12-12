/**
 * Engine Module - Public API
 *
 * This file exports all the public functions and types from the
 * engine module. Import from here instead of individual files.
 *
 * The engine module provides:
 * - Real implementations: RealStockfish, RealMaia (use in production)
 * - Mock implementations: MockStockfish, MockMaia (use in tests)
 * - Utility functions: cpToWinrate, winrateToCp
 * - Tensor preprocessing: preprocess, mirrorMove
 * - Storage utilities: MaiaModelStorage
 *
 * @example
 * // For production use:
 * import { RealStockfish, RealMaia, createStockfish, createMaia } from '@/core/engine'
 *
 * // For testing:
 * import { MockStockfish, MockMaia, createMockEngines } from '@/core/engine'
 *
 * // For utilities:
 * import { cpToWinrate, winrateToCp } from '@/core/engine'
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export type {
  StockfishEvaluation,
  StockfishConfig,
  MaiaEvaluation,
  MaiaConfig,
  StockfishAdapter,
  MaiaAdapter,
  EngineStatus,
  EngineLoadingProgress,
} from './types'

// ============================================================================
// Utility Functions
// ============================================================================

export { cpToWinrate, winrateToCp } from './types'

// ============================================================================
// Real Engine Implementations (Production)
// ============================================================================

// Real Stockfish (WASM) implementation
export { RealStockfish, createStockfish } from './stockfish'

// Real Maia (ONNX) implementation
export { RealMaia, createMaia } from './maia'

// ============================================================================
// Mock Implementations (Testing)
// ============================================================================

export {
  MockStockfish,
  MockMaia,
  createMockStockfish,
  createMockMaia,
  createMockEngines,
} from './mock'

// Export mock option types for test configuration
export type { MockStockfishOptions, MockMaiaOptions } from './mock'

// ============================================================================
// Tensor Preprocessing (used by Maia)
// ============================================================================

export {
  preprocess,
  mirrorMove,
  mirrorFEN,
  allPossibleMoves,
  allPossibleMovesReversed,
} from './tensor'

// ============================================================================
// Storage Utilities (IndexedDB caching for Maia model)
// ============================================================================

export { MaiaModelStorage } from './storage'

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates an engine pair - one Stockfish and one Maia instance.
 *
 * This is a convenience function for production use.
 * The engines are NOT initialized - you must call init() on each.
 *
 * @returns Object with stockfish and maia instances
 *
 * @example
 * const engines = createEngines()
 * await engines.stockfish.init()
 * await engines.maia.init()
 *
 * const sfEval = await engines.stockfish.evaluate(fen)
 * const maiaEval = await engines.maia.predict(fen)
 */
export function createEngines(): {
  stockfish: import('./types').StockfishAdapter
  maia: import('./types').MaiaAdapter
} {
  // Import here to avoid circular dependencies
  const { createStockfish } = require('./stockfish')
  const { createMaia } = require('./maia')

  return {
    stockfish: createStockfish(),
    maia: createMaia(),
  }
}
