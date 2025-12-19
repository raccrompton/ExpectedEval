/**
 * PgnInput Component Tests
 *
 * Tests for the PgnInput component that handles PGN text input
 * and loading chess games.
 *
 * Test categories:
 * - Rendering: Initial state, placeholder, buttons
 * - Input handling: Typing, clearing
 * - Load functionality: Button click, callback
 * - Error handling: Display, clearing
 * - Keyboard shortcuts: Ctrl+Enter
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PgnInput } from './PgnInput'

// ============================================================================
// RENDERING TESTS
// ============================================================================

describe('PgnInput - Rendering', () => {
  it('renders the textarea', () => {
    const onLoadPgn = vi.fn().mockReturnValue(true)

    render(<PgnInput onLoadPgn={onLoadPgn} />)

    expect(screen.getByTestId('pgn-input-textarea')).toBeInTheDocument()
  })

  it('renders the Load button', () => {
    const onLoadPgn = vi.fn().mockReturnValue(true)

    render(<PgnInput onLoadPgn={onLoadPgn} />)

    expect(screen.getByTestId('load-pgn-button')).toBeInTheDocument()
    expect(screen.getByText('Load PGN')).toBeInTheDocument()
  })

  it('renders the Clear button', () => {
    const onLoadPgn = vi.fn().mockReturnValue(true)

    render(<PgnInput onLoadPgn={onLoadPgn} />)

    expect(screen.getByTestId('clear-pgn-button')).toBeInTheDocument()
    expect(screen.getByText('Clear')).toBeInTheDocument()
  })

  it('renders the Sample button', () => {
    const onLoadPgn = vi.fn().mockReturnValue(true)

    render(<PgnInput onLoadPgn={onLoadPgn} />)

    expect(screen.getByTestId('sample-pgn-button')).toBeInTheDocument()
    expect(screen.getByText('Load Sample')).toBeInTheDocument()
  })

  it('uses custom placeholder when provided', () => {
    const onLoadPgn = vi.fn().mockReturnValue(true)

    render(<PgnInput onLoadPgn={onLoadPgn} placeholder="Custom placeholder" />)

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument()
  })

  it('uses custom data-testid when provided', () => {
    const onLoadPgn = vi.fn().mockReturnValue(true)

    render(<PgnInput onLoadPgn={onLoadPgn} data-testid="custom-pgn" />)

    expect(screen.getByTestId('custom-pgn')).toBeInTheDocument()
  })
})

// ============================================================================
// INPUT HANDLING TESTS
// ============================================================================

describe('PgnInput - Input Handling', () => {
  it('updates textarea value when typing', async () => {
    const onLoadPgn = vi.fn().mockReturnValue(true)
    const user = userEvent.setup()

    render(<PgnInput onLoadPgn={onLoadPgn} />)

    const textarea = screen.getByTestId('pgn-input-textarea')
    await user.type(textarea, '1. e4 e5')

    expect(textarea).toHaveValue('1. e4 e5')
  })

  it('clears textarea when Clear button is clicked', async () => {
    const onLoadPgn = vi.fn().mockReturnValue(true)
    const user = userEvent.setup()

    render(<PgnInput onLoadPgn={onLoadPgn} />)

    const textarea = screen.getByTestId('pgn-input-textarea')
    await user.type(textarea, '1. e4 e5')

    const clearButton = screen.getByTestId('clear-pgn-button')
    await user.click(clearButton)

    expect(textarea).toHaveValue('')
  })

  it('loads sample PGN when Sample button is clicked', async () => {
    const onLoadPgn = vi.fn().mockReturnValue(true)
    const user = userEvent.setup()

    render(<PgnInput onLoadPgn={onLoadPgn} />)

    const sampleButton = screen.getByTestId('sample-pgn-button')
    await user.click(sampleButton)

    const textarea = screen.getByTestId('pgn-input-textarea') as HTMLTextAreaElement
    // Use regex to check for substring match with toHaveValue
    expect(textarea.value).toContain('1. e4 e5')
  })
})

// ============================================================================
// LOAD FUNCTIONALITY TESTS
// ============================================================================

describe('PgnInput - Load Functionality', () => {
  it('calls onLoadPgn when Load button is clicked', async () => {
    const onLoadPgn = vi.fn().mockReturnValue(true)
    const user = userEvent.setup()

    render(<PgnInput onLoadPgn={onLoadPgn} />)

    const textarea = screen.getByTestId('pgn-input-textarea')
    await user.type(textarea, '1. e4 e5')

    const loadButton = screen.getByTestId('load-pgn-button')
    await user.click(loadButton)

    expect(onLoadPgn).toHaveBeenCalledTimes(1)
    expect(onLoadPgn).toHaveBeenCalledWith('1. e4 e5')
  })

  it('disables Load button when textarea is empty', () => {
    const onLoadPgn = vi.fn().mockReturnValue(true)

    render(<PgnInput onLoadPgn={onLoadPgn} />)

    const loadButton = screen.getByTestId('load-pgn-button')
    expect(loadButton).toBeDisabled()
  })

  it('enables Load button when textarea has content', async () => {
    const onLoadPgn = vi.fn().mockReturnValue(true)
    const user = userEvent.setup()

    render(<PgnInput onLoadPgn={onLoadPgn} />)

    const textarea = screen.getByTestId('pgn-input-textarea')
    await user.type(textarea, '1. e4')

    const loadButton = screen.getByTestId('load-pgn-button')
    expect(loadButton).not.toBeDisabled()
  })

  it('does not call onLoadPgn when Load button is clicked with empty textarea', async () => {
    const onLoadPgn = vi.fn().mockReturnValue(true)
    const user = userEvent.setup()

    render(<PgnInput onLoadPgn={onLoadPgn} />)

    const loadButton = screen.getByTestId('load-pgn-button')

    // Try to click (button should be disabled, but we test the handler too)
    await user.click(loadButton)

    expect(onLoadPgn).not.toHaveBeenCalled()
  })
})

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('PgnInput - Error Handling', () => {
  it('displays error message when error prop is provided', () => {
    const onLoadPgn = vi.fn().mockReturnValue(false)

    render(<PgnInput onLoadPgn={onLoadPgn} error="Invalid PGN format" />)

    expect(screen.getByTestId('pgn-input-error')).toBeInTheDocument()
    expect(screen.getByText('Invalid PGN format')).toBeInTheDocument()
  })

  it('does not display error when error prop is null', () => {
    const onLoadPgn = vi.fn().mockReturnValue(true)

    render(<PgnInput onLoadPgn={onLoadPgn} error={null} />)

    expect(screen.queryByTestId('pgn-input-error')).not.toBeInTheDocument()
  })

  it('calls onClearError when user starts typing after error', async () => {
    const onLoadPgn = vi.fn().mockReturnValue(false)
    const onClearError = vi.fn()
    const user = userEvent.setup()

    render(
      <PgnInput
        onLoadPgn={onLoadPgn}
        error="Invalid PGN"
        onClearError={onClearError}
      />
    )

    const textarea = screen.getByTestId('pgn-input-textarea')
    await user.type(textarea, 'x')

    expect(onClearError).toHaveBeenCalled()
  })

  it('calls onClearError when Clear button is clicked', async () => {
    const onLoadPgn = vi.fn().mockReturnValue(false)
    const onClearError = vi.fn()
    const user = userEvent.setup()

    render(
      <PgnInput
        onLoadPgn={onLoadPgn}
        error="Invalid PGN"
        onClearError={onClearError}
      />
    )

    // First add some text so Clear is enabled
    const textarea = screen.getByTestId('pgn-input-textarea')
    fireEvent.change(textarea, { target: { value: 'test' } })

    const clearButton = screen.getByTestId('clear-pgn-button')
    await user.click(clearButton)

    expect(onClearError).toHaveBeenCalled()
  })

  it('applies error styling to textarea when error exists', () => {
    const onLoadPgn = vi.fn().mockReturnValue(false)

    render(<PgnInput onLoadPgn={onLoadPgn} error="Invalid PGN" />)

    const textarea = screen.getByTestId('pgn-input-textarea')
    expect(textarea).toHaveAttribute('aria-invalid', 'true')
  })
})

// ============================================================================
// KEYBOARD SHORTCUT TESTS
// ============================================================================

describe('PgnInput - Keyboard Shortcuts', () => {
  it('loads PGN when Ctrl+Enter is pressed', async () => {
    const onLoadPgn = vi.fn().mockReturnValue(true)
    const user = userEvent.setup()

    render(<PgnInput onLoadPgn={onLoadPgn} />)

    const textarea = screen.getByTestId('pgn-input-textarea')
    await user.type(textarea, '1. e4 e5')

    // Simulate Ctrl+Enter
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })

    expect(onLoadPgn).toHaveBeenCalledWith('1. e4 e5')
  })

  it('loads PGN when Meta+Enter is pressed (Mac)', async () => {
    const onLoadPgn = vi.fn().mockReturnValue(true)
    const user = userEvent.setup()

    render(<PgnInput onLoadPgn={onLoadPgn} />)

    const textarea = screen.getByTestId('pgn-input-textarea')
    await user.type(textarea, '1. d4 d5')

    // Simulate Meta+Enter (Mac command key)
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })

    expect(onLoadPgn).toHaveBeenCalledWith('1. d4 d5')
  })
})
