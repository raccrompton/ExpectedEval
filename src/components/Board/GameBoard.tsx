/**
 * GameBoard Component - Chessground React Wrapper
 *
 * This component wraps the chessground library to provide a React-friendly
 * chess board UI. Chessground is the same board used by Lichess.org.
 *
 * Features:
 * - Display chess positions from FEN strings
 * - Highlight last move
 * - Show legal move hints
 * - Support hover preview (for EW tree)
 * - Responsive sizing
 *
 * Architecture:
 * - Uses useRef to manage the DOM element
 * - Uses useEffect to initialize and update chessground
 * - Chessground instance is stored in a ref to persist across renders
 *
 * Note on CSS:
 * This component requires chessground CSS to be loaded. Import the CSS
 * in your _app.tsx or global styles:
 *   import '@lichess-org/chessground/assets/chessground.base.css'
 *   import '@lichess-org/chessground/assets/chessground.brown.css'
 *   import '@lichess-org/chessground/assets/chessground.cburnett.css'
 *
 * @example
 * ```tsx
 * function Analysis() {
 *   const { currentFen } = useChessGame()
 *   return <GameBoard fen={currentFen} />
 * }
 * ```
 *
 * Dependencies:
 * - React: useRef, useEffect
 * - chessground: The chess board library
 * - chessops: For FEN parsing to extract piece positions
 */

'use client'

import { useRef, useEffect, useCallback } from 'react'
import { Chessground } from 'chessground'
import type { Api as ChessgroundApi } from 'chessground/api'
import type { Key } from 'chessground/types'
import { parseFen } from 'chessops/fen'

/**
 * Chessground configuration type.
 * We infer this from the Chessground function parameter since
 * the exact type export varies by chessground version.
 */
type ChessgroundConfig = NonNullable<Parameters<typeof Chessground>[1]>

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the GameBoard component.
 */
export interface GameBoardProps {
  /**
   * FEN string representing the current position.
   * The board will display this position.
   */
  fen: string

  /**
   * Optional: Callback when a move is made on the board.
   * Receives the from and to squares in UCI format.
   *
   * @param from - Source square (e.g., "e2")
   * @param to - Target square (e.g., "e4")
   */
  onMove?: (from: string, to: string) => void

  /**
   * Optional: Last move to highlight.
   * Array of two squares [from, to] or undefined.
   */
  lastMove?: [string, string]

  /**
   * Optional: Board orientation.
   * 'white' shows the board from White's perspective (default).
   * 'black' shows the board from Black's perspective.
   */
  orientation?: 'white' | 'black'

  /**
   * Optional: Whether the board should be interactive.
   * If false, the board is view-only (no drag/click).
   * Defaults to true.
   */
  interactive?: boolean

  /**
   * Optional: Whether to show coordinate labels (a-h, 1-8).
   * Defaults to true.
   */
  coordinates?: boolean

  /**
   * Optional: CSS class name for custom styling.
   */
  className?: string

  /**
   * Optional: Custom styles for the container.
   */
  style?: React.CSSProperties

