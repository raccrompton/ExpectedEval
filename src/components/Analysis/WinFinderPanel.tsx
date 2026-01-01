/**
 * WinFinderPanel Component
 *
 * Displays Win Finder analysis results - positions where Stockfish
 * sees equality but Maia strongly prefers one move ("hidden edge" positions).
 *
 * Features:
 * - Analyze button to trigger analysis
 * - Progress bar during calculation
 * - List of positions sorted by disagreement score
 * - Clickable items to navigate to position
 * - Color coding for disagreement severity
 */

import { useState, useCallback, useMemo } from 'react'
import { useWinFinder } from '@/hooks'
import type { PositionDisagreement, PositionInput } from '@/core/analysis'

interface WinFinderPanelProps {
  /** Positions to analyze (from game tree) */
  positions: PositionInput[]
  /** Callback when user clicks a result to navigate */
  onNavigate?: (path: number[]) => void
}

/**
 * Format a winrate (0.0-1.0) as a percentage string.
 */
function formatWinrate(winrate: number): string {
  return `${(winrate * 100).toFixed(1)}%`
}

/**
 * Format a disagreement score for display.
 */
function formatScore(score: number): string {
  return score.toFixed(1)
}

/**
 * Get color for disagreement severity.
 */
function getScoreColor(score: number): string {
  if (score >= 5) return 'var(--color-success, #22c55e)'
  if (score >= 3) return 'var(--color-primary, #FFE000)'
  return 'var(--color-text-muted, #666)'
}

/**
 * Get severity label for disagreement score.
 */
function getSeverityLabel(score: number): string {
  if (score >= 5) return 'Strong hidden edge'
  if (score >= 3) return 'Hidden edge'
  return 'Slight disagreement'
}

