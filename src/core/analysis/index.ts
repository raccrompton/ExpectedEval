/**
 * Analysis Module - Public API
 *
 * This file exports all the public functions and types from the
 * analysis module. Import from here instead of individual files.
 *
 * @example
 * import { calculateExpectedWinrate, DEFAULT_EW_CONFIG } from '@/core/analysis'
 */

// Types
export type {
  TreeNode,
  EWConfig,
  EWResult,
  EWCandidateResult,
  EWProgressCallback,
  OnEWProgress,
} from './types'

// Constants
export { DEFAULT_EW_CONFIG } from './types'

// Main calculation functions
export {
  calculateExpectedWinrate,
  calculateMaiaOnlyEW,
  enrichWithStockfish,
  computeExpectedWinrateFromTree,
  summarizeEWResult,
  compareWithStockfish,
} from './expectedWinrate'

// Tree building utilities
export {
  buildTree,
  applyMove,
  uciToSan,
  sanToUci,
  getLeafNodes,
  getNodesAtDepth,
  countNodes,
  getMaxDepth,
  yieldToUI,
} from './treeBuilder'

// Prediction cache
export {
  getCachedPrediction,
  cachePrediction,
  clearCache as clearPredictionCache,
  getCacheStats,
} from './predictionCache'
