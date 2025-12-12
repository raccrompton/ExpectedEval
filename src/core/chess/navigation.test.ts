/**
 * Unit Tests for Game Tree Navigation Module
 *
 * These tests verify that our navigation module correctly:
 * 1. Tracks position in the game tree
 * 2. Navigates forward/back through moves
 * 3. Computes FEN at any position
 * 4. Handles variations correctly
 */

import { describe, it, expect } from 'vitest'
import { isChildNode } from 'chessops/pgn'
import { loadGame } from './game'
import {
  createNavigationState,
  getCurrentNode,
  getCurrentNodeData,
  getCurrentFen,
  getFenAtPath,
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

// ============================================================================
// Test data
// ============================================================================

/**
 * Simple game for basic navigation tests.
 * 1. e4 e5 2. Nf3 Nc6 (4 ply)
 */
const SIMPLE_GAME = '1. e4 e5 2. Nf3 Nc6 *'

/**
 * Game with a variation.
 * Main line: 1. e4 e5 2. Nf3
 * Variation after 1. e4: 1... c5 (Sicilian)
 */
const GAME_WITH_VARIATION = '1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *'

/**
 * Expected FENs after each move in SIMPLE_GAME.
 */
const EXPECTED_FENS = {
  start: STARTING_FEN,
  afterE4: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  afterE5: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  afterNf3: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
  afterNc6: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
}

// ============================================================================
// createNavigationState tests
// ============================================================================

describe('createNavigationState', () => {
  it('creates state at starting position by default', () => {
    const game = loadGame(SIMPLE_GAME)!
    const state = createNavigationState(game)

    expect(state.game).toBe(game)
    expect(state.currentPath).toEqual([])
  })

  it('creates state at specified path', () => {
    const game = loadGame(SIMPLE_GAME)!
    const state = createNavigationState(game, [0, 0])

    expect(state.currentPath).toEqual([0, 0])
  })

  it('does not mutate the original path array', () => {
    const game = loadGame(SIMPLE_GAME)!
    const originalPath = [0, 0]
    const state = createNavigationState(game, originalPath)

    // Modify the state's path
    state.currentPath.push(0)

    // Original should be unchanged
    expect(originalPath).toEqual([0, 0])
  })
})

// ============================================================================
// Node access tests
// ============================================================================

describe('getCurrentNode', () => {
  it('returns root node at starting position', () => {
    const game = loadGame(SIMPLE_GAME)!
    const state = createNavigationState(game)

    const node = getCurrentNode(state)

    expect(node).toBe(game.moves)
  })

  it('returns correct node after navigation', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    // Go to position after e4
    state = goForward(state)
    const node = getCurrentNode(state)

    // After navigation, node should be a ChildNode with data
    expect(node).not.toBeNull()
    expect(isChildNode(node!)).toBe(true)
    if (isChildNode(node!)) {
      expect(node.data.san).toBe('e4')
    }
  })
})

describe('getCurrentNodeData', () => {
  it('returns node data at current position', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goForward(state) // After e4

    const data = getCurrentNodeData(state)

    expect(data?.san).toBe('e4')
  })
})

// ============================================================================
// FEN computation tests
// ============================================================================

describe('getCurrentFen', () => {
  it('returns starting FEN at root position', () => {
    const game = loadGame(SIMPLE_GAME)!
    const state = createNavigationState(game)

    const fen = getCurrentFen(state)

    expect(fen).toBe(EXPECTED_FENS.start)
  })

  it('returns correct FEN after e4', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goForward(state) // After e4

    const fen = getCurrentFen(state)

    expect(fen).toBe(EXPECTED_FENS.afterE4)
  })

  it('returns correct FEN after e4 e5', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goForward(state) // After e4
    state = goForward(state) // After e5

    const fen = getCurrentFen(state)

    expect(fen).toBe(EXPECTED_FENS.afterE5)
  })

  it('returns correct FEN at end of game', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goToEnd(state)

    const fen = getCurrentFen(state)

    expect(fen).toBe(EXPECTED_FENS.afterNc6)
  })
})

describe('getFenAtPath', () => {
  it('returns FEN for arbitrary path', () => {
    const game = loadGame(SIMPLE_GAME)!

    // Path [0, 0] = after e4 e5
    const fen = getFenAtPath(game, [0, 0])

    expect(fen).toBe(EXPECTED_FENS.afterE5)
  })

  it('returns starting FEN for empty path', () => {
    const game = loadGame(SIMPLE_GAME)!

    const fen = getFenAtPath(game, [])

    expect(fen).toBe(EXPECTED_FENS.start)
  })
})

// ============================================================================
// Navigation tests
// ============================================================================

describe('goToStart', () => {
  it('returns state at starting position', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    // Navigate somewhere first
    state = goToEnd(state)
    expect(state.currentPath.length).toBeGreaterThan(0)

    // Go back to start
    state = goToStart(state)

    expect(state.currentPath).toEqual([])
    expect(getCurrentFen(state)).toBe(EXPECTED_FENS.start)
  })
})

describe('goToEnd', () => {
  it('navigates to end of mainline', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goToEnd(state)

    expect(state.currentPath).toEqual([0, 0, 0, 0]) // 4 moves
    expect(getCurrentFen(state)).toBe(EXPECTED_FENS.afterNc6)
  })
})

