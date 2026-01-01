/**
 * EWTable Component
 *
 * Table-based Expected Winrate visualization with horizontal ply columns.
 * Replaces the TreeColumn component for better visual scanning.
 *
 * Features:
 * - Fixed columns per ply (vertically aligned)
 * - Horizontal scroll for deep lines
 * - "+" to expand alternatives (adds rows below)
 * - "-" to collapse expanded branches
 * - Line EW and Likelihood columns
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  treeToTableRows,
  getMoveNumberFromFen,
  getColorFromFen,
  type EWTableLine,
  type EWTableCell,
} from '@/core/analysis/treeToTable'
import type { EWCandidateResult, TreeNode } from '@/core/analysis'

/** Evaluation source for displaying winrates */
type EvalSource = 'stockfish' | 'maia'

interface EWTableProps {
  /** Selected candidate to display tree for */
  candidate: EWCandidateResult
  /** Which evaluation source to use */
  evalSource: EvalSource
  /** Callback when user clicks to navigate to a position */
  onNavigate?: (_fen: string) => void
  /** Callback when user hovers over a node */
  onNodeHover?: (_event: React.MouseEvent | null, _node: TreeNode | null) => void
}

/**
 * Formats a winrate (0.0-1.0) as a percentage string.
 */
function formatWinrate(winrate: number): string {
  return `${(winrate * 100).toFixed(1)}%`
}

/**
 * Formats a probability (0.0-1.0) as a rounded percentage string.
 */
function formatProbability(prob: number): string {
  return `${(prob * 100).toFixed(1)}%`
}

/**
 * Formats move number with PGN notation.
 * White moves: "30."
 * Black moves: "30..." (only for first black move in a line)
 */
function formatMoveWithNumber(
  cell: EWTableCell,
  isFirstInLine: boolean
): string {
  if (cell.color === 'w') {
    return `${cell.moveNumber}. ${cell.san}`
  }
  if (isFirstInLine) {
    return `${cell.moveNumber}... ${cell.san}`
  }
  return cell.san
}

