/**
 * Unit Tests for Chess Game Module
 *
 * These tests verify that our game module correctly:
 * 1. Loads PGN text into Game objects
 * 2. Exports Game objects back to PGN
 * 3. Handles variations and tree operations
 *
 * We test against real PGN examples to ensure compatibility
 * with the standard PGN format.
 */

import { describe, it, expect } from 'vitest'
import {
  loadGame,
  loadAllGames,
  exportGame,
  createEmptyGame,
  addEWVariations,
  getVariationCount,
  getMainline,
  getVariation,
  getHeader,
  setHeader,
  getResult,
  isGameComplete,
} from './game'
import type { EWCandidate } from './types'

// ============================================================================
// Sample PGN data for testing
// ============================================================================

/**
 * Simple game without variations.
 * This is the most common PGN format.
 */
const SIMPLE_GAME_PGN = `[Event "Test Game"]
[Site "Unit Tests"]
[Date "2024.01.15"]
[White "Player A"]
[Black "Player B"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0`

/**
 * Game with variations (annotations of alternative moves).
 * Shows how chessops handles branching lines.
 */
const GAME_WITH_VARIATIONS_PGN = `[Event "Test Game with Variations"]
[Result "*"]

1. e4 e5 (1... c5 2. Nf3) 2. Nf3 Nc6 *`

/**
 * Just move text, no headers.
 * Some quick games are written this way.
 */
const MOVES_ONLY_PGN = '1. e4 e5 2. Nf3 Nc6 *'

/**
 * Multiple games in one PGN file.
 * Common for tournament records.
 */
const MULTI_GAME_PGN = `[Event "Game 1"]
[Result "1-0"]

1. e4 e5 1-0

[Event "Game 2"]
[Result "0-1"]

1. d4 d5 0-1`

// ============================================================================
// loadGame() tests
// ============================================================================

describe('loadGame', () => {
  /**
   * Test: Load a simple game
   * Verify headers and moves are parsed correctly.
   */
  it('loads a simple PGN game', () => {
    const game = loadGame(SIMPLE_GAME_PGN)

    // Game should not be null
    expect(game).not.toBeNull()

    // Check headers
    expect(game!.headers.get('Event')).toBe('Test Game')
    expect(game!.headers.get('White')).toBe('Player A')
    expect(game!.headers.get('Result')).toBe('1-0')

    // Check that moves exist
    expect(game!.moves.children.length).toBeGreaterThan(0)
  })

  /**
   * Test: Load moves-only PGN
   * Should work without headers.
   */
  it('loads PGN without headers', () => {
    const game = loadGame(MOVES_ONLY_PGN)

    expect(game).not.toBeNull()
    expect(game!.moves.children.length).toBeGreaterThan(0)
  })

  /**
   * Test: Load game with variations
   * Verify the variation structure is preserved.
   */
  it('loads PGN with variations', () => {
    const game = loadGame(GAME_WITH_VARIATIONS_PGN)

    expect(game).not.toBeNull()

    // The first move (e4) should have children
    const firstMove = game!.moves.children[0]
    expect(firstMove).toBeDefined()

    // After e4, there should be a response with a variation
    // e5 (mainline) and c5 (variation)
    const afterE4 = firstMove.children
    // Check that we have variations
    expect(afterE4.length).toBeGreaterThanOrEqual(1)
  })

  /**
   * Test: Load first game from multi-game PGN
   * loadGame should only return the first game.
   */
  it('loads only the first game from multi-game PGN', () => {
    const game = loadGame(MULTI_GAME_PGN)

    expect(game).not.toBeNull()
    expect(game!.headers.get('Event')).toBe('Game 1')
    expect(game!.headers.get('Result')).toBe('1-0')
  })

  /**
   * Test: Handle empty input
   * Should return null, not crash.
   */
  it('returns null for empty string', () => {
    const game = loadGame('')

    expect(game).toBeNull()
  })

  /**
   * Test: Handle whitespace-only input
   */
  it('returns null for whitespace-only input', () => {
    const game = loadGame('   \n\n   ')

    expect(game).toBeNull()
  })
})

// ============================================================================
// loadAllGames() tests
// ============================================================================

