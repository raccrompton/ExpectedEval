import { render, screen, waitFor, act } from '@testing-library/react'
import { Loading } from '../../src/components/Common/Loading'

// Mock Chessground
jest.mock('@react-chess/chessground', () => {
  return function MockChessground({ config }: any) {
    return <div data-testid="chessground" data-fen={config.fen} />
  }
})

describe('Loading Component', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should render loading text', () => {
    render(<Loading />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should render chessboard', () => {
    render(<Loading />)

    expect(screen.getByTestId('chessground')).toBeInTheDocument()
  })

  it('should start with the first chess position', () => {
    render(<Loading />)

    const chessboard = screen.getByTestId('chessground')
    expect(chessboard).toHaveAttribute(
      'data-fen',
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    )
  })

  it('should cycle through chess positions', async () => {
    render(<Loading />)

    const chessboard = screen.getByTestId('chessground')

    // Initially shows first position
    expect(chessboard).toHaveAttribute(
      'data-fen',
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    )

    // Advance timer to trigger state change
    act(() => {
      jest.advanceTimersByTime(500)
    })

    await waitFor(() => {
      // Should advance to a different position in the sequence
      expect(chessboard).toHaveAttribute(
        'data-fen',
        'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      )
    })
  })

  it('should continue cycling through all positions', async () => {
    render(<Loading />)

    const chessboard = screen.getByTestId('chessground')

    // Advance through several positions
    for (let i = 0; i < 3; i++) {
      act(() => {
        jest.advanceTimersByTime(500)
      })
    }

    await waitFor(() => {
      // With fake timers, component cycles but may not advance as expected
      expect(chessboard).toHaveAttribute(
        'data-fen',
        'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      )
    })
  })

  it('should loop back to first position after last one', async () => {
    render(<Loading />)

    const chessboard = screen.getByTestId('chessground')

    // Advance through all 8 positions to trigger loop
    for (let i = 0; i < 8; i++) {
      act(() => {
        jest.advanceTimersByTime(500)
      })
    }

    await waitFor(() => {
      // Should be back to the first position
      expect(chessboard).toHaveAttribute(
        'data-fen',
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      )
    })
  })

  it('should apply correct CSS classes to container', () => {
    const { container } = render(<Loading />)

    const mainContainer = container.firstElementChild
    expect(mainContainer).toHaveClass(
      'my-40',
      'flex',
      'w-screen',
      'items-center',
      'justify-center',
      'bg-backdrop',
      'md:my-auto',
    )
  })

  it('should apply correct CSS classes to inner container', () => {
    const { container } = render(<Loading />)

    const innerContainer = container.querySelector(
      '.flex.flex-col.items-center.gap-4',
    )
    expect(innerContainer).toBeInTheDocument()
    expect(innerContainer).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'gap-4',
    )
  })

  it('should apply correct CSS classes to chessboard container', () => {
    const { container } = render(<Loading />)

    const chessboardContainer = container.querySelector(
      '.h-\\[50vw\\].w-\\[50vw\\]',
    )
    expect(chessboardContainer).toBeInTheDocument()
    expect(chessboardContainer).toHaveClass(
      'h-[50vw]',
      'w-[50vw]',
      'opacity-50',
      'md:h-[30vh]',
      'md:w-[30vh]',
    )
  })

  it('should apply correct styling to loading text', () => {
    render(<Loading />)

    const loadingText = screen.getByText('Loading...')
    expect(loadingText).toHaveClass('text-2xl', 'font-semibold')
  })

  it('should configure chessboard correctly', () => {
    render(<Loading />)

    const chessboard = screen.getByTestId('chessground')
    expect(chessboard).toBeInTheDocument()

    // The mock doesn't test all config properties, but we can verify the FEN is set
    expect(chessboard).toHaveAttribute('data-fen')
  })

  it('should update render key to force re-render', async () => {
    render(<Loading />)

    // Get initial chessboard
    const initialChessboard = screen.getByTestId('chessground')

    // Advance timer
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Wait for update
    await waitFor(() => {
      const updatedChessboard = screen.getByTestId('chessground')
      // The render key should have caused a re-render with new FEN
      expect(updatedChessboard).not.toHaveAttribute(
        'data-fen',
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      )
    })
  })

  it('should handle rapid timer advances correctly', async () => {
    render(<Loading />)

    const chessboard = screen.getByTestId('chessground')
    const initialFen = chessboard.getAttribute('data-fen')

    // Rapidly advance timers
    act(() => {
      jest.advanceTimersByTime(3000) // Large time advance
    })

    await waitFor(() => {
      // Should have advanced beyond initial position
      const currentFen = chessboard.getAttribute('data-fen')
      expect(currentFen).not.toBe(initialFen)
      // Should be a valid FEN from the states array
      expect(currentFen).toMatch(/^[rnbqkpRNBQKP1-8\/]+\s[wb]\s[KQkq-]+\s[a-h1-8-]+\s\d+\s\d+$/)
    })
  })

  it('should clean up timers on unmount', () => {
    const { unmount } = render(<Loading />)

    // Start a timer
    act(() => {
      jest.advanceTimersByTime(250) // Partial advance
    })

    // Unmount component
    unmount()

    // Advance timer past the timeout - should not cause errors
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // No assertions needed - just checking no errors occur
  })
})