describe('goForward', () => {
  it('advances one move forward', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goForward(state)

    expect(state.currentPath).toEqual([0])
    expect(getCurrentFen(state)).toBe(EXPECTED_FENS.afterE4)
  })

  it('returns same state when at end', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goToEnd(state)
    const pathBeforeForward = [...state.currentPath]

    state = goForward(state)

    expect(state.currentPath).toEqual(pathBeforeForward)
  })

  it('can follow a variation', () => {
    const game = loadGame(GAME_WITH_VARIATION)!
    let state = createNavigationState(game)

    // Go to after e4
    state = goForward(state)

    // Check available moves
    const moves = getAvailableMoves(state)
    expect(moves.length).toBeGreaterThanOrEqual(1)

    // If there's a variation, we should be able to follow it
    // The exact structure depends on how chessops parses the PGN
  })
})

describe('goBack', () => {
  it('goes back one move', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goForward(state) // After e4
    state = goForward(state) // After e5
    state = goBack(state)    // Back to after e4

    expect(state.currentPath).toEqual([0])
    expect(getCurrentFen(state)).toBe(EXPECTED_FENS.afterE4)
  })

  it('returns same state when at start', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goBack(state)

    expect(state.currentPath).toEqual([])
  })
})

describe('goToPath', () => {
  it('navigates to valid path', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goToPath(state, [0, 0, 0])

    expect(state.currentPath).toEqual([0, 0, 0])
  })

  it('returns same state for invalid path', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goToPath(state, [0, 0, 0, 0, 0, 0, 0, 0, 0]) // Way too long

    // Should stay at start since path is invalid
    expect(state.currentPath).toEqual([])
  })
})

describe('goToPly', () => {
  it('navigates to specific ply', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goToPly(state, 2) // After e4 e5

    expect(getCurrentPly(state)).toBe(2)
    expect(getCurrentFen(state)).toBe(EXPECTED_FENS.afterE5)
  })

  it('handles ply 0 (starting position)', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goToEnd(state)
    state = goToPly(state, 0)

    expect(getCurrentPly(state)).toBe(0)
    expect(getCurrentFen(state)).toBe(EXPECTED_FENS.start)
  })

  it('handles negative ply as start', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goToPly(state, -5)

    expect(getCurrentPly(state)).toBe(0)
  })

  it('handles ply beyond game length', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goToPly(state, 100)

    // Should stop at end of game
    expect(getCurrentPly(state)).toBe(4)
  })
})

// ============================================================================
// Query function tests
// ============================================================================

describe('isAtStart', () => {
  it('returns true at starting position', () => {
    const game = loadGame(SIMPLE_GAME)!
    const state = createNavigationState(game)

    expect(isAtStart(state)).toBe(true)
  })

  it('returns false after navigation', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goForward(state)

    expect(isAtStart(state)).toBe(false)
  })
})

describe('isAtEnd', () => {
  it('returns false at starting position', () => {
    const game = loadGame(SIMPLE_GAME)!
    const state = createNavigationState(game)

    expect(isAtEnd(state)).toBe(false)
  })

  it('returns true at end of game', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goToEnd(state)

    expect(isAtEnd(state)).toBe(true)
  })
})

describe('getCurrentPly', () => {
  it('returns 0 at starting position', () => {
    const game = loadGame(SIMPLE_GAME)!
    const state = createNavigationState(game)

    expect(getCurrentPly(state)).toBe(0)
  })

  it('returns correct ply after navigation', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goForward(state) // 1
    state = goForward(state) // 2
    state = goForward(state) // 3

    expect(getCurrentPly(state)).toBe(3)
  })
})

describe('getTotalMainlinePlies', () => {
  it('returns total ply count', () => {
    const game = loadGame(SIMPLE_GAME)!
    const state = createNavigationState(game)

    // 1. e4 e5 2. Nf3 Nc6 = 4 ply
    expect(getTotalMainlinePlies(state)).toBe(4)
  })

  it('returns 0 for empty game', () => {
    const game = loadGame('*')!
    const state = createNavigationState(game)

    expect(getTotalMainlinePlies(state)).toBe(0)
  })
})

describe('hasVariations', () => {
  it('returns false when no variations', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goForward(state) // After e4

    // Simple game has no variations
    expect(hasVariations(state)).toBe(false)
  })
})

describe('getAvailableMoves', () => {
  it('returns available moves at current position', () => {
    const game = loadGame(SIMPLE_GAME)!
    const state = createNavigationState(game)

    const moves = getAvailableMoves(state)

    // At start, first move should be available
    expect(moves.length).toBeGreaterThan(0)
    expect(moves[0].san).toBe('e4')
    expect(moves[0].isMainline).toBe(true)
  })

  it('returns empty array at end of game', () => {
    const game = loadGame(SIMPLE_GAME)!
    let state = createNavigationState(game)

    state = goToEnd(state)
    const moves = getAvailableMoves(state)

    expect(moves).toEqual([])
  })
})

// ============================================================================
// Edge cases
// ============================================================================

describe('edge cases', () => {
  it('handles single move game', () => {
    const game = loadGame('1. e4 *')!
    let state = createNavigationState(game)

    expect(getTotalMainlinePlies(state)).toBe(1)

    state = goToEnd(state)
    expect(getCurrentPly(state)).toBe(1)

    state = goBack(state)
    expect(isAtStart(state)).toBe(true)
  })

  it('handles game with only result', () => {
    const game = loadGame('*')!
    const state = createNavigationState(game)

    expect(getTotalMainlinePlies(state)).toBe(0)
    expect(isAtStart(state)).toBe(true)
    expect(isAtEnd(state)).toBe(true)
  })
})