export function EWTable({
  candidate,
  evalSource,
  onNavigate,
  onNodeHover,
}: EWTableProps) {
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set())

  // Get base move number and color from the tree root's FEN
  const baseMoveNumber = useMemo(
    () => getMoveNumberFromFen(candidate.tree.fen),
    [candidate.tree.fen]
  )
  const baseColor = useMemo(
    () => getColorFromFen(candidate.tree.fen),
    [candidate.tree.fen]
  )

  // Transform tree to table rows
  const rows = useMemo(
    () => treeToTableRows(candidate.tree, expandedCells, baseMoveNumber, baseColor),
    [candidate.tree, expandedCells, baseMoveNumber, baseColor]
  )

  // Calculate max ply count for table columns
  const maxPly = useMemo(
    () => Math.max(1, ...rows.map((r) => r.moves.length)),
    [rows]
  )

  /**
   * Handles expand/collapse with focused mode behavior:
   * - Clicking + focuses on that ply-0 branch (hides other branches)
   * - Within a focused branch, accordion behavior applies
   * - Collapsing the last expansion returns to default mode (all branches visible)
   *
   * Keys include branch context: "rowId:plyIndex-san" (e.g., "mainline:1-Bg7")
   */
  const handleCellToggle = useCallback((rowId: string, plyIndex: number, san: string) => {
    const key = `${rowId}:${plyIndex}-${san}`
    setExpandedCells((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        // Collapse: remove this key and any deeper expansions within the same branch
        next.delete(key)
        for (const existingKey of prev) {
          if (existingKey.startsWith(`${rowId}:`)) {
            const plyPart = existingKey.split(':')[1]
            const [existingPly] = plyPart.split('-')
            if (parseInt(existingPly, 10) > plyIndex) {
              next.delete(existingKey)
            }
          }
        }
      } else {
        // Expand: clear ALL previous expansions (switch to this branch's focused mode)
        // Then add the new expansion
        next.clear()
        next.add(key)
      }
      return next
    })
  }, [])

  // Reset expanded state when candidate changes
  useEffect(() => {
    setExpandedCells(new Set())
  }, [candidate.move])

  return (
    <div className="ew-table-container" data-testid="ew-table">
      <div className="table-scroll">
        <table className="ew-table">
          <thead>
            <tr>
              {Array.from({ length: maxPly }, (_, i) => (
                <th key={i} className="ply-header">
                  Ply {i + 1}
                </th>
              ))}
              <th className="ew-header">Line EW</th>
              <th className="likelihood-header">Likelihood</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <EWTableRow
                key={row.id}
                row={row}
                maxPly={maxPly}
                evalSource={evalSource}
                expandedCells={expandedCells}
                onCellToggle={handleCellToggle}
                onNavigate={onNavigate}
                onNodeHover={onNodeHover}
              />
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .ew-table-container {
          font-family: var(--font-mono);
          font-size: var(--font-sm, 13px);
        }

        .table-scroll {
          overflow-x: auto;
          max-height: 400px;
          overflow-y: auto;
        }

        .ew-table {
          width: 100%;
          border-collapse: collapse;
          min-width: max-content;
        }

        .ew-table th {
          position: sticky;
          top: 0;
          background: var(--color-background, #0a0a0a);
          z-index: 1;
          font-size: var(--font-xs, 11px);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--color-text-muted, #666);
          padding: var(--space-xs, 4px) var(--space-sm, 8px);
          text-align: left;
          border-bottom: var(--border-medium, 2px) solid var(--color-border, #333);
          white-space: nowrap;
        }

        .ply-header {
          min-width: 80px;
        }

        .ew-header,
        .likelihood-header {
          min-width: 70px;
          text-align: right;
        }
      `}</style>
    </div>
  )
}

interface EWTableRowProps {
  row: EWTableLine
  maxPly: number
  evalSource: EvalSource
  expandedCells: Set<string>
  onCellToggle: (_rowId: string, _plyIndex: number, _san: string) => void
  onNavigate?: (_fen: string) => void
  onNodeHover?: (_event: React.MouseEvent | null, _node: TreeNode | null) => void
}

function EWTableRow({
  row,
  maxPly,
  evalSource: _evalSource,
  expandedCells,
  onCellToggle,
  onNavigate,
  onNodeHover,
}: EWTableRowProps) {
  const isMainline = row.id === 'mainline'

  // Get Line EW (from leaf node)
  const lineEW = row.lineEW

  return (
    <tr
      className={`table-row ${isMainline ? 'mainline' : 'alternative'}`}
      data-testid={`ew-table-row-${row.id}`}
    >
      {/* Render cells for each ply */}
      {Array.from({ length: maxPly }, (_, plyIndex) => {
        const cell = row.moves[plyIndex - row.branchDepth]
        const isFirstCell = plyIndex === row.branchDepth

        // Empty cell if this ply is before the branch point
        if (plyIndex < row.branchDepth) {
          return (
            <td key={plyIndex} className="empty-cell">
              {/* Empty for alignment */}
            </td>
          )
        }

        // Empty cell if no move at this position
        if (!cell) {
          return (
            <td key={plyIndex} className="empty-cell">
              {/* No move */}
            </td>
          )
        }

        // Key format includes row context: "rowId:plyIndex-san"
        // For alternative rows, use the parent row ID to maintain branch context
        const branchRowId = row.parentLineId ?? row.id
        const cellKey = `${branchRowId}:${cell.plyIndex}-${cell.san}`
        const isExpanded = expandedCells.has(cellKey)

        return (
          <td
            key={plyIndex}
            className="move-cell"
            data-testid={`ew-table-cell-${cell.plyIndex}-${cell.san}`}
          >
            <div className="cell-content">
              <span
                className="move-text"
                onMouseEnter={(e) => onNodeHover?.(e, cell.node)}
                onMouseLeave={() => onNodeHover?.(null, null)}
                onClick={() => onNavigate?.(cell.node.fen)}
              >
                {formatMoveWithNumber(cell, isFirstCell)}
              </span>
              {cell.hasAlternatives && (
                <button
                  className="expand-btn"
                  data-testid={isExpanded ? `ew-collapse-${cell.plyIndex}-${cell.san}` : `ew-expand-${cell.plyIndex}-${cell.san}`}
                  onClick={() => onCellToggle(branchRowId, cell.plyIndex, cell.san)}
                  title={isExpanded ? 'Collapse alternatives' : 'Show alternatives'}
                >
                  {isExpanded ? '−' : '+'}
                </button>
              )}
            </div>
          </td>
        )
      })}

      {/* Line EW column */}
      <td className="ew-cell" data-testid={`ew-line-ew-${row.id}`}>
        {lineEW !== null ? formatWinrate(lineEW) : '—'}
      </td>

      {/* Likelihood column */}
      <td className="likelihood-cell" data-testid={`ew-likelihood-${row.id}`}>
        {formatProbability(row.likelihood)}
      </td>

      <style jsx>{`
        .table-row {
          border-bottom: 1px solid var(--color-border, #222);
        }

        .table-row.mainline {
          background: rgba(255, 224, 0, 0.05);
        }

        .table-row.alternative {
          background: transparent;
        }

        .table-row:hover {
          background: var(--color-surface-hover, #1a1a1a);
        }

        td {
          padding: var(--space-xs, 4px) var(--space-sm, 8px);
          vertical-align: middle;
        }

        .empty-cell {
          /* Empty cell styling */
        }

        .move-cell {
          white-space: nowrap;
        }

        .cell-content {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .move-text {
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 0;
          transition: background 0.1s ease;
        }

        .move-text:hover {
          background: var(--color-primary, #FFE000);
          color: var(--color-background, #0a0a0a);
        }

        .expand-btn {
          background: transparent;
          border: 1px solid var(--color-border, #333);
          color: var(--color-text-muted, #666);
          width: 18px;
          height: 18px;
          font-size: 14px;
          font-weight: bold;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: all 0.1s ease;
        }

        .expand-btn:hover {
          background: var(--color-primary, #FFE000);
          border-color: var(--color-primary, #FFE000);
          color: var(--color-background, #0a0a0a);
        }

        .ew-cell,
        .likelihood-cell {
          text-align: right;
          font-weight: 600;
          color: var(--color-primary, #FFE000);
        }

        .likelihood-cell {
          color: var(--color-text-muted, #666);
        }
      `}</style>
    </tr>
  )
}

export default EWTable
