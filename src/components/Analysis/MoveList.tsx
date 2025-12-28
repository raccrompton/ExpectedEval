/**
 * MoveList Component
 *
 * Displays the game moves in traditional chess notation format with inline variations.
 * Moves are clickable to navigate to that position.
 * The current move is highlighted.
 *
 * Layout:
 * - Move pairs displayed as: "1. e4 e5  2. Nf3 Nc6"
 * - Variations displayed inline at branching point: (2. Bc4 Nc6)
 * - Current move highlighted with background color
 * - Click any move to navigate to that position
 */

import type { MainlineMove, MoveTreeNode } from '@/hooks/useChessGame'

interface MoveListProps {
  /** Array of mainline moves with path info (for backward compatibility) */
  moves: MainlineMove[]

  /** Full move tree with variations (optional, enables inline variation display) */
  movesWithVariations?: MoveTreeNode[]

  /** Current path (used to determine which move is current) */
  currentPath: number[]

  /** Callback when a move is clicked */
  onMoveClick: (path: number[]) => void
}

/**
 * Check if two paths are equal.
 */
function pathsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  return a.every((val, index) => val === b[index])
}

/**
 * Get move number from ply.
 * Ply 1 = move 1, Ply 2 = move 1, Ply 3 = move 2, etc.
 */
function getMoveNumber(ply: number): number {
  return Math.ceil(ply / 2)
}

/**
 * Check if this is a White move (odd ply).
 */
function isWhiteMove(ply: number): boolean {
  return ply % 2 === 1
}

interface MoveButtonProps {
  move: MoveTreeNode
  currentPath: number[]
  onMoveClick: (path: number[]) => void
  showMoveNumber?: boolean
  isVariation?: boolean
}

function MoveButton({
  move,
  currentPath,
  onMoveClick,
  showMoveNumber = false,
  isVariation = false,
}: MoveButtonProps) {
  const isCurrent = pathsEqual(move.path, currentPath)
  const moveNumber = getMoveNumber(move.ply)
  const isWhite = isWhiteMove(move.ply)

  // Use ply-based testid for mainline, path-based for variations
  const testId = isVariation ? `var-move-${move.path.join('-')}` : `move-${move.ply - 1}`

  return (
    <>
      {showMoveNumber && (
        <span className={`move-number ${isVariation ? 'variation-number' : ''}`}>
          {moveNumber}.{!isWhite && '..'}
        </span>
      )}
      <button
        data-testid={testId}
        className={`move ${isCurrent ? 'current' : ''} ${isVariation ? 'variation-move' : ''}`}
        data-current={isCurrent}
        onClick={() => onMoveClick(move.path)}
        type="button"
      >
        {move.san}
      </button>
    </>
  )
}

interface VariationLineProps {
  moves: MoveTreeNode[]
  currentPath: number[]
  onMoveClick: (path: number[]) => void
  depth?: number
}

function VariationLine({ moves, currentPath, onMoveClick, depth = 0 }: VariationLineProps) {
  if (moves.length === 0) return null

  return (
    <span className={`variation depth-${depth}`} data-variation="true">
      <span className="variation-paren">(</span>
      {moves.map((move, idx) => {
        const isFirstMove = idx === 0
        const prevMove = idx > 0 ? moves[idx - 1] : null
        const needsMoveNumber =
          isFirstMove || (prevMove !== null && getMoveNumber(move.ply) !== getMoveNumber(prevMove.ply))

        return (
          <span key={move.path.join('-')} className="variation-move-container">
            <MoveButton
              move={move}
              currentPath={currentPath}
              onMoveClick={onMoveClick}
              showMoveNumber={!!needsMoveNumber}
              isVariation={true}
            />
            {move.variations.map((varLine, varIdx) => (
              <VariationLine
                key={`var-${move.path.join('-')}-${varIdx}`}
                moves={varLine}
                currentPath={currentPath}
                onMoveClick={onMoveClick}
                depth={depth + 1}
              />
            ))}
          </span>
        )
      })}
      <span className="variation-paren">)</span>
    </span>
  )
}

