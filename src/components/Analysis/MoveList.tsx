/**
 * MoveList Component
 *
 * Displays the game moves in traditional chess notation format.
 * Moves are clickable to navigate to that position.
 * The current move is highlighted.
 *
 * Layout:
 * - Move pairs displayed as: "1. e4 e5  2. Nf3 Nc6"
 * - Current move highlighted with background color
 * - Click any move to navigate to that position
 */

import type { MainlineMove } from '@/hooks/useChessGame'

interface MoveListProps {
  /** Array of mainline moves with path info */
  moves: MainlineMove[]

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

export function MoveList({ moves, currentPath, onMoveClick }: MoveListProps) {
  if (moves.length === 0) {
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

  // Group moves into pairs (White, Black)
  const movePairs: { number: number; white: MainlineMove; black?: MainlineMove }[] = []

  for (let i = 0; i < moves.length; i += 2) {
    const white = moves[i]
    const black = moves[i + 1]
    const moveNumber = Math.floor(i / 2) + 1

    movePairs.push({
      number: moveNumber,
      white,
      black,
    })
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
          gap: var(--space-xs);
          padding: var(--space-sm);
          font-family: var(--font-mono);
          font-size: 0.875rem;
          line-height: 1.6;
        }
        .move-pair {
          display: flex;
          align-items: center;
          gap: 2px;
          margin-right: var(--space-sm);
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
