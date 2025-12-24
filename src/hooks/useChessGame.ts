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
import type { Game, PgnNodeData, Node } from 'chessops/pgn'
import { isChildNode, ChildNode } from 'chessops/pgn'
import { Chess } from 'chessops/chess'
import { parseFen } from 'chessops/fen'
import { makeSan } from 'chessops/san'
import { parseSquare } from 'chessops/util'
import { loadGame, createEmptyGame } from '@/core/chess/game'
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
  getFenAtPath,
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
  | { type: 'MAKE_MOVE'; from: string; to: string; promotion?: string }

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

    case 'MAKE_MOVE': {
      // Get or create game
      const game = state.game ?? createEmptyGame()

      // Get current FEN
      const currentFen = getFenAtPath(game, state.currentPath)

      // Parse position and validate move using chessops
      const setup = parseFen(currentFen)
      if (!setup.isOk) return state

      const pos = Chess.fromSetup(setup.value)
      if (!pos.isOk) return state

      // Parse the move squares
      const from = parseSquare(action.from)
      const to = parseSquare(action.to)
      if (from === undefined || to === undefined) return state

      // Create move object
      const move = {
        from,
        to,
        promotion: action.promotion as 'queen' | 'rook' | 'bishop' | 'knight' | undefined,
      }

      // Check if legal
      if (!pos.value.isLegal(move)) return state

      // Get SAN notation
      const san = makeSan(pos.value, move)

      // Navigate to current node and add move
      let node: Node<PgnNodeData> = game.moves
      for (const index of state.currentPath) {
        if (index >= 0 && index < node.children.length) {
          node = node.children[index]
        }
      }

      // Check if move already exists
      const existingIndex = node.children.findIndex((c) => c.data.san === san)
      if (existingIndex !== -1) {
        // Navigate to existing move - always create new reference for React
        return {
          game: { ...game },
          currentPath: [...state.currentPath, existingIndex],
        }
      }

      // Add new move
      const newNode = new ChildNode<PgnNodeData>({ san })
      node.children.push(newNode)
      const newIndex = node.children.length - 1

      // Return new game reference so React detects the change
      return {
        game: { ...game },
        currentPath: [...state.currentPath, newIndex],
      }
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

    /** Make a move on the board (from square to square) */
    makeMove: (from: string, to: string, promotion?: string) => void
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

  const makeMove = useCallback(
    (from: string, to: string, promotion?: string) =>
      dispatch({ type: 'MAKE_MOVE', from, to, promotion }),
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
      makeMove,
    }),
    [loadPgn, goForward, goBack, goToStart, goToEnd, goToPath, goToPly, makeMove]
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