  /**
   * Optional: data-testid for testing.
   */
  'data-testid'?: string
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert FEN to chessground piece configuration.
 *
 * Chessground expects pieces as a Map of square -> piece.
 * This function parses FEN and creates that map.
 *
 * @param fen - Position in FEN notation
 * @returns Map of squares to piece objects, or undefined if invalid
 */
function fenToPieces(
  fen: string
): Map<Key, { role: string; color: 'white' | 'black' }> | undefined {
  // Parse the FEN using chessops
  const result = parseFen(fen)

  if (!result.isOk) {
    return undefined
  }

  const { board } = result.value
  const pieces = new Map<Key, { role: string; color: 'white' | 'black' }>()

  // Iterate through all squares (0-63)
  // chessops uses 0 = a1, 63 = h8
  for (let sq = 0; sq < 64; sq++) {
    const piece = board.get(sq)

    if (piece) {
      // Convert square number to algebraic notation
      // File: sq % 8 (0-7 = a-h)
      // Rank: floor(sq / 8) + 1 (1-8)
      const file = String.fromCharCode(97 + (sq % 8)) // 'a' = 97
      const rank = Math.floor(sq / 8) + 1
      const square = `${file}${rank}` as Key

      // Map chessops role to chessground role
      const roleMap: Record<string, string> = {
        pawn: 'pawn',
        knight: 'knight',
        bishop: 'bishop',
        rook: 'rook',
        queen: 'queen',
        king: 'king',
      }

      pieces.set(square, {
        role: roleMap[piece.role] || piece.role,
        color: piece.color,
      })
    }
  }

  return pieces
}

/**
 * Extract turn (whose move) from FEN.
 *
 * @param fen - Position in FEN notation
 * @returns 'white' or 'black'
 */
function fenToTurn(fen: string): 'white' | 'black' {
  // FEN format: position turn castling en-passant halfmove fullmove
  // Turn is the second field: 'w' or 'b'
  const parts = fen.split(' ')
  return parts[1] === 'b' ? 'black' : 'white'
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Chess board component using chessground.
 *
 * Renders a chess position and optionally handles user interaction.
 */
export function GameBoard({
  fen,
  onMove,
  lastMove,
  orientation = 'white',
  interactive = true,
  coordinates = true,
  className = '',
  style,
  'data-testid': testId = 'game-board',
}: GameBoardProps) {
  // ---------------------------------------------------------------------------
  // REFS
  // ---------------------------------------------------------------------------

  /**
   * Ref for the container DOM element.
   * Chessground will render into this element.
   */
  const containerRef = useRef<HTMLDivElement>(null)

  /**
   * Ref for the chessground API instance.
   * We store this so we can update the board without re-creating it.
   */
  const groundRef = useRef<ChessgroundApi | null>(null)

  // ---------------------------------------------------------------------------
  // MOVE HANDLER
  // ---------------------------------------------------------------------------

  /**
   * Handle move from chessground.
   * Called when user drags or clicks to move a piece.
   */
  const handleMove = useCallback(
    (orig: Key, dest: Key) => {
      if (onMove) {
        onMove(orig, dest)
      }
    },
    [onMove]
  )

  // ---------------------------------------------------------------------------
  // INITIALIZATION EFFECT
  // ---------------------------------------------------------------------------

  /**
   * Initialize chessground on mount.
   */
  useEffect(() => {
    // Guard: need container element
    if (!containerRef.current) return

    // Parse pieces from FEN
    const pieces = fenToPieces(fen)
    const turn = fenToTurn(fen)

    // Build initial configuration
    const config: ChessgroundConfig = {
      // Position
      fen: fen,
      orientation: orientation,
      turnColor: turn,

      // Appearance
      coordinates: coordinates,
      animation: {
        enabled: true,
        duration: 150,
      },

      // Interaction
      viewOnly: !interactive,
      movable: interactive
        ? {
            free: false, // Only legal moves (we'll compute externally)
            color: 'both', // Allow moving both colors (for analysis)
            showDests: false, // We don't compute legal moves here
          }
        : undefined,

      // Highlighting
      lastMove: lastMove as Key[] | undefined,
      highlight: {
        lastMove: true,
        check: true,
      },

      // Event handlers
      events: interactive
        ? {
            move: handleMove,
          }
        : undefined,
    }

    // Create the chessground instance
    groundRef.current = Chessground(containerRef.current, config)

    // Cleanup on unmount
    return () => {
      if (groundRef.current) {
        groundRef.current.destroy()
        groundRef.current = null
      }
    }
    // Only run on mount (empty deps would cause issues with refs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // UPDATE EFFECTS
  // ---------------------------------------------------------------------------

  /**
   * Update board when FEN changes.
   */
  useEffect(() => {
    if (!groundRef.current) return

    const pieces = fenToPieces(fen)
    const turn = fenToTurn(fen)

    // Update the board position
    groundRef.current.set({
      fen: fen,
      turnColor: turn,
      lastMove: lastMove as Key[] | undefined,
    })
  }, [fen, lastMove])

  /**
   * Update orientation when it changes.
   */
  useEffect(() => {
    if (!groundRef.current) return
    groundRef.current.set({ orientation })
  }, [orientation])

  /**
   * Update interactivity when it changes.
   */
  useEffect(() => {
    if (!groundRef.current) return
    groundRef.current.set({
      viewOnly: !interactive,
      movable: interactive
        ? {
            free: false,
            color: 'both',
            showDests: false,
          }
        : undefined,
    })
  }, [interactive])

  /**
   * Update move handler when it changes.
   */
  useEffect(() => {
    if (!groundRef.current) return
    groundRef.current.set({
      events: interactive
        ? {
            move: handleMove,
          }
        : undefined,
    })
  }, [interactive, handleMove])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      className={`cg-wrap ${className}`}
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        ...style,
      }}
      data-testid={testId}
    />
  )
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default GameBoard
