import { render, screen } from '@testing-library/react'
import { AnimatedNumber } from '../../src/components/Common/AnimatedNumber'

// Mock framer-motion to avoid complex animation testing
let mockValue = 1000
jest.mock('framer-motion', () => ({
  motion: {
    span: ({ children, className, ...props }: React.ComponentProps<'span'>) => (
      <span className={className} {...props}>
        {children}
      </span>
    ),
  },
  useSpring: jest.fn((value) => {
    mockValue = value
    return {
      set: jest.fn((newValue) => {
        mockValue = newValue
      }),
      get: jest.fn(() => mockValue),
    }
  }),
  useTransform: jest.fn((_, transform) => {
    return transform(mockValue)
  }),
}))

describe('AnimatedNumber Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render with default formatting', () => {
    render(<AnimatedNumber value={1000} />)

    // The component should render the formatted value
    expect(screen.getByText('1,000')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(<AnimatedNumber value={1000} className="custom-class" />)

    const element = screen.getByText('1,000')
    expect(element).toHaveClass('custom-class')
  })

  it('should use custom formatValue function', () => {
    const customFormat = (value: number) => `$${value.toFixed(2)}`
    render(<AnimatedNumber value={1000} formatValue={customFormat} />)

    expect(screen.getByText('$1000.00')).toBeInTheDocument()
  })

  it('should handle zero value', () => {
    render(<AnimatedNumber value={0} />)

    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should handle negative values', () => {
    render(<AnimatedNumber value={-500} />)

    expect(screen.getByText('-500')).toBeInTheDocument()
  })

  it('should handle decimal values with default rounding', () => {
    render(<AnimatedNumber value={1234.56} />)

    expect(screen.getByText('1,235')).toBeInTheDocument()
  })

  it('should handle large numbers', () => {
    render(<AnimatedNumber value={1000000} />)

    expect(screen.getByText('1,000,000')).toBeInTheDocument()
  })

  it('should use custom duration prop', () => {
    const { rerender } = render(<AnimatedNumber value={1000} duration={2.5} />)

    // Test that component renders without error with custom duration
    expect(screen.getByText('1,000')).toBeInTheDocument()

    // Rerender with different value to test duration effect
    rerender(<AnimatedNumber value={2000} duration={0.5} />)
    expect(screen.getByText('2,000')).toBeInTheDocument()
  })

  it('should handle percentage formatting', () => {
    const percentFormat = (value: number) => `${(value * 100).toFixed(1)}%`
    render(<AnimatedNumber value={0.85} formatValue={percentFormat} />)

    expect(screen.getByText('85.0%')).toBeInTheDocument()
  })

  it('should handle currency formatting', () => {
    const currencyFormat = (value: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value)

    render(<AnimatedNumber value={1234.56} formatValue={currencyFormat} />)

    expect(screen.getByText('$1,234.56')).toBeInTheDocument()
  })

  it('should render as motion.span element', () => {
    render(<AnimatedNumber value={1000} />)

    const element = screen.getByText('1,000')
    expect(element.tagName).toBe('SPAN')
  })
})
