/**
 * MoveList Component Tests
 *
 * Tests for the MoveList component that displays chess moves
 * and handles navigation through the game tree.
 *
 * Test categories:
 * - Rendering: Empty state, moves display, move numbers
 * - Navigation: Click handling, path passing
 * - Current move: Highlighting the current position
 * - Variations: Display of alternative moves
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MoveList } from './MoveList'
import { loadGame } from '@/core/chess'

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Simple PGN for testing basic functionality.
 * 1. e4 e5 2. Nf3 Nc6
 */
const SIMPLE_PGN = '1. e4 e5 2. Nf3 Nc6'

/**
 * PGN with a variation.
 * 1. e4 e5 (1... c5) 2. Nf3
 */
const VARIATION_PGN = '1. e4 e5 (1... c5) 2. Nf3'

// ============================================================================
// RENDERING TESTS
// ============================================================================

describe('MoveList - Rendering', () => {
  it('renders empty state when no game is provided', () => {
    const onNavigate = vi.fn()

    render(
      <MoveList game={null} currentPath={[]} onNavigate={onNavigate} />
    )

    expect(screen.getByTestId('move-list')).toBeInTheDocument()
    expect(screen.getByText(/no game loaded/i)).toBeInTheDocument()
  })

  it('renders starting position message for empty game', () => {
    const onNavigate = vi.fn()
    const game = loadGame('')

    render(
      <MoveList game={game} currentPath={[]} onNavigate={onNavigate} />
    )

    // Component shows "No game loaded" message when no moves
    expect(screen.getByText(/no game loaded/i)).toBeInTheDocument()
  })

  it('renders moves from a simple game', () => {
    const onNavigate = vi.fn()
    const game = loadGame(SIMPLE_PGN)

    render(
      <MoveList game={game} currentPath={[]} onNavigate={onNavigate} />
    )

    // Check that moves are displayed
    expect(screen.getByText('e4')).toBeInTheDocument()
    expect(screen.getByText('e5')).toBeInTheDocument()
    expect(screen.getByText('Nf3')).toBeInTheDocument()
    expect(screen.getByText('Nc6')).toBeInTheDocument()
  })

  it('renders move numbers correctly', () => {
    const onNavigate = vi.fn()
    const game = loadGame(SIMPLE_PGN)

    render(
      <MoveList game={game} currentPath={[]} onNavigate={onNavigate} />
    )

    // Check for move numbers
    expect(screen.getByText('1.')).toBeInTheDocument()
    expect(screen.getByText('2.')).toBeInTheDocument()
  })
})

// ============================================================================
// NAVIGATION TESTS
// ============================================================================

describe('MoveList - Navigation', () => {
  it('calls onNavigate when a move is clicked', () => {
    const onNavigate = vi.fn()
    const game = loadGame(SIMPLE_PGN)

    render(
      <MoveList game={game} currentPath={[]} onNavigate={onNavigate} />
    )

    // Click the first move (e4)
    fireEvent.click(screen.getByText('e4'))

    // Check that onNavigate was called with the correct path
    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(onNavigate).toHaveBeenCalledWith([0])
  })

  it('passes correct path for second move', () => {
    const onNavigate = vi.fn()
    const game = loadGame(SIMPLE_PGN)

    render(
      <MoveList game={game} currentPath={[]} onNavigate={onNavigate} />
    )

    // Click the second move (e5)
    fireEvent.click(screen.getByText('e5'))

    expect(onNavigate).toHaveBeenCalledWith([0, 0])
  })

  it('passes correct path for third move', () => {
    const onNavigate = vi.fn()
    const game = loadGame(SIMPLE_PGN)

    render(
      <MoveList game={game} currentPath={[]} onNavigate={onNavigate} />
    )

    // Click the third move (Nf3)
    fireEvent.click(screen.getByText('Nf3'))

    expect(onNavigate).toHaveBeenCalledWith([0, 0, 0])
  })

  it('passes correct path for fourth move', () => {
    const onNavigate = vi.fn()
    const game = loadGame(SIMPLE_PGN)

    render(
      <MoveList game={game} currentPath={[]} onNavigate={onNavigate} />
    )

    // Click the fourth move (Nc6)
    fireEvent.click(screen.getByText('Nc6'))

    expect(onNavigate).toHaveBeenCalledWith([0, 0, 0, 0])
  })
})

// ============================================================================
// CURRENT MOVE HIGHLIGHTING TESTS
// ============================================================================

