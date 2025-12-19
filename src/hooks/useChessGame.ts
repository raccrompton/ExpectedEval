/**
 * useChessGame Hook - React State Management for Chess Games
 *
 * This hook provides React state management for chess game navigation.
 * It wraps the pure core/chess functions to provide a React-friendly
 * interface with automatic re-renders when the game state changes.
 *
 * Features:
 * - Load games from PGN text
 * - Navigate through moves (forward, back, to start, to end)
 * - Track current position in the game tree
 * - Compute FEN for the current position
 * - Support for variations
 *
 * Architecture:
 * - This hook is a thin wrapper around core/chess functions
 * - All chess logic lives in core/chess (pure, testable)
 * - This hook just manages React state
 *
 * @example
 * ```tsx
 * function AnalysisPage() {
 *   const { game, currentFen, actions } = useChessGame()
 *
 *   return (
 *     <div>
 *       <PgnInput onLoadPgn={actions.loadPgn} />
 *       <GameBoard fen={currentFen} />
 *       <button onClick={actions.goBack}>Back</button>
 *       <button onClick={actions.goForward}>Forward</button>
 *     </div>
 *   )
 * }
 * ```
 *
 * Dependencies:
 * - React: useState, useMemo, useCallback hooks
 * - @/core/chess: All chess logic functions
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import type { Game, PgnNodeData } from '@/core/chess'
import {
  // Game loading/export
  loadGame,
  exportGame,
  createEmptyGame,
  // Navigation state
  createNavigationState,
  type NavigationState,
  // Navigation functions
  getCurrentFen,
  getCurrentNodeData,
  goForward,
  goBack,
  goToStart,
  goToEnd,
  goToPath,
  goToPly,
  // Query functions
  isAtStart,
  isAtEnd,
  getCurrentPly,
  getTotalMainlinePlies,
  hasVariations,
  getAvailableMoves,
  // Constants
  STARTING_FEN,
} from '@/core/chess'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Return type of the useChessGame hook.
 *
 * Provides the current game state and actions to modify it.
 */
export interface UseChessGameReturn {
  // ---------------------------------------------------------------------------
  // STATE (read-only values that trigger re-renders when changed)
  // ---------------------------------------------------------------------------

  /**
   * The current chess game tree.
   * Null if no game has been loaded.
   */
  game: Game<PgnNodeData> | null

  /**
   * Current position in the game tree (array of indices).
   * Empty array [] means we're at the starting position.
   */
  currentPath: number[]

  /**
   * FEN string for the current position.
   * This is computed from the game + currentPath.
   * Returns STARTING_FEN if no game is loaded.
   */
  currentFen: string

  /**
   * Data for the current node (move, comments, etc.).
   * Null if at starting position or no game loaded.
   */
  currentNodeData: PgnNodeData | null

  /**
   * Current half-move (ply) number.
   * 0 = starting position, 1 = after White's first move, etc.
   */
  currentPly: number

  /**
   * Total number of half-moves in the mainline.
   */
  totalPlies: number

  /**
   * Whether we're at the starting position (no moves played).
   */
  atStart: boolean

  /**
   * Whether we're at the end of the current line.
   */
  atEnd: boolean

  /**
   * Whether the current position has variations (alternative moves).
   */
  hasVariationsAtPosition: boolean

  /**
   * Available moves at current position with their indices.
   * Used for showing variations or continuing the game.
   */
  availableMoves: Array<{ san: string; index: number; isMainline: boolean }>

  /**
   * Error from the last operation, if any.
   * Null if no error.
   */
  error: string | null

  // ---------------------------------------------------------------------------
  // ACTIONS (functions to modify the state)
  // ---------------------------------------------------------------------------

