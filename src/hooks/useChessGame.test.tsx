/**
 * Unit Tests for useChessGame Hook
 *
 * These tests verify that the useChessGame hook correctly:
 * 1. Manages game state (loading PGN, tracking current position)
 * 2. Provides navigation actions (forward, back, to start, to end)
 * 3. Computes derived state (current FEN, current node data)
 *
 * The hook wraps core/chess/game.ts and core/chess/navigation.ts
 * to provide a React-friendly interface for chess game state.
 */

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChessGame } from './useChessGame'

// Sample PGN for testing
const SIMPLE_PGN = '1. e4 e5 2. Nf3 Nc6 *'
const LONGER_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 *'
const WITH_HEADERS_PGN = `[Event "Test"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 e5 2. Nf3 *`

// Starting position FEN
const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// FEN after 1. e4
const AFTER_E4_FEN =
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

// FEN after 1. e4 e5
const AFTER_E4_E5_FEN =
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'

describe('useChessGame', () => {
  describe('Initial State', () => {
    it('starts with null game and starting position FEN', () => {
      const { result } = renderHook(() => useChessGame())

      expect(result.current.game).toBeNull()
      expect(result.current.currentFen).toBe(STARTING_FEN)
      expect(result.current.currentPath).toEqual([])
      expect(result.current.currentNode).toBeNull()
    })
  })

  describe('loadPgn', () => {
    it('loads simple PGN successfully', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      expect(result.current.game).not.toBeNull()
    })

    it('navigates to end of game after loading', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn('1. e4 *')
      })

      // After loading, should be at the final position
      expect(result.current.currentPath).toEqual([0])
      expect(result.current.currentFen).toBe(AFTER_E4_FEN)
    })

    it('loads PGN with headers', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn(WITH_HEADERS_PGN)
      })

      expect(result.current.game).not.toBeNull()
      expect(result.current.game?.headers.get('Event')).toBe('Test')
    })

    it('handles empty string gracefully', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn('')
      })

      // Should still have no game loaded
      expect(result.current.game).toBeNull()
      expect(result.current.currentFen).toBe(STARTING_FEN)
    })

    it('resets path when loading new game', () => {
      const { result } = renderHook(() => useChessGame())

      // Load first game and navigate
      act(() => {
        result.current.actions.loadPgn(LONGER_PGN)
      })

      // Load new game - should reset
      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      // Path should be at end of new game
      expect(result.current.game).not.toBeNull()
    })
  })

  describe('Navigation - goForward', () => {
    it('advances one move forward', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      act(() => {
        result.current.actions.goToStart()
      })

      // At start, path should be empty
      expect(result.current.currentPath).toEqual([])

      act(() => {
        result.current.actions.goForward()
      })

      // After one forward, should be at move 1 (e4)
      expect(result.current.currentPath).toEqual([0])
      expect(result.current.currentFen).toBe(AFTER_E4_FEN)
    })

    it('does nothing at end of game', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn('1. e4 *')
      })

      const pathBefore = [...result.current.currentPath]

      act(() => {
        result.current.actions.goForward()
      })

      // Path should remain unchanged
      expect(result.current.currentPath).toEqual(pathBefore)
    })
  })

  describe('Navigation - goBack', () => {
    it('goes back one move', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      // Currently at end, go back
      act(() => {
        result.current.actions.goBack()
      })

      // Should have one less move in path
      expect(result.current.currentPath.length).toBeLessThan(4)
    })

    it('does nothing at start', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      act(() => {
        result.current.actions.goToStart()
      })

      expect(result.current.currentPath).toEqual([])

      act(() => {
        result.current.actions.goBack()
      })

      expect(result.current.currentPath).toEqual([])
    })
  })

  describe('Navigation - goToStart', () => {
    it('navigates to starting position', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      // Should be at end after load
      expect(result.current.currentPath.length).toBeGreaterThan(0)

      act(() => {
        result.current.actions.goToStart()
      })

      expect(result.current.currentPath).toEqual([])
      expect(result.current.currentFen).toBe(STARTING_FEN)
    })
  })

  describe('Navigation - goToEnd', () => {
    it('navigates to final position', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      act(() => {
        result.current.actions.goToStart()
      })

      act(() => {
        result.current.actions.goToEnd()
      })

      // Should be at the end (4 moves in SIMPLE_PGN)
      expect(result.current.currentPath).toEqual([0, 0, 0, 0])
    })
  })

  describe('Navigation - goToPath', () => {
    it('navigates to specific path', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      act(() => {
        result.current.actions.goToPath([0, 0]) // After 1. e4 e5
      })

      expect(result.current.currentPath).toEqual([0, 0])
      expect(result.current.currentFen).toBe(AFTER_E4_E5_FEN)
    })

    it('ignores invalid path', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      const pathBefore = [...result.current.currentPath]

      act(() => {
        result.current.actions.goToPath([99, 99]) // Invalid
      })

      // Should remain at previous valid path
      expect(result.current.currentPath).toEqual(pathBefore)
    })
  })

  describe('Navigation - goToPly', () => {
    it('navigates to specific ply number', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      act(() => {
        result.current.actions.goToPly(1) // After first move (e4)
      })

      expect(result.current.currentPath).toEqual([0])
      expect(result.current.currentFen).toBe(AFTER_E4_FEN)
    })

    it('navigates to start with ply 0', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      act(() => {
        result.current.actions.goToPly(0)
      })

      expect(result.current.currentPath).toEqual([])
      expect(result.current.currentFen).toBe(STARTING_FEN)
    })
  })

  describe('Derived State', () => {
    it('currentNode returns null at start', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      act(() => {
        result.current.actions.goToStart()
      })

      expect(result.current.currentNode).toBeNull()
    })

    it('currentNode returns move data after navigation', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      act(() => {
        result.current.actions.goToPly(1)
      })

      expect(result.current.currentNode).not.toBeNull()
      expect(result.current.currentNode?.san).toBe('e4')
    })

    it('currentPly returns correct ply number', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      expect(result.current.currentPly).toBe(4)

      act(() => {
        result.current.actions.goToStart()
      })

      expect(result.current.currentPly).toBe(0)
    })

    it('isAtStart returns true at starting position', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      act(() => {
        result.current.actions.goToStart()
      })

      expect(result.current.isAtStart).toBe(true)

      act(() => {
        result.current.actions.goForward()
      })

      expect(result.current.isAtStart).toBe(false)
    })

    it('isAtEnd returns true at final position', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      expect(result.current.isAtEnd).toBe(true)

      act(() => {
        result.current.actions.goBack()
      })

      expect(result.current.isAtEnd).toBe(false)
    })
  })

  describe('Mainline Moves', () => {
    it('returns array of mainline moves', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      const moves = result.current.mainlineMoves
      expect(moves).toHaveLength(4)
      expect(moves[0].san).toBe('e4')
      expect(moves[1].san).toBe('e5')
      expect(moves[2].san).toBe('Nf3')
      expect(moves[3].san).toBe('Nc6')
    })

    it('returns empty array when no game loaded', () => {
      const { result } = renderHook(() => useChessGame())

      expect(result.current.mainlineMoves).toEqual([])
    })
  })

  describe('Displayed Moves (following current path)', () => {
    it('shows moves along current path after making a variation', () => {
      const { result } = renderHook(() => useChessGame())

      // Make e4
      act(() => {
        result.current.actions.makeMove('e2', 'e4')
      })

      // Make e5
      act(() => {
        result.current.actions.makeMove('e7', 'e5')
      })

      // Verify initial moves
      expect(result.current.displayedMoves).toHaveLength(2)
      expect(result.current.displayedMoves[0].san).toBe('e4')
      expect(result.current.displayedMoves[1].san).toBe('e5')

      // Go back to after e4
      act(() => {
        result.current.actions.goToPath([0])
      })

      // Make d5 instead of e5 (creates variation)
      act(() => {
        result.current.actions.makeMove('d7', 'd5')
      })

      // Displayed moves should now show d5, not e5
      expect(result.current.displayedMoves).toHaveLength(2)
      expect(result.current.displayedMoves[0].san).toBe('e4')
      expect(result.current.displayedMoves[1].san).toBe('d5')
    })

    it('shows variation from root when navigating there', () => {
      const { result } = renderHook(() => useChessGame())

      // Make e4
      act(() => {
        result.current.actions.makeMove('e2', 'e4')
      })

      // Go back to start
      act(() => {
        result.current.actions.goToStart()
      })

      // Make d4 instead (variation from root)
      act(() => {
        result.current.actions.makeMove('d2', 'd4')
      })

      // Should show d4, not e4
      expect(result.current.displayedMoves).toHaveLength(1)
      expect(result.current.displayedMoves[0].san).toBe('d4')
    })

    it('follows current path then mainline for continuation', () => {
      const { result } = renderHook(() => useChessGame())

      // Load game with moves: 1. e4 e5 2. Nf3 Nc6
      act(() => {
        result.current.actions.loadPgn(SIMPLE_PGN)
      })

      // Navigate back to after e4 e5
      act(() => {
        result.current.actions.goToPath([0, 0])
      })

      // Make Bc4 instead of Nf3 (variation)
      act(() => {
        result.current.actions.makeMove('f1', 'c4')
      })

      // Should show: e4, e5, Bc4 (current path)
      expect(result.current.displayedMoves).toHaveLength(3)
      expect(result.current.displayedMoves[0].san).toBe('e4')
      expect(result.current.displayedMoves[1].san).toBe('e5')
      expect(result.current.displayedMoves[2].san).toBe('Bc4')
    })

    it('displayedMoves has correct path for each move', () => {
      const { result } = renderHook(() => useChessGame())

      // Make e4
      act(() => {
        result.current.actions.makeMove('e2', 'e4')
      })

      // Go back and make d4 (variation)
      act(() => {
        result.current.actions.goToStart()
      })

      act(() => {
        result.current.actions.makeMove('d2', 'd4')
      })

      // Path should be [1] (second child of root), not [0]
      expect(result.current.displayedMoves[0].path).toEqual([1])
    })
  })
})
