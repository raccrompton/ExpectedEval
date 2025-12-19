/**
 * Hooks Module - Public API
 *
 * This file exports all custom React hooks used by the application.
 *
 * @example
 * import { useChessGame, useExpectedWinrate } from '@/hooks'
 */

export { useChessGame } from './useChessGame'
export type { UseChessGameReturn } from './useChessGame'

export { useExpectedWinrate } from './useExpectedWinrate'
export type {
  UseExpectedWinrateReturn,
  EWProgressState,
} from './useExpectedWinrate'
