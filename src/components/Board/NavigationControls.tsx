/**
 * NavigationControls Component
 *
 * Provides buttons for navigating through a chess game:
 * - Start: Go to initial position
 * - Back: Go back one move
 * - Forward: Go forward one move
 * - End: Go to final position
 */

interface NavigationControlsProps {
  onStart: () => void
  onBack: () => void
  onForward: () => void
  onEnd: () => void
  isAtStart: boolean
  isAtEnd: boolean
}

export function NavigationControls({
  onStart,
  onBack,
  onForward,
  onEnd,
  isAtStart,
  isAtEnd,
}: NavigationControlsProps) {
  return (
    <div className="navigation-controls" data-testid="navigation-controls">
      <button
        data-testid="nav-start"
        onClick={onStart}
        disabled={isAtStart}
        title="Go to start (Home)"
        aria-label="Go to start"
        type="button"
      >
        <span aria-hidden="true">|&lt;</span>
      </button>

      <button
        data-testid="nav-back"
        onClick={onBack}
        disabled={isAtStart}
        title="Go back (Left arrow)"
        aria-label="Go back one move"
        type="button"
      >
        <span aria-hidden="true">&lt;</span>
      </button>

      <button
        data-testid="nav-forward"
        onClick={onForward}
        disabled={isAtEnd}
        title="Go forward (Right arrow)"
        aria-label="Go forward one move"
        type="button"
      >
        <span aria-hidden="true">&gt;</span>
      </button>

      <button
        data-testid="nav-end"
        onClick={onEnd}
        disabled={isAtEnd}
        title="Go to end (End)"
        aria-label="Go to end"
        type="button"
      >
        <span aria-hidden="true">&gt;|</span>
      </button>

      <style jsx>{`
        .navigation-controls {
          display: flex;
          gap: var(--space-xs);
          justify-content: center;
          padding: var(--space-sm);
        }

        button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 32px;
          padding: 0;
          font-size: 1rem;
          font-weight: 600;
          font-family: var(--font-mono);
          color: var(--color-text);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background-color 0.1s ease, border-color 0.1s ease;
        }

        button:hover:not(:disabled) {
          background: var(--color-hover);
          border-color: var(--color-text-muted);
        }

        button:focus {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }

        button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