export function WinFinderPanel({ positions, onNavigate }: WinFinderPanelProps) {
  const { result, status, progress, error, analyze, reset, canAnalyze } = useWinFinder()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const handleAnalyze = useCallback(() => {
    analyze(positions)
  }, [analyze, positions])

  const handleNavigate = useCallback(
    (path: number[] | undefined) => {
      if (path) {
        onNavigate?.(path)
      }
    },
    [onNavigate]
  )

  const isAnalyzing = status === 'analyzing'
  const isIdle = status === 'idle'
  const hasResult = status === 'complete' && result !== null

  return (
    <div className="win-finder-panel" data-testid="win-finder-panel">
      {/* Show explanation and button when idle */}
      {isIdle && (
        <div className="wf-idle" data-testid="wf-idle">
          <div className="wf-description">
            <p className="wf-headline">
              Win Finder scans your game for &quot;hidden edge&quot; positions where you have a practical advantage.
            </p>
            <ul className="wf-benefits">
              <li>
                <strong>Spot tricky positions</strong> — Find where the engine shows equality
                but one side has an easier path to play
              </li>
              <li>
                <strong>Exploit human tendencies</strong> — See positions where your opponent
                is likely to make natural but costly mistakes
              </li>
              <li>
                <strong>Learn from disagreements</strong> — Understand why certain
                &quot;equal&quot; positions favor one side in practice
              </li>
            </ul>
          </div>
          <button
            className="analyze-button"
            data-testid="wf-analyze-button"
            onClick={handleAnalyze}
            disabled={!canAnalyze || positions.length === 0}
          >
            {canAnalyze && positions.length > 0 ? 'Analyze Game' : 'Loading...'}
          </button>
        </div>
      )}

      {/* Header with button during/after analysis */}
      {!isIdle && (
        <div className="wf-header">
          <button
            className="analyze-button"
            data-testid="wf-analyze-button"
            onClick={handleAnalyze}
            disabled={!canAnalyze || positions.length === 0 || isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
          </button>
          {hasResult && (
            <button
              className="reset-button"
              data-testid="wf-reset-button"
              onClick={reset}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {isAnalyzing && progress && (
        <div className="wf-progress" data-testid="wf-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <span className="progress-text">
            {progress.current}/{progress.total} positions
          </span>
        </div>
      )}

      {error && (
        <div className="wf-error" data-testid="wf-error">
          Error: {error.message}
        </div>
      )}

      {hasResult && result && (
        <div className="wf-results" data-testid="wf-results">
          {result.positions.length === 0 ? (
            <div className="wf-empty">
              No significant disagreements found in this game.
            </div>
          ) : (
            <>
              <div className="wf-summary">
                Found {result.positions.length} hidden edge position
                {result.positions.length !== 1 ? 's' : ''} in {result.calculationTimeMs}ms
              </div>
              <div className="wf-list">
                {result.positions.map((pos, index) => (
                  <WinFinderItem
                    key={`${pos.fen}-${pos.ply}`}
                    position={pos}
                    rank={index + 1}
                    isExpanded={expandedIndex === index}
                    onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        .win-finder-panel {
          display: flex;
          flex-direction: column;
          gap: var(--space-md, 16px);
        }

        .wf-idle {
          display: flex;
          flex-direction: column;
          gap: var(--space-md, 16px);
          padding: var(--space-md, 16px);
          background: var(--color-surface, #111);
          border: var(--border-thin, 1px) solid var(--color-border, #333);
        }

        .wf-description {
          font-size: var(--font-sm, 13px);
          font-family: var(--font-mono);
          color: var(--color-text-muted, #888);
          line-height: 1.6;
        }

        .wf-headline {
          margin: 0 0 var(--space-sm, 8px) 0;
          color: var(--color-text, #fff);
          font-weight: 600;
        }

        .wf-benefits {
          margin: 0;
          padding-left: var(--space-md, 16px);
          list-style: none;
        }

        .wf-benefits li {
          margin-bottom: var(--space-xs, 4px);
          position: relative;
        }

        .wf-benefits li::before {
          content: '→';
          position: absolute;
          left: calc(-1 * var(--space-md, 16px));
          color: var(--color-primary, #FFE000);
        }

        .wf-benefits strong {
          color: var(--color-text, #fff);
        }

        .wf-header {
          display: flex;
          gap: var(--space-sm, 8px);
          align-items: center;
        }

        .analyze-button {
          background: var(--color-primary, #FFE000);
          color: var(--color-background, #0a0a0a);
          border: none;
          padding: var(--space-sm, 8px) var(--space-lg, 24px);
          cursor: pointer;
          font-weight: 700;
          font-size: var(--font-xs, 11px);
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          transition: all 0.1s ease;
        }

        .analyze-button:hover:not(:disabled) {
          background: var(--color-background, #0a0a0a);
          color: var(--color-primary, #FFE000);
          outline: 2px solid var(--color-primary, #FFE000);
        }

        .analyze-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .reset-button {
          background: transparent;
          border: var(--border-thin, 1px) solid var(--color-border, #333);
          color: var(--color-text-muted, #666);
          padding: var(--space-sm, 8px) var(--space-md, 16px);
          cursor: pointer;
          font-size: var(--font-xs, 11px);
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          transition: all 0.1s ease;
        }

        .reset-button:hover {
          border-color: var(--color-text-muted, #666);
          color: var(--color-text, #fff);
        }

        .wf-progress {
          display: flex;
          align-items: center;
          gap: var(--space-md, 16px);
        }

        .progress-bar {
          flex: 1;
          height: 8px;
          background: var(--color-border, #333);
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--color-primary, #FFE000);
          transition: width 0.2s ease;
        }

        .progress-text {
          font-size: var(--font-xs, 11px);
          font-family: var(--font-mono);
          color: var(--color-text-muted, #666);
          white-space: nowrap;
        }

        .wf-error {
          color: var(--color-error, #FF3333);
          font-size: var(--font-xs, 11px);
          font-family: var(--font-mono);
          padding: var(--space-sm, 8px);
          background: var(--color-error-bg, rgba(255, 51, 51, 0.1));
          border-left: var(--border-thick, 3px) solid var(--color-error, #FF3333);
        }

        .wf-results {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm, 8px);
        }

        .wf-summary {
          font-size: var(--font-xs, 11px);
          font-family: var(--font-mono);
          color: var(--color-text-muted, #666);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .wf-empty {
          font-size: var(--font-sm, 13px);
          font-family: var(--font-mono);
          color: var(--color-text-muted, #666);
          padding: var(--space-lg, 24px);
          text-align: center;
        }

        .wf-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs, 4px);
        }
      `}</style>
    </div>
  )
}

interface WinFinderItemProps {
  position: PositionDisagreement
  rank: number
  isExpanded: boolean
  onToggle: () => void
  onNavigate: (path: number[] | undefined) => void
}

/**
 * Single Win Finder result item.
 * Shows position info, disagreement score, and explanation.
 */
function WinFinderItem({
  position,
  rank,
  isExpanded,
  onToggle,
  onNavigate,
}: WinFinderItemProps) {
  // Calculate SF spread and Maia advantage from the data
  const sfSpread = useMemo(() => {
    const winrates = position.allMoves.map(m => m.sfWinrate).sort((a, b) => b - a)
    if (winrates.length < 2) return 0
    return winrates[0] - winrates[Math.min(4, winrates.length - 1)]
  }, [position.allMoves])

  const maiaAdvantage = useMemo(() => {
    const winrates = position.allMoves.map(m => m.maiaWinrate).sort((a, b) => b - a)
    if (winrates.length < 2) return 0
    return winrates[0] - winrates[1]
  }, [position.allMoves])

  return (
    <div
      className="wf-item"
      data-testid={`wf-item-${rank}`}
      onClick={() => onNavigate(position.path)}
    >
      <div className="item-header">
        <span className="item-rank">#{rank}</span>
        <span className="item-ply">Ply {position.ply}</span>
        <span
          className="item-score"
          style={{ color: getScoreColor(position.disagreementScore) }}
        >
          Score: {formatScore(position.disagreementScore)}
        </span>
        <button
          className="expand-toggle"
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      <div className="item-summary">
        <div className="summary-row">
          <span className="label">SF:</span>
          <span className="value">
            All moves {formatWinrate(position.sfTopMove.sfWinrate)} (spread: {formatWinrate(sfSpread)})
          </span>
        </div>
        <div className="summary-row">
          <span className="label">Maia:</span>
          <span className="value">
            {position.maiaTopMove.move} is {formatWinrate(position.maiaTopMove.maiaWinrate)},
            others {formatWinrate(position.maiaTopMove.maiaWinrate - maiaAdvantage)}
            (advantage: {formatWinrate(maiaAdvantage)})
          </span>
        </div>
        <div className="description">
          → {getSeverityLabel(position.disagreementScore)}: {position.maiaTopMove.move} gives humans a practical advantage
        </div>
      </div>

      {isExpanded && (
        <div className="item-details">
          <table className="moves-table">
            <thead>
              <tr>
                <th>Move</th>
                <th>SF</th>
                <th>SF Rank</th>
                <th>Maia</th>
                <th>Maia Rank</th>
              </tr>
            </thead>
            <tbody>
              {position.allMoves
                .sort((a, b) => a.maiaRank - b.maiaRank)
                .slice(0, 10)
                .map((move) => (
                  <tr key={move.uci}>
                    <td className="move-san">{move.move}</td>
                    <td>{formatWinrate(move.sfWinrate)}</td>
                    <td>#{move.sfRank}</td>
                    <td>{formatWinrate(move.maiaWinrate)}</td>
                    <td>#{move.maiaRank}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .wf-item {
          background: var(--color-surface, #111);
          border: var(--border-thin, 1px) solid var(--color-border, #333);
          padding: var(--space-sm, 8px) var(--space-md, 16px);
          cursor: pointer;
          transition: all 0.1s ease;
        }

        .wf-item:hover {
          border-color: var(--color-primary, #FFE000);
          background: rgba(255, 224, 0, 0.05);
        }

        .item-header {
          display: flex;
          align-items: center;
          gap: var(--space-md, 16px);
          margin-bottom: var(--space-xs, 4px);
        }

        .item-rank {
          font-weight: 700;
          font-size: var(--font-md, 15px);
          color: var(--color-text, #fff);
          font-family: var(--font-mono);
        }

        .item-ply {
          font-size: var(--font-xs, 11px);
          color: var(--color-text-muted, #666);
          font-family: var(--font-mono);
        }

        .item-score {
          font-weight: 700;
          font-size: var(--font-sm, 13px);
          font-family: var(--font-mono);
          margin-left: auto;
        }

        .expand-toggle {
          background: transparent;
          border: var(--border-thin, 1px) solid var(--color-border, #333);
          color: var(--color-text-muted, #666);
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: var(--font-md, 15px);
          font-family: var(--font-mono);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .expand-toggle:hover {
          border-color: var(--color-text-muted, #666);
          color: var(--color-text, #fff);
        }

        .item-summary {
          font-size: var(--font-xs, 11px);
          font-family: var(--font-mono);
        }

        .summary-row {
          display: flex;
          gap: var(--space-sm, 8px);
          padding: 2px 0;
        }

        .label {
          color: var(--color-text-muted, #666);
          min-width: 40px;
        }

        .value {
          color: var(--color-text, #fff);
        }

        .description {
          color: var(--color-primary, #FFE000);
          margin-top: var(--space-xs, 4px);
        }

        .item-details {
          margin-top: var(--space-sm, 8px);
          padding-top: var(--space-sm, 8px);
          border-top: var(--border-thin, 1px) solid var(--color-border, #333);
        }

        .moves-table {
          width: 100%;
          font-size: var(--font-xs, 11px);
          font-family: var(--font-mono);
          border-collapse: collapse;
        }

        .moves-table th {
          text-align: left;
          padding: 4px 8px;
          color: var(--color-text-muted, #666);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: var(--border-thin, 1px) solid var(--color-border, #333);
        }

        .moves-table td {
          padding: 4px 8px;
          color: var(--color-text, #fff);
        }

        .moves-table tr:nth-child(odd) td {
          background: rgba(255, 255, 255, 0.02);
        }

        .move-san {
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
