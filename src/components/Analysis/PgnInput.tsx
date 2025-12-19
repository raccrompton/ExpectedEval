/**
 * PgnInput Component - PGN Text Input with Load Button
 *
 * This component provides a textarea for users to paste PGN text
 * and a button to load it into the analysis board.
 *
 * Features:
 * - Large textarea for pasting PGN
 * - Load button to parse and load the game
 * - Error display for invalid PGN
 * - Clear button to reset
 * - Sample PGN button for quick testing
 *
 * Architecture:
 * - Receives onLoadPgn callback from parent
 * - Manages textarea value internally
 * - Displays error feedback from parent
 *
 * @example
 * ```tsx
 * function Analysis() {
 *   const { actions, error } = useChessGame()
 *
 *   return (
 *     <PgnInput
 *       onLoadPgn={actions.loadPgn}
 *       error={error}
 *     />
 *   )
 * }
 * ```
 *
 * Dependencies:
 * - React: useState, useCallback
 */

'use client'

import { useState, useCallback } from 'react'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Sample PGN for quick testing.
 * A classic Italian Game opening.
 */
const SAMPLE_PGN = `[Event "Sample Game"]
[Site "ExpectedEval"]
[Date "2024.01.01"]
[Round "1"]
[White "Player 1"]
[Black "Player 2"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 *`

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the PgnInput component.
 */
export interface PgnInputProps {
  /**
   * Callback when user clicks Load button.
   * Called with the PGN text.
   *
   * @param pgn - The PGN text to load
   * @returns true if load succeeded, false if failed
   */
  onLoadPgn: (pgn: string) => boolean

  /**
   * Error message to display (from parent).
   * Null if no error.
   */
  error?: string | null

  /**
   * Callback when error is cleared.
   */
  onClearError?: () => void

  /**
   * Optional: Placeholder text for the textarea.
   */
  placeholder?: string

  /**
   * Optional: CSS class name for custom styling.
   */
  className?: string

  /**
   * Optional: data-testid for testing.
   */
  'data-testid'?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PGN input component for loading chess games.
 *
 * Provides a textarea and buttons for loading PGN text.
 */
export function PgnInput({
  onLoadPgn,
  error,
  onClearError,
  placeholder = 'Paste PGN here...\n\nExample:\n1. e4 e5 2. Nf3 Nc6 3. Bb5',
  className = '',
  'data-testid': testId = 'pgn-input',
}: PgnInputProps) {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /**
   * Current value of the textarea.
   */
  const [pgnText, setPgnText] = useState('')

  /**
   * Whether a load is in progress.
   */
  const [isLoading, setIsLoading] = useState(false)

  // ---------------------------------------------------------------------------
  // EVENT HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle textarea change.
   */
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPgnText(e.target.value)

      // Clear error when user starts typing
      if (error && onClearError) {
        onClearError()
      }
    },
    [error, onClearError]
  )

  /**
   * Handle Load button click.
   */
  const handleLoad = useCallback(() => {
    if (!pgnText.trim()) return

    setIsLoading(true)

    // Call parent's load function
    const success = onLoadPgn(pgnText)

    setIsLoading(false)

    // If successful, optionally clear the textarea
    // (keeping it for now so user can see what they loaded)
  }, [pgnText, onLoadPgn])

  /**
   * Handle Clear button click.
   */
  const handleClear = useCallback(() => {
    setPgnText('')
    if (onClearError) {
      onClearError()
    }
  }, [onClearError])

  /**
   * Handle Sample button click.
   */
  const handleLoadSample = useCallback(() => {
    setPgnText(SAMPLE_PGN)
    if (onClearError) {
      onClearError()
    }
  }, [onClearError])

  /**
   * Handle keyboard shortcut (Ctrl+Enter to load).
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleLoad()
      }
    },
    [handleLoad]
  )

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div
      className={`pgn-input ${className}`}
      data-testid={testId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {/* Textarea */}
      <textarea
        value={pgnText}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        data-testid="pgn-input-textarea"
        style={{
          width: '100%',
          minHeight: '150px',
          padding: '12px',
          fontFamily: 'monospace',
          fontSize: '13px',
          border: error ? '2px solid #e74c3c' : '1px solid #ccc',
          borderRadius: '4px',
          resize: 'vertical',
          backgroundColor: '#fafafa',
        }}
        aria-label="PGN input"
        aria-invalid={!!error}
      />

      {/* Error message */}
      {error && (
        <div
          data-testid="pgn-input-error"
          style={{
            color: '#e74c3c',
            fontSize: '13px',
            padding: '8px',
            backgroundColor: '#fdecea',
            borderRadius: '4px',
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {/* Load button */}
        <button
          onClick={handleLoad}
          disabled={!pgnText.trim() || isLoading}
          data-testid="load-pgn-button"
          style={{
            padding: '8px 16px',
            backgroundColor: pgnText.trim() ? '#2980b9' : '#bdc3c7',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: pgnText.trim() && !isLoading ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
          }}
        >
          {isLoading ? 'Loading...' : 'Load PGN'}
        </button>

        {/* Clear button */}
        <button
          onClick={handleClear}
          disabled={!pgnText}
          data-testid="clear-pgn-button"
          style={{
            padding: '8px 16px',
            backgroundColor: pgnText ? '#7f8c8d' : '#bdc3c7',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: pgnText ? 'pointer' : 'not-allowed',
          }}
        >
          Clear
        </button>

        {/* Sample button */}
        <button
          onClick={handleLoadSample}
          data-testid="sample-pgn-button"
          style={{
            padding: '8px 16px',
            backgroundColor: '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Load Sample
        </button>
      </div>

      {/* Hint text */}
      <div
        style={{
          fontSize: '12px',
          color: '#666',
        }}
      >
        Tip: Press <kbd style={{ backgroundColor: '#eee', padding: '2px 4px', borderRadius: '2px' }}>Ctrl</kbd>+<kbd style={{ backgroundColor: '#eee', padding: '2px 4px', borderRadius: '2px' }}>Enter</kbd> to load
      </div>
    </div>
  )
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default PgnInput
