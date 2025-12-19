/**
 * MoveList Component - Interactive Move Navigation
 *
 * This component displays the moves of a chess game in standard notation,
 * allowing users to click on any move to navigate to that position.
 *
 * Features:
 * - Display moves in standard PGN format (1. e4 e5 2. Nf3 Nc6 ...)
 * - Click any move to navigate to that position
 * - Highlight current move
 * - Show variations (alternative moves)
 * - Support keyboard navigation
 *
 * Architecture:
 * - Receives game tree and current path from parent
 * - Calls onNavigate callback when user clicks a move
 * - Pure presentation component (no internal state)
 *
 * @example
 * ```tsx
 * function Analysis() {
 *   const { game, currentPath, actions } = useChessGame()
 *
 *   return (
 *     <MoveList
 *       game={game}
 *       currentPath={currentPath}
 *       onNavigate={actions.goToPath}
 *     />
 *   )
 * }
 * ```
 *
 * Dependencies:
 * - React: useCallback
 * - chessops/pgn: Game tree types
 */

'use client'

import { useCallback, useMemo } from 'react'
import { isChildNode, type Game, type PgnNodeData, type Node } from 'chessops/pgn'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the MoveList component.
 */
export interface MoveListProps {
  /**
   * The game tree to display.
   * Contains all moves and variations.
   */
  game: Game<PgnNodeData> | null

  /**
   * Current position in the game tree.
   * Used to highlight the current move.
   */
  currentPath: number[]

  /**
   * Callback when user clicks a move.
   * Called with the path to the clicked move.
   *
   * @param path - Path to the clicked move
   */
  onNavigate: (path: number[]) => void

  /**
   * Optional: Whether to show variations.
   * Defaults to true.
   */
  showVariations?: boolean

  /**
   * Optional: CSS class name for custom styling.
   */
  className?: string

  /**
   * Optional: data-testid for testing.
   */
  'data-testid'?: string
}

/**
 * Represents a move for rendering.
 */
interface RenderMove {
  /**
   * Move in SAN notation (e.g., "e4").
   */
  san: string

  /**
   * Path to this move in the game tree.
   */
  path: number[]

  /**
   * Whether this is the current move (highlighted).
   */
  isCurrent: boolean

  /**
   * Whether this is a variation (not mainline).
   */
  isVariation: boolean

  /**
   * Move number (e.g., 1 for White's first move).
   */
  moveNumber: number

  /**
   * Whether this is a White move (needs move number prefix).
   */
  isWhite: boolean
}

/**
 * A line of moves (mainline or variation).
 */
interface MoveLine {
  /**
   * Moves in this line.
   */
  moves: RenderMove[]

  /**
   * Nested variations from moves in this line.
   */
  variations: MoveLine[]

  /**
   * Depth of this variation (0 = mainline).
   */
  depth: number
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if two paths are equal.
 */
function pathsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  return a.every((val, idx) => val === b[idx])
}

/**
 * Build moves for rendering from the game tree.
 *
 * Traverses the tree and creates a flat structure of moves
 * with their paths and metadata for rendering.
 */
