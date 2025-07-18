import { render, screen, waitFor, act } from '@testing-library/react'
import { DelayedLoading } from '../../src/components/Common/DelayedLoading'

// Mock the Loading component
jest.mock('../../src/components/Common/Loading', () => ({
  Loading: () => <div data-testid="loading-component">Loading...</div>,
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('DelayedLoading Component', () => {
  beforeEach(() => {
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should render children immediately when not loading', () => {
    render(
      <DelayedLoading isLoading={false}>
        <div data-testid="content">Main content</div>
      </DelayedLoading>,
    )

    expect(screen.getByTestId('content')).toBeInTheDocument()
    expect(screen.getByText('Main content')).toBeInTheDocument()
    expect(screen.queryByTestId('loading-component')).not.toBeInTheDocument()
  })

  it('should not show loading immediately when isLoading is true', () => {
    render(
      <DelayedLoading isLoading={true}>
        <div data-testid="content">Main content</div>
      </DelayedLoading>,
    )

    expect(screen.queryByTestId('loading-component')).not.toBeInTheDocument()
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })

  it('should show loading after default delay (1000ms)', async () => {
    render(
      <DelayedLoading isLoading={true}>
        <div data-testid="content">Main content</div>
      </DelayedLoading>,
    )

    // Before delay
    expect(screen.queryByTestId('loading-component')).not.toBeInTheDocument()

    // Advance time by 1000ms
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(screen.getByTestId('loading-component')).toBeInTheDocument()
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })

  it('should show loading after custom delay', async () => {
    render(
      <DelayedLoading isLoading={true} delay={500}>
        <div data-testid="content">Main content</div>
      </DelayedLoading>,
    )

    // Before delay
    expect(screen.queryByTestId('loading-component')).not.toBeInTheDocument()

    // Advance time by 500ms
    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(screen.getByTestId('loading-component')).toBeInTheDocument()
  })

  it('should not show loading if isLoading becomes false before delay', () => {
    const { rerender } = render(
      <DelayedLoading isLoading={true} delay={1000}>
        <div data-testid="content">Main content</div>
      </DelayedLoading>,
    )

    // Advance time by 500ms (less than delay)
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Set isLoading to false before delay completes
    rerender(
      <DelayedLoading isLoading={false} delay={1000}>
        <div data-testid="content">Main content</div>
      </DelayedLoading>,
    )

    // Complete the remaining time
    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(screen.queryByTestId('loading-component')).not.toBeInTheDocument()
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('should hide loading and show content when isLoading becomes false', () => {
    const { rerender } = render(
      <DelayedLoading isLoading={true} delay={500}>
        <div data-testid="content">Main content</div>
      </DelayedLoading>,
    )

    // Wait for loading to show
    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(screen.getByTestId('loading-component')).toBeInTheDocument()

    // Set isLoading to false
    rerender(
      <DelayedLoading isLoading={false} delay={500}>
        <div data-testid="content">Main content</div>
      </DelayedLoading>,
    )

    expect(screen.queryByTestId('loading-component')).not.toBeInTheDocument()
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('should handle delay prop changes', () => {
    const { rerender } = render(
      <DelayedLoading isLoading={true} delay={1000}>
        <div data-testid="content">Main content</div>
      </DelayedLoading>,
    )

    // Change delay
    rerender(
      <DelayedLoading isLoading={true} delay={200}>
        <div data-testid="content">Main content</div>
      </DelayedLoading>,
    )

    // Advance by the new delay amount
    act(() => {
      jest.advanceTimersByTime(200)
    })

    expect(screen.getByTestId('loading-component')).toBeInTheDocument()
  })

  it('should clean up timer on unmount', () => {
    const { unmount } = render(
      <DelayedLoading isLoading={true} delay={1000}>
        <div data-testid="content">Main content</div>
      </DelayedLoading>,
    )

    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })

  it('should handle multiple children', () => {
    render(
      <DelayedLoading isLoading={false}>
        <div data-testid="child1">First child</div>
        <div data-testid="child2">Second child</div>
      </DelayedLoading>,
    )

    expect(screen.getByTestId('child1')).toBeInTheDocument()
    expect(screen.getByTestId('child2')).toBeInTheDocument()
    expect(screen.getByText('First child')).toBeInTheDocument()
    expect(screen.getByText('Second child')).toBeInTheDocument()
  })

  it('should apply correct CSS classes and motion props', () => {
    render(
      <DelayedLoading isLoading={true} delay={100}>
        <div data-testid="content">Main content</div>
      </DelayedLoading>,
    )

    act(() => {
      jest.advanceTimersByTime(100)
    })

    const loadingContainer =
      screen.getByTestId('loading-component').parentElement
    expect(loadingContainer).toHaveClass('my-auto')
  })
})
