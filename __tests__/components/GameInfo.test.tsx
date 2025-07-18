import { render, screen, fireEvent } from '@testing-library/react'
import { GameInfo } from '../../src/components/Common/GameInfo'
import { InstructionsType } from '../../src/types'

// Mock the tour context
const mockStartTour = jest.fn()
jest.mock('../../src/contexts/TourContext/TourContext', () => ({
  useTour: () => ({
    startTour: mockStartTour,
  }),
}))

// Mock the tour configs
jest.mock('../../src/constants/tours', () => ({
  tourConfigs: {
    analysis: {
      steps: [],
    },
  },
}))

const defaultProps = {
  icon: 'analytics',
  title: 'Test Analysis',
  type: 'analysis' as InstructionsType,
  children: <div>Test content</div>,
}

const MOCK_MAIA_MODELS = ['maia_kdd_1100', 'maia_kdd_1500', 'maia_kdd_1900']

describe('GameInfo Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render basic props correctly', () => {
    render(<GameInfo {...defaultProps} />)

    expect(screen.getByText('analytics')).toBeInTheDocument()
    expect(screen.getByText('Test Analysis')).toBeInTheDocument()
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('should render with correct icon class', () => {
    render(<GameInfo {...defaultProps} />)

    const iconElement = screen.getByText('analytics')
    expect(iconElement).toHaveClass('material-symbols-outlined')
    expect(iconElement).toHaveClass('text-lg', 'md:text-xl')
  })

  it('should call setCurrentMaiaModel when model is changed', () => {
    const mockSetCurrentMaiaModel = jest.fn()

    render(
      <GameInfo
        {...defaultProps}
        currentMaiaModel="maia_kdd_1500"
        setCurrentMaiaModel={mockSetCurrentMaiaModel}
        MAIA_MODELS={MOCK_MAIA_MODELS}
      />,
    )

    const selectElement = screen.getByDisplayValue('Maia 1500')
    fireEvent.change(selectElement, { target: { value: 'maia_kdd_1900' } })

    expect(mockSetCurrentMaiaModel).toHaveBeenCalledWith('maia_kdd_1900')
  })

  it('should not render Maia model selector when currentMaiaModel is not provided', () => {
    render(<GameInfo {...defaultProps} />)

    expect(screen.queryByText('using')).not.toBeInTheDocument()
  })

  it('should render game list button when showGameListButton is true', () => {
    const mockOnGameListClick = jest.fn()

    render(
      <GameInfo
        {...defaultProps}
        showGameListButton={true}
        onGameListClick={mockOnGameListClick}
      />,
    )

    const gameListButton = screen.getByText('Switch Game')
    expect(gameListButton).toBeInTheDocument()
  })

  it('should call onGameListClick when game list button is clicked', () => {
    const mockOnGameListClick = jest.fn()

    render(
      <GameInfo
        {...defaultProps}
        showGameListButton={true}
        onGameListClick={mockOnGameListClick}
      />,
    )

    const gameListButton = screen.getByText('Switch Game')
    fireEvent.click(gameListButton)

    expect(mockOnGameListClick).toHaveBeenCalledTimes(1)
  })

  it('should have correct container structure and classes', () => {
    const { container } = render(<GameInfo {...defaultProps} />)

    const mainContainer = container.firstChild
    expect(mainContainer).toHaveClass(
      'flex',
      'w-full',
      'flex-col',
      'items-start',
      'justify-start',
      'gap-1',
      'overflow-hidden',
      'bg-background-1',
      'p-1.5',
      'md:rounded',
      'md:p-3',
    )
    expect(mainContainer).toHaveAttribute('id', 'analysis-game-list')
  })
})