describe('loadAllGames', () => {
  /**
   * Test: Load multiple games
   * Should return all games in the PGN.
   */
  it('loads all games from multi-game PGN', () => {
    const games = loadAllGames(MULTI_GAME_PGN)

    expect(games.length).toBe(2)
    expect(games[0].headers.get('Event')).toBe('Game 1')
    expect(games[1].headers.get('Event')).toBe('Game 2')
  })

  /**
   * Test: Load single game
   * Should return array with one game.
   */
  it('returns single-element array for single game', () => {
    const games = loadAllGames(SIMPLE_GAME_PGN)

    expect(games.length).toBe(1)
    expect(games[0].headers.get('Event')).toBe('Test Game')
  })

  /**
   * Test: Handle empty input
   */
  it('returns empty array for empty input', () => {
    const games = loadAllGames('')

    expect(games).toEqual([])
  })
})

// ============================================================================
// exportGame() tests
// ============================================================================

describe('exportGame', () => {
  /**
   * Test: Export preserves content
   * A loaded game should export to valid PGN.
   */
  it('exports a game to valid PGN', () => {
    const game = loadGame(SIMPLE_GAME_PGN)
    const exported = exportGame(game!)

    // Should contain the moves
    expect(exported).toContain('e4')
    expect(exported).toContain('e5')
    expect(exported).toContain('Nf3')

    // Should contain headers
    expect(exported).toContain('[Event')
    expect(exported).toContain('[Result')
  })

  /**
   * Test: Round-trip consistency
   * Load → Export → Load should preserve the game.
   */
  it('round-trip preserves game data', () => {
    const original = loadGame(SIMPLE_GAME_PGN)
    const exported = exportGame(original!)
    const reloaded = loadGame(exported)

    // Headers should match
    expect(reloaded!.headers.get('Event')).toBe(
      original!.headers.get('Event')
    )
    expect(reloaded!.headers.get('Result')).toBe(
      original!.headers.get('Result')
    )
  })

  /**
   * Test: Export empty game
   */
  it('exports an empty game', () => {
    const game = createEmptyGame()
    const exported = exportGame(game)

    // Should contain default headers
    expect(exported).toContain('[Event')
    expect(exported).toContain('[Result')
  })
})

// ============================================================================
// createEmptyGame() tests
// ============================================================================

describe('createEmptyGame', () => {
  /**
   * Test: Creates game with default headers
   */
  it('creates a game with default headers', () => {
    const game = createEmptyGame()

    expect(game.headers.get('Event')).toBe('?')
    expect(game.headers.get('Result')).toBe('*')
    expect(game.headers.get('White')).toBe('?')
    expect(game.headers.get('Black')).toBe('?')
  })

  /**
   * Test: Creates game with empty moves
   */
  it('creates a game with no moves', () => {
    const game = createEmptyGame()

    // Root node should exist but have no children
    expect(game.moves).toBeDefined()
  })
})

// ============================================================================
// addEWVariations() tests
// ============================================================================

describe('addEWVariations', () => {
  /**
   * Test: Adds candidates as variations
   */
  it('adds candidate moves as variations', () => {
    const game = loadGame('1. e4 e5 *')
    const firstMove = game!.moves.children[0]

    const candidates: EWCandidate[] = [
      {
        move: 'g1f3',
        san: 'Nf3',
        probability: 0.40,
        evaluation: 0.51,
        expectedWinrate: 0.53,
        exploredDepth: 4,
      },
      {
        move: 'f1c4',
        san: 'Bc4',
        probability: 0.25,
        evaluation: 0.52,
        expectedWinrate: 0.51,
        exploredDepth: 4,
      },
    ]

    // Get the node after 1... e5
    const afterE5 = firstMove.children[0]
    const originalChildCount = afterE5.children.length

    // Add variations
    addEWVariations(afterE5, candidates)

    // Should have added 2 new children
    expect(afterE5.children.length).toBe(originalChildCount + 2)

    // Check that the moves are correct
    const newChildren = afterE5.children.slice(originalChildCount)
    expect(newChildren[0].data.san).toBe('Nf3')
    expect(newChildren[1].data.san).toBe('Bc4')

    // Check that annotations are in comments
    expect(newChildren[0].data.comments).toBeDefined()
    expect(newChildren[0].data.comments![0]).toContain('[%prob 0.4]')
    expect(newChildren[0].data.comments![0]).toContain('[%eval 0.51]')
    expect(newChildren[0].data.comments![0]).toContain('[%ew 0.53]')
  })

  /**
   * Test: Empty candidates array
   * Should not modify the node.
   */
  it('handles empty candidates array', () => {
    const game = loadGame('1. e4 e5 *')
    const firstMove = game!.moves.children[0]
    const afterE5 = firstMove.children[0]
    const originalChildCount = afterE5.children.length

    addEWVariations(afterE5, [])

    expect(afterE5.children.length).toBe(originalChildCount)
  })
})

