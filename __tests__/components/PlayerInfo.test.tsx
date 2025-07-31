import { render, screen } from '@testing-library/react'
import { PlayerInfo } from '../../src/components/Common/PlayerInfo'

const defaultProps = {
  name: 'TestPlayer',
  color: 'white',
}

describe('PlayerInfo Component', () => {
  it('should render player name correctly', () => {
    render(<PlayerInfo {...defaultProps} />)

    expect(screen.getByText('TestPlayer')).toBeInTheDocument()
  })

  it('should render player rating when provided', () => {
    render(<PlayerInfo {...defaultProps} rating={1500} />)

    expect(screen.getByText('(1500)')).toBeInTheDocument()
  })

  it('should not render rating when not provided', () => {
    render(<PlayerInfo {...defaultProps} />)

    expect(screen.getByText('TestPlayer')).toBeInTheDocument()
    expect(screen.queryByText(/\(.*\)/)).not.toBeInTheDocument()
  })

  it('should render "Unknown" when name is not provided', () => {
    render(<PlayerInfo name={undefined as unknown as string} color="white" />)

    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('should render empty string when name is empty', () => {
    render(<PlayerInfo name="" color="white" />)

    // Empty string should render as-is, not as "Unknown"
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument()
  })

  it('should render white color indicator correctly', () => {
    const { container } = render(<PlayerInfo {...defaultProps} color="white" />)

    const colorIndicator = container.querySelector('.bg-white')
    expect(colorIndicator).toBeInTheDocument()
    expect(colorIndicator).toHaveClass('h-2.5', 'w-2.5', 'rounded-full')
  })

  it('should render black color indicator correctly', () => {
    const { container } = render(<PlayerInfo {...defaultProps} color="black" />)

    const colorIndicator = container.querySelector('.bg-black')
    expect(colorIndicator).toBeInTheDocument()
    expect(colorIndicator).toHaveClass(
      'h-2.5',
      'w-2.5',
      'rounded-full',
      'border',
    )
  })

  describe('Arrow Legend', () => {
    it('should render arrow legend when showArrowLegend is true', () => {
      render(<PlayerInfo {...defaultProps} showArrowLegend={true} />)

      expect(screen.getByText('Most Human Move')).toBeInTheDocument()
      expect(screen.getByText('Best Engine Move')).toBeInTheDocument()
    })

    it('should not render arrow legend when showArrowLegend is false', () => {
      render(<PlayerInfo {...defaultProps} showArrowLegend={false} />)

      expect(screen.queryByText('Most Human Move')).not.toBeInTheDocument()
      expect(screen.queryByText('Best Engine Move')).not.toBeInTheDocument()
    })

    it('should not render arrow legend by default', () => {
      render(<PlayerInfo {...defaultProps} />)

      expect(screen.queryByText('Most Human Move')).not.toBeInTheDocument()
      expect(screen.queryByText('Best Engine Move')).not.toBeInTheDocument()
    })

    it('should render arrow icons with correct classes in legend', () => {
      render(<PlayerInfo {...defaultProps} showArrowLegend={true} />)

      const arrowIcons = screen.getAllByText('arrow_outward')
      expect(arrowIcons).toHaveLength(2)

      // Human move arrow
      expect(arrowIcons[0]).toHaveClass(
        'material-symbols-outlined',
        '!text-xxs',
        'text-human-3',
      )

      // Engine move arrow
      expect(arrowIcons[1]).toHaveClass(
        'material-symbols-outlined',
        '!text-xxs',
        'text-engine-3',
      )
    })
  })

  describe('Game Termination', () => {
    it('should show "1" when player won (termination matches color)', () => {
      render(<PlayerInfo {...defaultProps} termination="white" color="white" />)

      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('1')).toHaveClass('text-engine-3')
    })

    it('should show "0" when player lost (termination does not match color and is not "none")', () => {
      render(<PlayerInfo {...defaultProps} termination="black" color="white" />)

      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('0')).toHaveClass('text-human-3')
    })

    it('should show "½" when game was a draw (termination is "none")', () => {
      render(<PlayerInfo {...defaultProps} termination="none" color="white" />)

      expect(screen.getByText('½')).toBeInTheDocument()
      expect(screen.getByText('½')).toHaveClass('text-secondary')
    })

    it('should show nothing when termination is undefined', () => {
      render(<PlayerInfo {...defaultProps} termination={undefined} />)

      expect(screen.queryByText('1')).not.toBeInTheDocument()
      expect(screen.queryByText('0')).not.toBeInTheDocument()
      expect(screen.queryByText('½')).not.toBeInTheDocument()
    })
  })

  it('should have correct container structure and classes', () => {
    const { container } = render(<PlayerInfo {...defaultProps} />)

    const mainContainer = container.firstChild
    expect(mainContainer).toHaveClass(
      'flex',
      'h-10',
      'w-full',
      'items-center',
      'justify-between',
      'bg-background-1',
      'px-4',
    )
  })
})
