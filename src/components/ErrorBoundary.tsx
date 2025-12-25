import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary component that catches JavaScript errors in child components.
 * Displays a fallback UI instead of crashing the entire app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
          <style jsx>{`
            .error-boundary {
              padding: var(--space-lg, 24px);
              background: var(--color-error-bg, #fef2f2);
              border: 1px solid var(--color-error, #ef4444);
              border-radius: var(--radius-md, 8px);
              text-align: center;
            }
            h2 {
              margin: 0 0 var(--space-sm, 8px) 0;
              color: var(--color-error, #ef4444);
            }
            p {
              margin: 0 0 var(--space-md, 16px) 0;
              color: var(--color-text-muted, #666);
            }
            button {
              padding: var(--space-sm, 8px) var(--space-md, 16px);
              background: var(--color-error, #ef4444);
              color: white;
              border: none;
              border-radius: var(--radius-sm, 4px);
              cursor: pointer;
            }
            button:hover {
              opacity: 0.9;
            }
          `}</style>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Engine-specific error fallback component.
 */
export function EngineErrorFallback() {
  return (
    <div className="engine-error">
      <p>Engine initialization failed</p>
      <p className="hint">Try refreshing the page</p>
      <style jsx>{`
        .engine-error {
          padding: var(--space-md, 16px);
          background: var(--color-surface, #1f1f1f);
          border: 1px solid var(--color-error, #ef4444);
          border-radius: var(--radius-md, 8px);
          text-align: center;
        }
        p {
          margin: 0;
          color: var(--color-error, #ef4444);
        }
        .hint {
          margin-top: var(--space-xs, 4px);
          font-size: 0.875rem;
          color: var(--color-text-muted, #888);
        }
      `}</style>
    </div>
  )
}
