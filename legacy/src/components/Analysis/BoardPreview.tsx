/**
 * Board Preview Component
 *
 * Displays a mini chess board showing a position from a clicked tree node.
 * This non-interactive board is used to preview positions when exploring
 * the probability tree in the Expected Winrate analysis.
 *
 * Uses Chessground (same library as GameBoard) for rendering, but configured
 * for view-only mode without move capabilities.
 *
 * @see src/components/Board/GameBoard.tsx for the main interactive board
 */

import { useMemo } from 'react'
import Chessground from '@react-chess/chessground'
import type { Key } from 'chessground/types'
import { EyeIcon } from '@heroicons/react/24/outline'

/**
 * Props for the BoardPreview component
 *
 * @property fen - Position to display in FEN notation, null shows placeholder
 * @property lastMove - Optional [from, to] squares to highlight the last move
 * @property orientation - Board orientation (white at bottom or black at bottom)
 */
interface BoardPreviewProps {
  fen: string | null
  lastMove?: [string, string]
  orientation?: 'white' | 'black'
}

/**
 * BoardPreview Component
 *
 * Renders a small, non-interactive chess board for position preview.
 * When no position is provided (fen is null), shows a placeholder message.
 */
export const BoardPreview: React.FC<BoardPreviewProps> = ({
  fen,
  lastMove,
  orientation = 'white',
}) => {
  /**
   * Memoize the Chessground configuration to prevent unnecessary re-renders
   *
   * The board is configured with:
   * - viewOnly: true - disables all interaction
   * - coordinates: false - hides board coordinates for cleaner look
   * - lastMove: highlights the squares if provided
   */
  const boardConfig = useMemo(() => {
    if (!fen) return null

    // Convert lastMove array to the format Chessground expects
    const lastMoveKeys = lastMove
      ? ([lastMove[0] as Key, lastMove[1] as Key] as Key[])
      : undefined

    return {
      // The position to display in FEN notation
      fen,
      // Which color is at the bottom of the board
      orientation,
      // Highlight the last move if provided
      lastMove: lastMoveKeys,
      // Disable all user interaction - this is view-only
      viewOnly: true,
      // Hide coordinates for a cleaner appearance in small size
      coordinates: false,
      // Disable move animations for snappier position changes
      animation: { enabled: false },
      // Disable drag and drop
      draggable: { enabled: false },
      // Disable selection
      selectable: { enabled: false },
    }
  }, [fen, lastMove, orientation])

  return (
    <div className="border-border-1 flex h-full flex-col rounded-lg border bg-background-1/60 backdrop-blur-sm">
      {/* Header with icon and title */}
      <div className="border-border-1 flex items-center gap-2 border-b p-3">
        <EyeIcon className="text-text-secondary h-5 w-5" />
        <h3 className="text-text-primary text-sm font-medium">Board Preview</h3>
      </div>

      {/* Board container - maintains aspect ratio */}
      <div className="flex flex-1 items-center justify-center p-3">
        {boardConfig ? (
          // Render the Chessground board with our configuration
          <div className="aspect-square w-full max-w-[200px]">
            <Chessground contained config={boardConfig} />
          </div>
        ) : (
          // Placeholder when no position is selected
          <div className="text-text-secondary text-center">
            <EyeIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p className="text-xs opacity-75">
              Click a tree node
              <br />
              to preview position
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