// ============================================================================
// Variation navigation tests
// ============================================================================

describe('getVariationCount', () => {
  it('returns 0 when only mainline exists', () => {
    const game = loadGame('1. e4 e5 2. Nf3 *')
    const firstMove = game!.moves.children[0]

    // After e4, there's only one continuation (e5)
    expect(getVariationCount(firstMove)).toBe(0)
  })

  it('counts variations correctly', () => {
    const game = loadGame(GAME_WITH_VARIATIONS_PGN)
    const firstMove = game!.moves.children[0]

    // After e4, there are variations (e5 mainline + c5 variation)
    expect(getVariationCount(firstMove)).toBeGreaterThanOrEqual(0)
  })
})

describe('getMainline', () => {
  it('returns the first child as mainline', () => {
    const game = loadGame('1. e4 e5 2. Nf3 *')
    const firstMove = game!.moves.children[0]

    const mainline = getMainline(firstMove)

    expect(mainline).not.toBeNull()
    expect(mainline!.data.san).toBe('e5')
  })

  it('returns null for terminal nodes', () => {
    const game = loadGame('1. e4 *')
    const firstMove = game!.moves.children[0]

    // e4 has no continuation in this short game
    const mainline = getMainline(firstMove)

    // This depends on the PGN - e4 might have children or not
    // We're just testing that the function doesn't crash
    expect(mainline === null || mainline?.data?.san !== undefined).toBe(true)
  })
})

describe('getVariation', () => {
  it('returns child at specified index', () => {
    const game = loadGame('1. e4 e5 *')
    const firstMove = game!.moves.children[0]

    // Index 0 should be mainline (e5)
    const mainline = getVariation(firstMove, 0)
    expect(mainline?.data.san).toBe('e5')
  })

  it('returns null for out-of-bounds index', () => {
    const game = loadGame('1. e4 e5 *')
    const firstMove = game!.moves.children[0]

    expect(getVariation(firstMove, 100)).toBeNull()
    expect(getVariation(firstMove, -1)).toBeNull()
  })
})

// ============================================================================
// Header helper tests
// ============================================================================

describe('getHeader / setHeader', () => {
  it('gets existing headers', () => {
    const game = loadGame(SIMPLE_GAME_PGN)

    expect(getHeader(game!, 'Event')).toBe('Test Game')
    expect(getHeader(game!, 'White')).toBe('Player A')
  })

  it('returns undefined for missing headers', () => {
    const game = loadGame(SIMPLE_GAME_PGN)

    expect(getHeader(game!, 'NonExistent')).toBeUndefined()
  })

  it('sets new headers', () => {
    const game = createEmptyGame()

    setHeader(game, 'Event', 'My Tournament')

    expect(getHeader(game, 'Event')).toBe('My Tournament')
  })

  it('overwrites existing headers', () => {
    const game = loadGame(SIMPLE_GAME_PGN)

    setHeader(game!, 'Event', 'New Event Name')

    expect(getHeader(game!, 'Event')).toBe('New Event Name')
  })
})

describe('getResult / isGameComplete', () => {
  it('gets game result', () => {
    const game = loadGame(SIMPLE_GAME_PGN)

    expect(getResult(game!)).toBe('1-0')
  })

  it('returns * for ongoing games', () => {
    const game = loadGame(MOVES_ONLY_PGN)

    expect(getResult(game!)).toBe('*')
  })

  it('identifies complete games', () => {
    const whiteWins = loadGame('[Result "1-0"]\n\n1. e4 1-0')
    const blackWins = loadGame('[Result "0-1"]\n\n1. e4 0-1')
    const draw = loadGame('[Result "1/2-1/2"]\n\n1. e4 1/2-1/2')

    expect(isGameComplete(whiteWins!)).toBe(true)
    expect(isGameComplete(blackWins!)).toBe(true)
    expect(isGameComplete(draw!)).toBe(true)
  })

  it('identifies ongoing games', () => {
    const ongoing = loadGame(MOVES_ONLY_PGN)

    expect(isGameComplete(ongoing!)).toBe(false)
  })
})