  actions: {
    /**
     * Load a game from PGN text.
     * Replaces any existing game.
     *
     * @param pgn - PGN text to parse
     * @returns true if successful, false if parsing failed
     */
    loadPgn: (pgn: string) => boolean

    /**
     * Reset to an empty game (standard starting position).
     */
    newGame: () => void

    /**
     * Navigate forward one move.
     *
     * @param variationIndex - Which variation to follow (0 = mainline)
     */
    goForward: (variationIndex?: number) => void

    /**
     * Navigate back one move.
     */
    goBack: () => void

    /**
     * Navigate to the starting position.
     */
    goToStart: () => void

    /**
     * Navigate to the end of the mainline.
     */
    goToEnd: () => void

    /**
     * Navigate to a specific path in the game tree.
     *
     * @param path - Target path (array of child indices)
     */
    goToPath: (path: number[]) => void

    /**
     * Navigate to a specific ply (half-move number).
     *
     * @param ply - Target ply (0 = start)
     */
    goToPly: (ply: number) => void

    /**
     * Export the current game to PGN text.
     *
     * @returns PGN string, or empty string if no game loaded
     */
    exportPgn: () => string

    /**
     * Clear any error state.
     */
    clearError: () => void
  }
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * React hook for managing chess game state.
 *
 * Provides game loading, navigation, and state queries.
 * All state changes trigger React re-renders.
 *
 * @param initialPgn - Optional PGN to load on mount
 * @returns Game state and actions
 */
export function useChessGame(initialPgn?: string): UseChessGameReturn {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /**
   * The navigation state combines the game tree and current position.
   * We store the full NavigationState to keep them in sync.
   */
  const [navState, setNavState] = useState<NavigationState | null>(() => {
    // Initialize with PGN if provided
    if (initialPgn) {
      try {
        const game = loadGame(initialPgn)
        // Guard: loadGame returns null if parsing fails
        if (!game) return null
        return createNavigationState(game)
      } catch {
        // If parsing fails, start with no game
        return null
      }
    }
    return null
  })

  /**
   * Error state for user feedback.
   */
  const [error, setError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // DERIVED VALUES (computed from navState, memoized for performance)
  // ---------------------------------------------------------------------------

  /**
   * The game tree (null if no game loaded).
   */
  const game = navState?.game ?? null

  /**
   * Current path through the tree.
   */
  const currentPath = navState?.currentPath ?? []

  /**
   * FEN for the current position.
   * Computed by replaying moves from the start.
   */
  const currentFen = useMemo(() => {
    if (!navState) return STARTING_FEN
    return getCurrentFen(navState)
  }, [navState])

  /**
   * Node data at current position (move, comments, etc.).
   */
  const currentNodeData = useMemo(() => {
    if (!navState) return null
    return getCurrentNodeData(navState)
  }, [navState])

  /**
   * Current ply (half-move) number.
   */
  const currentPly = useMemo(() => {
    if (!navState) return 0
    return getCurrentPly(navState)
  }, [navState])

  /**
   * Total plies in the mainline.
   */
  const totalPlies = useMemo(() => {
    if (!navState) return 0
    return getTotalMainlinePlies(navState)
  }, [navState])

  /**
   * Whether we're at the starting position.
   */
  const atStart = useMemo(() => {
    if (!navState) return true
    return isAtStart(navState)
  }, [navState])

  /**
   * Whether we're at the end of the current line.
   */
  const atEnd = useMemo(() => {
    if (!navState) return true
    return isAtEnd(navState)
  }, [navState])

  /**
   * Whether there are variations at this position.
   */
  const hasVariationsAtPosition = useMemo(() => {
    if (!navState) return false
    return hasVariations(navState)
  }, [navState])

  /**
   * Available moves with their indices.
   */
  const availableMoves = useMemo(() => {
    if (!navState) return []
    return getAvailableMoves(navState)
  }, [navState])

  // ---------------------------------------------------------------------------
  // ACTIONS (wrapped in useCallback for stable references)
  // ---------------------------------------------------------------------------

  /**
   * Load a game from PGN text.
   */
  const handleLoadPgn = useCallback((pgn: string): boolean => {
    try {
      // Parse the PGN into a game tree
      const parsedGame = loadGame(pgn)

      // Guard: loadGame returns null if parsing fails
      if (!parsedGame) {
        setError('Failed to parse PGN: Invalid format')
        return false
      }

      // Create navigation state starting at the beginning
      const newNavState = createNavigationState(parsedGame)

      // Update state
      setNavState(newNavState)
      setError(null)

      return true
    } catch (e) {
      // Handle parsing errors
      const errorMessage = e instanceof Error ? e.message : 'Failed to parse PGN'
      setError(errorMessage)
      return false
    }
  }, [])

  /**
   * Start a new game (empty board at starting position).
   */
  const handleNewGame = useCallback(() => {
    const emptyGame = createEmptyGame()
    setNavState(createNavigationState(emptyGame))
    setError(null)
  }, [])

  /**
   * Navigate forward one move.
   */
  const handleGoForward = useCallback((variationIndex: number = 0) => {
    setNavState((prev) => {
      if (!prev) return prev
      return goForward(prev, variationIndex)
    })
  }, [])

  /**
   * Navigate back one move.
   */
  const handleGoBack = useCallback(() => {
    setNavState((prev) => {
      if (!prev) return prev
      return goBack(prev)
    })
  }, [])

  /**
   * Navigate to the starting position.
   */
  const handleGoToStart = useCallback(() => {
    setNavState((prev) => {
      if (!prev) return prev
      return goToStart(prev)
    })
  }, [])

  /**
   * Navigate to the end of the mainline.
   */
  const handleGoToEnd = useCallback(() => {
    setNavState((prev) => {
      if (!prev) return prev
      return goToEnd(prev)
    })
  }, [])

  /**
   * Navigate to a specific path.
   */
  const handleGoToPath = useCallback((path: number[]) => {
    setNavState((prev) => {
      if (!prev) return prev
      return goToPath(prev, path)
    })
  }, [])

  /**
   * Navigate to a specific ply.
   */
  const handleGoToPly = useCallback((ply: number) => {
    setNavState((prev) => {
      if (!prev) return prev
      return goToPly(prev, ply)
    })
  }, [])

  /**
   * Export the game to PGN.
   */
  const handleExportPgn = useCallback((): string => {
    if (!navState?.game) return ''
    return exportGame(navState.game)
  }, [navState])

  /**
   * Clear error state.
   */
  const handleClearError = useCallback(() => {
    setError(null)
  }, [])

  // ---------------------------------------------------------------------------
  // RETURN VALUE
  // ---------------------------------------------------------------------------

  /**
   * Bundle actions into a stable object.
   * useMemo ensures the object reference doesn't change between renders.
   */
  const actions = useMemo(
    () => ({
      loadPgn: handleLoadPgn,
      newGame: handleNewGame,
      goForward: handleGoForward,
      goBack: handleGoBack,
      goToStart: handleGoToStart,
      goToEnd: handleGoToEnd,
      goToPath: handleGoToPath,
      goToPly: handleGoToPly,
      exportPgn: handleExportPgn,
      clearError: handleClearError,
    }),
    [
      handleLoadPgn,
      handleNewGame,
      handleGoForward,
      handleGoBack,
      handleGoToStart,
      handleGoToEnd,
      handleGoToPath,
      handleGoToPly,
      handleExportPgn,
      handleClearError,
    ]
  )

  return {
    // State
    game,
    currentPath,
    currentFen,
    currentNodeData,
    currentPly,
    totalPlies,
    atStart,
    atEnd,
    hasVariationsAtPosition,
    availableMoves,
    error,
    // Actions
    actions,
  }
}
