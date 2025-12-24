/**
 * PgnInput Component
 *
 * Textarea for entering PGN text and a button to load the game.
 * This is the primary way users import games for analysis.
 *
 * Props:
 * - onLoadPgn: Callback when user clicks the load button
 *
 * Layout:
 * - Textarea for pasting/typing PGN
 * - Load button below the textarea
 */

import { useState } from 'react'

interface PgnInputProps {
  /** Callback when PGN is loaded */
  onLoadPgn: (pgn: string) => void
}

export function PgnInput({ onLoadPgn }: PgnInputProps) {
  const [pgnText, setPgnText] = useState('')

  function handleLoad(): void {
    onLoadPgn(pgnText)
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
    setPgnText(event.target.value)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
    // Ctrl/Cmd + Enter to load
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      handleLoad()
    }
  }

  return (
    <div data-testid="pgn-input-container" className="pgn-input-container">
      <textarea
        data-testid="pgn-input"
        className="pgn-textarea"
        value={pgnText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Paste PGN here..."
        rows={8}
        aria-label="PGN input"
      />
      <button
        data-testid="load-pgn-button"
        className="load-button"
        onClick={handleLoad}
        type="button"
      >
        Load PGN
      </button>
      <style jsx>{`
        .pgn-input-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        .pgn-textarea {
          width: 100%;
          min-height: 120px;
          padding: var(--space-sm);
          font-family: monospace;
          font-size: 0.875rem;
          line-height: 1.4;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          background: var(--color-bg);
          color: var(--color-text);
          resize: vertical;
        }
        .pgn-textarea:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
        }
        .pgn-textarea::placeholder {
          color: var(--color-text-muted);
        }
        .load-button {
          padding: var(--space-sm) var(--space-md);
          font-size: 0.875rem;
          font-weight: 500;
          color: white;
          background: var(--color-primary);
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .load-button:hover {
          background: var(--color-primary-dark);
        }
        .load-button:active {
          transform: translateY(1px);
        }
      `}</style>
    </div>
  )
}
