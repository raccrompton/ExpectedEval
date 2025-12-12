/**
 * Chess Module - Public API
 *
 * This file exports all the public functions and types from the
 * chess module. Import from here instead of individual files.
 *
 * @example
 * import { loadGame, getCurrentFen, parseAnnotations } from '@/core/chess'
 */

// Types
export * from './types'

// Annotations
export {
  parseAnnotations,
  parseAnnotationsFromComments,
  serializeAnnotations,
  stripAnnotations,
} from './annotations'

// Game operations
export {
  loadGame,
  loadAllGames,
  exportGame,
  createEmptyGame,
  addEWVariations,
  getVariationCount,
  getChildren,
  getMainline,
  getVariation,
  getHeader,
  setHeader,
  getResult,
  isGameComplete,
} from './game'

// Navigation
export {
  createNavigationState,
  getCurrentNode,
  getCurrentNodeData,
  getCurrentFen,
  getFenAtPath,
  getNodeAtPath,
  goToStart,
  goToEnd,
  goForward,
  goBack,
  goToPath,
  goToPly,
  isAtStart,
  isAtEnd,
  getCurrentPly,
  getTotalMainlinePlies,
  hasVariations,
  getAvailableMoves,
  STARTING_FEN,
} from './navigation'

// Re-export navigation state type
export type { NavigationState } from './navigation'
