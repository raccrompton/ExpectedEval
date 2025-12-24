/**
 * useChessGame Hook
 *
 * React hook for managing chess game state. This wraps the core chess
 * modules (game.ts and navigation.ts) to provide a React-friendly interface.
 *
 * Uses useReducer for atomic state updates - game and currentPath always
 * change together, preventing inconsistent states.
 *
 * Key responsibilities:
 * - Load PGN into a game tree
 * - Track current position in the tree (path-based navigation)
 * - Compute derived state (FEN, current move, ply number)
 * - Provide navigation actions (forward, back, to start, to end, to path)
 *
 * State Ownership:
 * - game: The chessops Game tree (source of truth for moves)
 * - currentPath: Array of indices tracking position in tree
 * - currentFen: Derived from game + path (never stored independently)
 */

import { useReducer, useCallback, useMemo } from 'react'
import type { Game, PgnNodeData } from 'chessops/pgn'
import { isChildNode } from 'chessops/pgn'
import { loadGame } from '@/core/chess/game'
import {
  createNavigationState,
  getCurrentFen,
  getCurrentNodeData,
  goToStart as navGoToStart,
  goToEnd as navGoToEnd,
  goForward as navGoForward,
  goBack as navGoBack,
  goToPath as navGoToPath,
  goToPly as navGoToPly,
  isAtStart as navIsAtStart,
  isAtEnd as navIsAtEnd,
  STARTING_FEN,
} from '@/core/chess/navigation'

// ============================================================================
// STATE & ACTION TYPES
// ============================================================================

/**
 * Combined state for game and navigation.
 * These always change together, so we manage them atomically.
 */
interface GameState {
  game: Game<PgnNodeData> | null
  currentPath: number[]
}

/**
 * All possible state transitions.
 */
type GameAction =
  | { type: 'LOAD_PGN'; game: Game<PgnNodeData>; endPath: number[] }
  | { type: 'RESET' }
  | { type: 'GO_FORWARD' }
  | { type: 'GO_BACK' }
  | { type: 'GO_TO_START' }
  | { type: 'GO_TO_END' }
  | { type: 'GO_TO_PATH'; path: number[] }
  | { type: 'GO_TO_PLY'; ply: number }

const initialState: GameState = {
  game: null,
  currentPath: [],
}

// ============================================================================
// REDUCER
// ============================================================================

/**
 * Pure reducer function for game state transitions.
 * All navigation logic is delegated to core/chess/navigation.ts
 */
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'LOAD_PGN':
      return {
        game: action.game,
        currentPath: action.endPath,
      }

    case 'RESET':
      return initialState

    case 'GO_FORWARD': {
      if (!state.game) return state
      const navState = createNavigationState(state.game, state.currentPath)
      const newState = navGoForward(navState)
      return { ...state, currentPath: newState.currentPath }
    }

    case 'GO_BACK': {
      if (!state.game) return state
      const navState = createNavigationState(state.game, state.currentPath)
      const newState = navGoBack(navState)
      return { ...state, currentPath: newState.currentPath }
    }

    case 'GO_TO_START': {
      if (!state.game) return state
      const navState = createNavigationState(state.game, state.currentPath)
      const newState = navGoToStart(navState)
      return { ...state, currentPath: newState.currentPath }
    }

    case 'GO_TO_END': {
      if (!state.game) return state
      const navState = createNavigationState(state.game, state.currentPath)
      const newState = navGoToEnd(navState)
      return { ...state, currentPath: newState.currentPath }
    }

    case 'GO_TO_PATH': {
      if (!state.game) return state
      const navState = createNavigationState(state.game, state.currentPath)
      const newState = navGoToPath(navState, action.path)
      return { ...state, currentPath: newState.currentPath }
    }

    case 'GO_TO_PLY': {
      if (!state.game) return state
      const navState = createNavigationState(state.game, state.currentPath)
      const newState = navGoToPly(navState, action.ply)
      return { ...state, currentPath: newState.currentPath }
    }

    default:
      return state
  }
}

// ============================================================================
// PUBLIC TYPES
// ============================================================================

/**
 * Mainline move with path information for rendering
 */
export interface MainlineMove {
  san: string
  path: number[]
  ply: number
}

/**
 * Return type for useChessGame hook
 */
export interface UseChessGameReturn {
  /** The loaded game tree (null if no game loaded) */
  game: Game<PgnNodeData> | null

  /** Current path through the game tree */
  currentPath: number[]