export function MoveList({
  moves,
  movesWithVariations,
  currentPath,
  onMoveClick,
}: MoveListProps) {
  // Use movesWithVariations if provided, otherwise fall back to basic moves
  const hasVariations = movesWithVariations && movesWithVariations.length > 0
  const displayMoves = hasVariations ? movesWithVariations : []

  // Empty state
  if (moves.length === 0 && displayMoves.length === 0) {
    return (
      <div data-testid="move-list" className="move-list empty">
        <span className="empty-text">No moves</span>
        <style jsx>{`
          .move-list.empty {
            padding: var(--space-md);
            color: var(--color-text-muted);
            font-style: italic;
          }
        `}</style>
      </div>
    )
  }

  // Render with variations if available
  if (hasVariations) {
    return (
      <div data-testid="move-list" className="move-list with-variations">
        {displayMoves.map((move, idx) => {
          const prevMove = idx > 0 ? displayMoves[idx - 1] : null
          const needsMoveNumber =
            idx === 0 ||
            isWhiteMove(move.ply) ||
            (prevMove !== null && getMoveNumber(move.ply) !== getMoveNumber(prevMove.ply))

          return (
            <span key={move.path.join('-')} className="mainline-move-container">
              <MoveButton
                move={move}
                currentPath={currentPath}
                onMoveClick={onMoveClick}
                showMoveNumber={!!needsMoveNumber}
              />
              {move.variations.map((varLine, varIdx) => (
                <VariationLine
                  key={`var-${move.path.join('-')}-${varIdx}`}
                  moves={varLine}
                  currentPath={currentPath}
                  onMoveClick={onMoveClick}
                />
              ))}
            </span>
          )
        })}
        <style jsx>{`
          .move-list {
            display: flex;
            flex-wrap: wrap;
            align-items: baseline;
            gap: 2px;
            padding: var(--space-xs);
            font-family: var(--font-mono);
            font-size: 0.75rem;
            line-height: 1.6;
            flex: 1;
            min-height: 0;
            overflow: hidden;
            position: relative;
          }
          .move-list::after {
            content: '...';
            position: absolute;
            bottom: 0;
            right: 0;
            background: linear-gradient(to right, transparent, var(--color-surface) 50%);
            padding-left: 16px;
            padding-right: 4px;
            font-size: 0.75rem;
            color: var(--color-text-muted);
          }
          .mainline-move-container {
            display: inline;
          }
          .mainline-move-container :global(.move-number) {
            color: var(--color-text-muted);
            font-weight: 500;
            margin-left: 4px;
          }
          .mainline-move-container :global(.move) {
            padding: 2px 4px;
            font-family: inherit;
            font-size: inherit;
            font-weight: 500;
            color: var(--color-text);
            background: transparent;
            border: none;
            border-radius: var(--radius-xs);
            cursor: pointer;
            transition: background-color 0.1s ease;
          }
          .mainline-move-container :global(.move:hover) {
            background: var(--color-hover);
          }
          .mainline-move-container :global(.move.current) {
            background: var(--color-primary);
            color: white;
          }
          .mainline-move-container :global(.move.current:hover) {
            background: var(--color-primary-dark);
          }
          .mainline-move-container :global(.variation) {
            display: inline;
            font-size: 0.8125rem;
            color: var(--color-text-muted);
            margin-left: 4px;
          }
          .mainline-move-container :global(.variation-paren) {
            color: var(--color-text-muted);
          }
          .mainline-move-container :global(.variation-move-container) {
            display: inline;
          }
          .mainline-move-container :global(.variation-number) {
            color: var(--color-text-muted);
            font-weight: 400;
            margin-left: 2px;
          }
          .mainline-move-container :global(.variation-move) {
            padding: 1px 3px;
            font-size: 0.8125rem;
          }
          .mainline-move-container :global(.depth-1) {
            font-size: 0.75rem;
          }
          .mainline-move-container :global(.depth-2) {
            font-size: 0.6875rem;
          }
        `}</style>
      </div>
    )
  }

  // Fallback: Render basic move pairs without variations
  const movePairs: { number: number; white: MainlineMove; black?: MainlineMove }[] = []
  for (let i = 0; i < moves.length; i += 2) {
    const white = moves[i]
    const black = moves[i + 1]
    const moveNumber = Math.floor(i / 2) + 1
    movePairs.push({ number: moveNumber, white, black })
  }

  return (
    <div data-testid="move-list" className="move-list">
      {movePairs.map((pair) => {
        const blackMove = pair.black
        return (
          <div key={pair.number} className="move-pair">
            <span className="move-number">{pair.number}.</span>
            <button
              data-testid={`move-${pair.white.ply - 1}`}
              className={`move ${pathsEqual(pair.white.path, currentPath) ? 'current' : ''}`}
              data-current={pathsEqual(pair.white.path, currentPath)}
              onClick={() => onMoveClick(pair.white.path)}
              type="button"
            >
              {pair.white.san}
            </button>
            {blackMove && (
              <button
                data-testid={`move-${blackMove.ply - 1}`}
                className={`move ${pathsEqual(blackMove.path, currentPath) ? 'current' : ''}`}
                data-current={pathsEqual(blackMove.path, currentPath)}
                onClick={() => onMoveClick(blackMove.path)}
                type="button"
              >
                {blackMove.san}
              </button>
            )}
          </div>
        )
      })}
      <style jsx>{`
        .move-list {
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
          padding: var(--space-xs);
          font-family: var(--font-mono);
          font-size: 0.75rem;
          line-height: 1.6;
          flex: 1;
          min-height: 0;
          overflow: hidden;
          position: relative;
        }
        .move-list::after {
          content: '...';
          position: absolute;
          bottom: 0;
          right: 0;
          background: linear-gradient(to right, transparent, var(--color-surface) 50%);
          padding-left: 16px;
          padding-right: 4px;
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        .move-pair {
          display: flex;
          align-items: center;
          gap: 2px;
          margin-right: var(--space-xs);
        }
        .move-number {
          color: var(--color-text-muted);
          font-weight: 500;
          margin-right: 2px;
        }
        .move {
          padding: 2px 6px;
          font-family: inherit;
          font-size: inherit;
          font-weight: 500;
          color: var(--color-text);
          background: transparent;
          border: none;
          border-radius: var(--radius-xs);
          cursor: pointer;
          transition: background-color 0.1s ease;
        }
        .move:hover {
          background: var(--color-hover);
        }
        .move.current {
          background: var(--color-primary);
          color: white;
        }
        .move.current:hover {
          background: var(--color-primary-dark);
        }
      `}</style>
    </div>
  )
}
