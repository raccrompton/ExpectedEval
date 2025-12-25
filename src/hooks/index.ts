/**
 * Hooks Module
 *
 * React hooks that wrap core logic for use in components.
 * Each hook provides a React-friendly interface to the pure
 * functions in src/core.
 */

export { useChessGame } from './useChessGame'
export type { UseChessGameReturn, MainlineMove } from './useChessGame'

export { useExpectedWinrate } from './useExpectedWinrate'
export type { UseExpectedWinrateReturn, EWStatus } from './useExpectedWinrate'

export { useSettings } from './useSettings'
export type { UseSettingsReturn, SettingsState } from './useSettings'