  /** FEN string for the current position */
  currentFen: string

  /** Data for the current node (move, comments, etc.) */
  currentNode: PgnNodeData | null

  /** Current ply (half-move) number */
  currentPly: number

  /** True if at starting position */
  isAtStart: boolean

  /** True if at end of current line */
  isAtEnd: boolean

  /** All mainline moves with path info for rendering */
  mainlineMoves: MainlineMove[]

  /** Navigation and game management actions */
  actions: {
    /** Load a PGN string and navigate to the end */
    loadPgn: (pgn: string) => void

    /** Go forward one move (mainline) */
    goForward: () => void

    /** Go back one move */
    goBack: () => void

    /** Go to starting position */
    goToStart: () => void

    /** Go to end of mainline */
    goToEnd: () => void

    /** Go to a specific path */
    goToPath: (path: number[]) => void

    /** Go to a specific ply number (follows mainline) */
    goToPly: (ply: number) => void
  }
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing chess game state and navigation.
 *
 * @example
 * function GameViewer() {
 *   const { currentFen, actions, mainlineMoves } = useChessGame()
 *
 *   return (
 *     <>
 *       <GameBoard fen={currentFen} />
 *       <MoveList moves={mainlineMoves} onMoveClick={actions.goToPath} />
 *       <button onClick={() => actions.loadPgn('1. e4 e5')}>Load</button>
 *     </>
 *   )
 * }
 */
export function useChessGame(): UseChessGameReturn {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const { game, currentPath } = state

  // Action creators
  const loadPgn = useCallback((pgn: string) => {
    const loadedGame = loadGame(pgn)

    if (!loadedGame) {
      dispatch({ type: 'RESET' })
      return
    }

    // Calculate end path for the loaded game
    const navState = createNavigationState(loadedGame)
    const endState = navGoToEnd(navState)

    dispatch({
      type: 'LOAD_PGN',
      game: loadedGame,
      endPath: endState.currentPath,
    })
  }, [])

  const goForward = useCallback(() => dispatch({ type: 'GO_FORWARD' }), [])
  const goBack = useCallback(() => dispatch({ type: 'GO_BACK' }), [])
  const goToStart = useCallback(() => dispatch({ type: 'GO_TO_START' }), [])
  const goToEnd = useCallback(() => dispatch({ type: 'GO_TO_END' }), [])

  const goToPath = useCallback(
    (path: number[]) => dispatch({ type: 'GO_TO_PATH', path }),
    []
  )

  const goToPly = useCallback(
    (ply: number) => dispatch({ type: 'GO_TO_PLY', ply }),
    []
  )

  // Derived state
  const currentFen = useMemo(() => {
    if (!game) return STARTING_FEN
    const navState = { game, currentPath }
    return getCurrentFen(navState)
  }, [game, currentPath])

  const currentNode = useMemo(() => {
    if (!game) return null
    const navState = { game, currentPath }
    return getCurrentNodeData(navState)
  }, [game, currentPath])

  const currentPly = useMemo(() => currentPath.length, [currentPath])

  const isAtStart = useMemo(() => {
    if (!game) return true
    const navState = { game, currentPath }
    return navIsAtStart(navState)
  }, [game, currentPath])

  const isAtEnd = useMemo(() => {
    if (!game) return true
    const navState = { game, currentPath }
    return navIsAtEnd(navState)
  }, [game, currentPath])

  /**
   * Get all mainline moves for rendering in MoveList.
   */
  const mainlineMoves = useMemo((): MainlineMove[] => {
    if (!game) return []

    const moves: MainlineMove[] = []
    let node = game.moves
    const path: number[] = []

    while (node.children.length > 0) {
      const child = node.children[0]
      path.push(0)

      if (isChildNode(child) && child.data.san) {
        moves.push({
          san: child.data.san,
          path: [...path],
          ply: path.length,
        })
      }

      node = child
    }

    return moves
  }, [game])

  // Bundle actions (stable reference)
  const actions = useMemo(
    () => ({
      loadPgn,
      goForward,
      goBack,
      goToStart,
      goToEnd,
      goToPath,
      goToPly,
    }),
    [loadPgn, goForward, goBack, goToStart, goToEnd, goToPath, goToPly]
  )

  return {
    game,
    currentPath,
    currentFen,
    currentNode,
    currentPly,
    isAtStart,
    isAtEnd,
    mainlineMoves,
    actions,
  }
}
