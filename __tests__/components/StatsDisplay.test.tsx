import { render, screen } from '@testing-library/react'
import { StatsDisplay } from '../../src/components/Common/StatsDisplay'
import { AllStats } from '../../src/hooks/useStats'

// Mock stats data
const mockStats: AllStats = {
  rating: 1500,
  lastRating: 1450,
  session: {
    gamesWon: 3,
    gamesPlayed: 5,
  },
  lifetime: {
    gamesWon: 100,
    gamesPlayed: 150,
  },
}

const mockStatsNoRating: AllStats = {
  rating: undefined,
  lastRating: undefined,
  session: {
    gamesWon: 0,
    gamesPlayed: 0,
  },
  lifetime: {
    gamesWon: 0,
    gamesPlayed: 0,
  },
}

describe('StatsDisplay Component', () => {
  it('should render rating display', () => {
    render(<StatsDisplay stats={mockStats} />)

    expect(screen.getByText('Your rating')).toBeInTheDocument()
    expect(screen.getByText('1500')).toBeInTheDocument()
  })

  it('should render rating difference for positive change', () => {
    render(<StatsDisplay stats={mockStats} />)

    // Rating diff should be +50 (1500 - 1450)
    expect(screen.getByText('+50')).toBeInTheDocument()
    expect(screen.getByText('arrow_drop_up')).toBeInTheDocument()
  })

  it('should render rating difference for negative change', () => {
    const statsWithNegativeDiff = {
      ...mockStats,
      rating: 1400,
      lastRating: 1450,
    }

    render(<StatsDisplay stats={statsWithNegativeDiff} />)

    // Rating diff should be -50 (1400 - 1450), displayed as –50
    expect(screen.getByText('–50')).toBeInTheDocument()
    expect(screen.getByText('arrow_drop_down')).toBeInTheDocument()
  })

  it('should render session stats', () => {
    render(<StatsDisplay stats={mockStats} />)

    expect(screen.getByText('This session')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument() // gamesWon
    expect(screen.getByText('5')).toBeInTheDocument() // gamesPlayed
    expect(screen.getByText('60%')).toBeInTheDocument() // win rate
  })

  it('should render lifetime stats', () => {
    render(<StatsDisplay stats={mockStats} />)

    expect(screen.getByText('Lifetime')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument() // gamesWon
    expect(screen.getByText('150')).toBeInTheDocument() // gamesPlayed
    expect(screen.getByText('66%')).toBeInTheDocument() // win rate (100/150 = 66.67%, truncated to 66)
  })

  it('should hide session when hideSession prop is true', () => {
    render(<StatsDisplay stats={mockStats} hideSession={true} />)

    expect(screen.queryByText('This session')).not.toBeInTheDocument()
    expect(screen.getByText('Lifetime')).toBeInTheDocument()
  })

  it('should show "Wins" label when isGame is true', () => {
    render(<StatsDisplay stats={mockStats} isGame={true} />)

    expect(screen.getAllByText('Wins')).toHaveLength(2) // Session and Lifetime
  })

  it('should show "Correct" label when isGame is false', () => {
    render(<StatsDisplay stats={mockStats} isGame={false} />)

    expect(screen.getAllByText('Correct')).toHaveLength(2) // Session and Lifetime
  })

  it('should handle undefined stats gracefully', () => {
    render(<StatsDisplay stats={mockStatsNoRating} />)

    expect(screen.getAllByText('0')).toHaveLength(5) // Rating, wins, played (session & lifetime)
    expect(screen.getAllByText('-%')).toHaveLength(2) // Win rate for 0/0 should be NaN, displayed as '-' for session and lifetime
  })

  it('should handle NaN win percentage', () => {
    const statsWithNaN = {
      ...mockStats,
      session: {
        gamesWon: 0,
        gamesPlayed: 0,
      },
    }

    render(<StatsDisplay stats={statsWithNaN} />)

    expect(screen.getByText('-%')).toBeInTheDocument() // NaN should display as '-%'
  })

  it('should apply correct CSS classes', () => {
    render(<StatsDisplay stats={mockStats} />)

    const container = screen
      .getByText('Your rating')
      .closest('div')?.parentElement
    expect(container).toHaveClass('flex', 'flex-col')
    // Additional specific classes can be tested based on actual implementation
  })

  it('should handle zero win percentage correctly', () => {
    const statsWithZeroWins = {
      ...mockStats,
      session: {
        gamesWon: 0,
        gamesPlayed: 10,
      },
    }

    render(<StatsDisplay stats={statsWithZeroWins} />)

    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('should handle 100% win percentage correctly', () => {
    const statsWithAllWins = {
      ...mockStats,
      session: {
        gamesWon: 10,
        gamesPlayed: 10,
      },
    }

    render(<StatsDisplay stats={statsWithAllWins} />)

    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('should render without rating difference when lastRating is undefined', () => {
    const statsWithoutLastRating = {
      ...mockStats,
      lastRating: undefined,
    }

    render(<StatsDisplay stats={statsWithoutLastRating} />)

    expect(screen.queryByText('+50')).not.toBeInTheDocument()
    expect(screen.queryByText('arrow_drop_up')).not.toBeInTheDocument()
  })

  it('should render material icons correctly', () => {
    render(<StatsDisplay stats={mockStats} />)

    const upArrow = screen.getByText('arrow_drop_up')
    expect(upArrow).toHaveClass(
      'material-symbols-outlined',
      'material-symbols-filled',
      'text-2xl',
    )
  })
})