describe('MoveList - Current Move Highlighting', () => {
  it('highlights the current move based on currentPath', () => {
    const onNavigate = vi.fn()
    const game = loadGame(SIMPLE_PGN)

    render(
      <MoveList
        game={game}
        currentPath={[0, 0]} // After e4 e5
        onNavigate={onNavigate}
      />
    )

    // The e5 move should be highlighted (has class 'current')
    const e5Button = screen.getByTestId('move-0-0')
    expect(e5Button).toHaveClass('current')
  })

  it('highlights first move when at path [0]', () => {
    const onNavigate = vi.fn()
    const game = loadGame(SIMPLE_PGN)

    render(
      <MoveList
        game={game}
        currentPath={[0]} // After e4
        onNavigate={onNavigate}
      />
    )

    const e4Button = screen.getByTestId('move-0')
    expect(e4Button).toHaveClass('current')
  })

  it('does not highlight any move when at starting position', () => {
    const onNavigate = vi.fn()
    const game = loadGame(SIMPLE_PGN)

    render(
      <MoveList
        game={game}
        currentPath={[]} // Starting position
        onNavigate={onNavigate}
      />
    )

    // No move should have the 'current' class
    const e4Button = screen.getByTestId('move-0')
    expect(e4Button).not.toHaveClass('current')
  })
})

// ============================================================================
// VARIATIONS TESTS
// ============================================================================

describe('MoveList - Variations', () => {
  it('renders variations when showVariations is true', () => {
    const onNavigate = vi.fn()
    const game = loadGame(VARIATION_PGN)

    render(
      <MoveList
        game={game}
        currentPath={[]}
        onNavigate={onNavigate}
        showVariations={true}
      />
    )

    // Main line moves
    expect(screen.getByText('e4')).toBeInTheDocument()
    expect(screen.getByText('e5')).toBeInTheDocument()

    // Variation move (c5) - may appear multiple times due to inline variations
    // Use getAllByText to handle multiple occurrences
    const c5Moves = screen.getAllByText('c5')
    expect(c5Moves.length).toBeGreaterThan(0)
  })

  it('hides variations when showVariations is false', () => {
    const onNavigate = vi.fn()
    const game = loadGame(VARIATION_PGN)

    render(
      <MoveList
        game={game}
        currentPath={[]}
        onNavigate={onNavigate}
        showVariations={false}
      />
    )

    // Main line moves should be present
    expect(screen.getByText('e4')).toBeInTheDocument()
    expect(screen.getByText('e5')).toBeInTheDocument()

    // Variation parentheses should NOT be present (no variation wrapper)
    // The c5 might still appear in the mainline alternative, but not in parentheses
    expect(screen.queryByText('(')).not.toBeInTheDocument()
  })

  it('allows clicking on variation moves', () => {
    const onNavigate = vi.fn()
    const game = loadGame(VARIATION_PGN)

    render(
      <MoveList
        game={game}
        currentPath={[]}
        onNavigate={onNavigate}
        showVariations={true}
      />
    )

    // Click the variation move (c5) using test id
    // Multiple elements may exist with this ID due to inline display
    // Click the first one (they all navigate to the same path)
    const variationButtons = screen.getAllByTestId('move-0-1')
    fireEvent.click(variationButtons[0])

    // Should navigate to the variation path
    expect(onNavigate).toHaveBeenCalledWith([0, 1])
  })
})

// ============================================================================
// DATA-TESTID TESTS
// ============================================================================

describe('MoveList - Test IDs', () => {
  it('has the correct root data-testid', () => {
    const onNavigate = vi.fn()
    const game = loadGame(SIMPLE_PGN)

    render(
      <MoveList
        game={game}
        currentPath={[]}
        onNavigate={onNavigate}
        data-testid="custom-move-list"
      />
    )

    expect(screen.getByTestId('custom-move-list')).toBeInTheDocument()
  })

  it('generates correct data-testid for moves', () => {
    const onNavigate = vi.fn()
    const game = loadGame(SIMPLE_PGN)

    render(
      <MoveList game={game} currentPath={[]} onNavigate={onNavigate} />
    )

    // Check data-testid attributes
    expect(screen.getByTestId('move-0')).toBeInTheDocument() // e4
    expect(screen.getByTestId('move-0-0')).toBeInTheDocument() // e5
    expect(screen.getByTestId('move-0-0-0')).toBeInTheDocument() // Nf3
    expect(screen.getByTestId('move-0-0-0-0')).toBeInTheDocument() // Nc6
  })
})
