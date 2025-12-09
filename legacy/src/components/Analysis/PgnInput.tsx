/**
 * PGN Input Component
 *
 * Provides a text area for users to paste PGN (Portable Game Notation) and load
 * it into the analysis board. This component replaces the game list in the
 * ExpectedEval MVP layout, enabling quick analysis of any chess game.
 *
 * PGN is the standard format for recording chess games. Example:
 * 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6
 *
 * @see https://en.wikipedia.org/wiki/Portable_Game_Notation
 */

import { useState, useCallback, useRef } from 'react'
import { DocumentTextIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { PlayIcon } from '@heroicons/react/24/solid'

import { Button } from 'src/components/ui'

/**
 * Props for the PgnInput component
 *
 * @property onPgnLoad - Callback function invoked when user loads valid PGN
 * @property isLoading - Optional flag to disable input during loading
 */
interface PgnInputProps {
  onPgnLoad: (pgn: string) => void
  isLoading?: boolean
}

/**
 * PgnInput Component
 *
 * Displays a textarea where users can paste PGN notation, with a "Load" button
 * to parse and load the game. Includes basic validation and error display.
 */
export const PgnInput: React.FC<PgnInputProps> = ({
  onPgnLoad,
  isLoading = false,
}) => {
  // Store the raw PGN text entered by the user
  const [pgnText, setPgnText] = useState<string>('')

  // Store any error message from validation
  const [error, setError] = useState<string | null>(null)

  // Reference to the textarea for focusing after clear
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /**
   * Handle changes to the textarea input
   * Clears any existing error when user starts typing
   */
  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPgnText(event.target.value)
      // Clear error when user modifies input
      if (error) {
        setError(null)
      }
    },
    [error],
  )

  /**
   * Handle the Load button click
   * Performs basic validation and calls the onPgnLoad callback
   */
  const handleLoad = useCallback(() => {
    // Trim whitespace and check for empty input
    const trimmedPgn = pgnText.trim()

    if (!trimmedPgn) {
      setError('Please enter PGN notation')
      return
    }

    // Basic validation: PGN should contain move numbers (e.g., "1." or "1...")
    // This is a simple heuristic, not full PGN parsing
    const hasMoveNumbers = /\d+\./.test(trimmedPgn)

    if (!hasMoveNumbers) {
      setError(
        'Invalid PGN format. PGN should contain move numbers (e.g., 1. e4)',
      )
      return
    }

    // Clear any previous error and call the callback
    setError(null)
    onPgnLoad(trimmedPgn)
  }, [pgnText, onPgnLoad])

  /**
   * Handle clearing the textarea
   * Resets both the text and any error message
   */
  const handleClear = useCallback(() => {
    setPgnText('')
    setError(null)
    // Focus the textarea after clearing for better UX
    textareaRef.current?.focus()
  }, [])

  /**
   * Handle keyboard shortcut: Ctrl/Cmd + Enter to load
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        handleLoad()
      }
    },
    [handleLoad],
  )

  return (
    <div className="border-border-1 flex h-full flex-col rounded-lg border bg-background-1/60 backdrop-blur-sm">
      {/* Header section with icon and title */}
      <div className="border-border-1 flex items-center gap-2 border-b p-3">
        <DocumentTextIcon className="text-text-secondary h-5 w-5" />
        <h3 className="text-text-primary text-sm font-medium">PGN Input</h3>
      </div>

      {/* Main content area with textarea */}
      <div className="flex flex-1 flex-col p-3">
        {/* Textarea for PGN input */}
        <textarea
          ref={textareaRef}
          value={pgnText}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Paste PGN here...&#10;&#10;Example:&#10;1. e4 e5 2. Nf3 Nc6 3. Bb5 a6"
          className={`border-border-1 focus:border-accent-1 min-h-[120px] flex-1 resize-none rounded border bg-background-2 p-2 font-mono text-xs focus:outline-none ${
            isLoading ? 'cursor-not-allowed opacity-50' : ''
          } ${error ? 'border-red-500' : ''}`}
          aria-label="PGN input textarea"
          aria-invalid={!!error}
          aria-describedby={error ? 'pgn-error' : undefined}
        />

        {/* Error message display */}
        {error && (
          <div
            id="pgn-error"
            className="mt-2 flex items-center gap-1 text-xs text-red-400"
            role="alert"
          >
            <XCircleIcon className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-3 flex gap-2">
          {/* Load button - primary action */}
          <Button
            onClick={handleLoad}
            disabled={isLoading || !pgnText.trim()}
            variant="primary"
            size="sm"
            className="flex-1"
          >
            <PlayIcon className="mr-1 h-4 w-4" />
            {isLoading ? 'Loading...' : 'Load'}
          </Button>

          {/* Clear button - secondary action */}
          <Button
            onClick={handleClear}
            disabled={isLoading || !pgnText}
            variant="outline"
            size="sm"
            className="px-3"
            aria-label="Clear PGN input"
          >
            Clear
          </Button>
        </div>

        {/* Keyboard shortcut hint */}
        <div className="text-text-secondary mt-2 text-center text-xs opacity-60">
          Press Ctrl+Enter to load
        </div>
      </div>
    </div>
  )
}
