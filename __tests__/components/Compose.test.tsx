import { render, screen } from '@testing-library/react'
import { Compose } from '../../src/components/Common/Compose'
import { ErrorBoundary } from '../../src/components/Common/ErrorBoundary'

// Mock ErrorBoundary to avoid chessground import issues
jest.mock('../../src/components/Common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}))

// Mock providers for testing
const MockProvider1 = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="provider-1">{children}</div>
)

const MockProvider2 = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="provider-2">{children}</div>
)

const MockProvider3 = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="provider-3">{children}</div>
)

describe('Compose Component', () => {
  it('should render children with single component', () => {
    render(
      <Compose components={[MockProvider1]}>
        <div data-testid="child">Test Child</div>
      </Compose>,
    )

    expect(screen.getByTestId('provider-1')).toBeInTheDocument()
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Test Child')).toBeInTheDocument()
  })

  it('should nest multiple components correctly', () => {
    render(
      <Compose components={[MockProvider1, MockProvider2]}>
        <div data-testid="child">Nested Child</div>
      </Compose>,
    )

    expect(screen.getByTestId('provider-1')).toBeInTheDocument()
    expect(screen.getByTestId('provider-2')).toBeInTheDocument()
    expect(screen.getByTestId('child')).toBeInTheDocument()

    // Verify nesting order
    const provider1 = screen.getByTestId('provider-1')
    const provider2 = screen.getByTestId('provider-2')
    expect(provider1).toContainElement(provider2)
  })

  it('should handle three levels of nesting', () => {
    render(
      <Compose components={[MockProvider1, MockProvider2, MockProvider3]}>
        <div data-testid="child">Deep Nested Child</div>
      </Compose>,
    )

    expect(screen.getByTestId('provider-1')).toBeInTheDocument()
    expect(screen.getByTestId('provider-2')).toBeInTheDocument()
    expect(screen.getByTestId('provider-3')).toBeInTheDocument()
    expect(screen.getByTestId('child')).toBeInTheDocument()

    // Verify deep nesting
    const provider1 = screen.getByTestId('provider-1')
    const provider2 = screen.getByTestId('provider-2')
    const provider3 = screen.getByTestId('provider-3')
    expect(provider1).toContainElement(provider2)
    expect(provider2).toContainElement(provider3)
  })

  it('should work with ErrorBoundary component', () => {
    render(
      <Compose components={[ErrorBoundary, MockProvider1]}>
        <div data-testid="child">Error Wrapped Child</div>
      </Compose>,
    )

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
    expect(screen.getByTestId('provider-1')).toBeInTheDocument()
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('should handle empty components array', () => {
    render(
      <Compose components={[]}>
        <div data-testid="child">Unwrapped Child</div>
      </Compose>,
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Unwrapped Child')).toBeInTheDocument()
  })

  it('should render multiple children', () => {
    render(
      <Compose components={[MockProvider1]}>
        <div data-testid="child-1">First Child</div>
        <div data-testid="child-2">Second Child</div>
      </Compose>,
    )

    expect(screen.getByTestId('provider-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
    expect(screen.getByText('First Child')).toBeInTheDocument()
    expect(screen.getByText('Second Child')).toBeInTheDocument()
  })

  it('should preserve React node types', () => {
    render(
      <Compose components={[MockProvider1]}>
        <span>Text node</span>
        <button>Button node</button>
        <input placeholder="Input node" />
      </Compose>,
    )

    expect(screen.getByText('Text node')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Button node' }),
    ).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Input node')).toBeInTheDocument()
  })
})