function buildMoveList(
  game: Game<PgnNodeData>,
  currentPath: number[],
  showVariations: boolean
): MoveLine {
  /**
   * Recursively traverse a node and its children.
   */
  function traverseNode(
    node: Node<PgnNodeData>,
    path: number[],
    moveNumber: number,
    isWhite: boolean,
    depth: number
  ): MoveLine {
    const moves: RenderMove[] = []
    const variations: MoveLine[] = []

    // Process children
    node.children.forEach((child, index) => {
      const childPath = [...path, index]
      const isMainline = index === 0

      // Add the move
      moves.push({
        san: child.data.san || '?',
        path: childPath,
        isCurrent: pathsEqual(childPath, currentPath),
        isVariation: !isMainline && depth === 0,
        moveNumber: moveNumber,
        isWhite: isWhite,
      })

      // If this is a mainline move, continue with its children
      if (isMainline) {
        const continuation = traverseNode(
          child,
          childPath,
          isWhite ? moveNumber : moveNumber + 1,
          !isWhite,
          depth
        )

        // Add continuation moves
        moves.push(...continuation.moves)
        variations.push(...continuation.variations)
      } else if (showVariations) {
        // This is a variation - process it separately
        const variation = traverseNode(
          child,
          childPath,
          moveNumber,
          isWhite,
          depth + 1
        )

        // Add the first move and the rest as a variation line
        variations.push({
          moves: [
            {
              san: child.data.san || '?',
              path: childPath,
              isCurrent: pathsEqual(childPath, currentPath),
              isVariation: true,
              moveNumber: moveNumber,
              isWhite: isWhite,
            },
            ...variation.moves,
          ],
          variations: variation.variations,
          depth: depth + 1,
        })
      }
    })

    return { moves, variations, depth }
  }

  // Start from the root
  // The first move in a standard game is White's (move 1)
  return traverseNode(game.moves, [], 1, true, 0)
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Move list component for navigating through a chess game.
 *
 * Displays moves in PGN format and allows clicking to navigate.
 */
export function MoveList({
  game,
  currentPath,
  onNavigate,
  showVariations = true,
  className = '',
  'data-testid': testId = 'move-list',
}: MoveListProps) {
  // ---------------------------------------------------------------------------
  // MOVE LIST COMPUTATION
  // ---------------------------------------------------------------------------

  /**
   * Build the move list structure.
   * Memoized to avoid recomputing on every render.
   */
  const moveLine = useMemo(() => {
    if (!game) return null
    return buildMoveList(game, currentPath, showVariations)
  }, [game, currentPath, showVariations])

  // ---------------------------------------------------------------------------
  // EVENT HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle click on a move.
   */
  const handleMoveClick = useCallback(
    (path: number[]) => {
      onNavigate(path)
    },
    [onNavigate]
  )

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Render a single move.
   */
  const renderMove = (move: RenderMove, index: number) => {
    // Determine if we need to show the move number
    // Show for: first move, White moves, or after variation
    const showNumber = move.isWhite || index === 0

    // Build the move number string
    const numberStr = showNumber
      ? move.isWhite
        ? `${move.moveNumber}.`
        : `${move.moveNumber}...`
      : ''

    return (
      <span
        key={move.path.join('-')}
        className="move-container"
        style={{ display: 'inline' }}
      >
        {/* Move number */}
        {showNumber && (
          <span
            className="move-number"
            style={{
              color: '#666',
              marginRight: '2px',
            }}
          >
            {numberStr}
          </span>
        )}

        {/* Move button */}
        <button
          onClick={() => handleMoveClick(move.path)}
          className={`move ${move.isCurrent ? 'current' : ''}`}
          data-testid={`move-${move.path.join('-')}`}
          style={{
            background: move.isCurrent ? '#b0d0ff' : 'transparent',
            border: 'none',
            padding: '2px 4px',
            margin: '1px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontWeight: move.isCurrent ? 'bold' : 'normal',
            color: move.isVariation ? '#666' : '#000',
          }}
        >
          {move.san}
        </button>

        {/* Space after move */}
        <span> </span>
      </span>
    )
  }

  /**
   * Render a variation line.
   */
  const renderVariation = (variation: MoveLine, index: number) => {
    return (
      <span
        key={`var-${index}`}
        className="variation"
        style={{
          display: 'inline',
          color: '#666',
          fontSize: '0.9em',
        }}
      >
        <span>(</span>
        {variation.moves.map((move, idx) => renderMove(move, idx))}
        {/* Nested variations */}
        {variation.variations.map((nested, idx) => renderVariation(nested, idx))}
        <span>) </span>
      </span>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  // Empty state
  if (!game || !moveLine) {
    return (
      <div
        className={`move-list empty ${className}`}
        data-testid={testId}
        style={{
          padding: '16px',
          color: '#666',
          fontStyle: 'italic',
        }}
      >
        No game loaded. Paste a PGN to begin.
      </div>
    )
  }

  // No moves
  if (moveLine.moves.length === 0) {
    return (
      <div
        className={`move-list empty ${className}`}
        data-testid={testId}
        style={{
          padding: '16px',
          color: '#666',
          fontStyle: 'italic',
        }}
      >
        Starting position
      </div>
    )
  }

  return (
    <div
      className={`move-list ${className}`}
      data-testid={testId}
      style={{
        padding: '8px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        lineHeight: '1.8',
        overflowY: 'auto',
      }}
    >
      {/* Mainline moves */}
      {moveLine.moves.map((move, idx) => renderMove(move, idx))}

      {/* Variations */}
      {moveLine.variations.map((variation, idx) =>
        renderVariation(variation, idx)
      )}
    </div>
  )
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default MoveList
