/**
 * EWSection Component
 *
 * Container for Expected Winrate analysis functionality.
 * Auto-calculates EW using Maia when position changes.
 * Provides optional Stockfish enrichment on demand.
 *
 * Features:
 * - Auto-calculation with Maia (fast)
 * - Optional SF enrichment button
 * - Eval source toggle (Stockfish/Maia)
 * - Expandable candidate moves with EW and play probability
 * - Tree nodes with tree connectors showing eval
 * - Hover tooltips with full details
 * - Click-to-navigate functionality
 */

import { useState, useCallback, useEffect } from 'react'
import { useExpectedWinrate, type EWStatus } from '@/hooks'
import { useSettingsContext } from '@/contexts'
import type { EWResult, EWCandidateResult, TreeNode } from '@/core/analysis'

/** Evaluation source for displaying winrates in the EW tree */
type EvalSource = 'stockfish' | 'maia'

interface EWSectionProps {
  /** Current position FEN to calculate EW for */
  fen: string
  /** Whether Maia engine is ready (SF is optional) */
  isEngineReady: boolean
  /** Callback when user clicks a tree node to preview that position */
  onNavigate?: (fen: string) => void
}

/**
 * Formats a winrate (0.0-1.0) as a percentage string.
 * @param winrate - Win probability between 0 and 1
 * @returns Formatted percentage string (e.g., "52.3%")
 */
function formatWinrate(winrate: number): string {
  return `${(winrate * 100).toFixed(1)}%`
}

/**
 * Formats a probability (0.0-1.0) as a rounded percentage string.
 * @param prob - Probability between 0 and 1
 * @returns Formatted percentage string (e.g., "35%")
 */
function formatProbability(prob: number): string {
  return `${(prob * 100).toFixed(0)}%`
}

/**
 * Returns human-readable text for the calculation status.
 * @param status - Current EW calculation status
 * @returns Display text for the status
 */
function getStatusText(status: EWStatus): string {
  switch (status) {
    case 'idle':
      return 'Waiting for engines...'
    case 'calculating_maia':
      return 'Analyzing with Maia...'
    case 'complete_maia':
      return 'Maia analysis complete'
    case 'enriching_sf':
      return 'Adding Stockfish analysis...'
    case 'complete':
      return 'Complete (with Stockfish)'
    case 'error':
      return 'Error'
    default:
      return 'Unknown'
  }
}

/**
 * Returns CSS color value for the calculation status.
 * @param status - Current EW calculation status
 * @returns CSS color variable or hex value
 */
function getStatusColor(status: EWStatus): string {
  switch (status) {
    case 'complete':
      return 'var(--color-success, #22c55e)'
    case 'complete_maia':
      return 'var(--color-success-muted, #86efac)'
    case 'error':
      return 'var(--color-error, #ef4444)'
    case 'calculating_maia':
    case 'enriching_sf':
      return 'var(--color-warning, #f59e0b)'
    default:
      return 'var(--color-text-muted, #6b7280)'
  }
}

export function EWSection({ fen, isEngineReady, onNavigate }: EWSectionProps) {
  const { settings } = useSettingsContext()

  // Hook now auto-triggers on fen change
  const {
    result,
    status,
    progress,
    error,
    config,
    enrichWithSF,
    updateConfig,
    canEnrichSF,
  } = useExpectedWinrate(fen)

  const [showConfig, setShowConfig] = useState(false)
  // Default to Maia since it's available first
  const [evalSource, setEvalSource] = useState<EvalSource>('maia')

  useEffect(() => {
    updateConfig({
      probabilityThreshold: settings.probabilityThreshold,
      winrateLossThreshold: settings.winrateLossThreshold,
      maiaLevel: settings.maiaLevel,
      stockfishDepth: settings.stockfishDepth,
    })
  }, [settings, updateConfig])

  const isCalculating = status === 'calculating_maia' || status === 'enriching_sf'
  const hasResult = (status === 'complete_maia' || status === 'complete') && result !== null

  return (
    <div className="ew-section" data-testid="ew-section">
      <div className="ew-header">
        <div className="ew-controls">
          <button
            className="config-toggle"
            data-testid="ew-config-toggle"
            onClick={() => setShowConfig(!showConfig)}
            title="Configure EW parameters"
            aria-label="Configure Expected Winrate parameters"
            aria-expanded={showConfig}
          >
            ⚙
          </button>
        </div>
      </div>

      <div className="ew-status" data-testid="ew-status">
        <span style={{ color: getStatusColor(status) }}>
          {isCalculating && progress
            ? `${progress.phase}: ${progress.message}`
            : getStatusText(status)}
        </span>
      </div>

      {showConfig && (
        <div className="ew-config-panel" data-testid="ew-config-panel">
          <div className="config-row">
            <label>Probability Threshold:</label>
            <span>{(config.probabilityThreshold * 100).toFixed(0)}%</span>
          </div>
          <div className="config-row">
            <label>Winrate Loss Threshold:</label>
            <span>{(config.winrateLossThreshold * 100).toFixed(0)}%</span>
          </div>
          <div className="config-row">
            <label>Maia Level:</label>
            <span>{config.maiaLevel}</span>
          </div>
        </div>
      )}

      {/* SF enrichment button - shown when Maia analysis is complete but SF not yet run */}
      {canEnrichSF && (
        <button
          className="sf-button"
          data-testid="add-sf-analysis-button"
          onClick={enrichWithSF}
          disabled={status === 'enriching_sf'}
        >
          {status === 'enriching_sf' ? 'Adding Stockfish...' : 'Add Stockfish Analysis'}
        </button>
      )}

      {error && (
        <div className="ew-error">
          Error: {error.message}
        </div>
      )}

      {hasResult && result && (
        <EWResults
          result={result}
          evalSource={evalSource}
          onEvalSourceChange={setEvalSource}
          onNavigate={onNavigate}
        />
      )}

      <style jsx>{`
        .ew-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm, 8px);
        }

        .ew-header {
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        .ew-controls {
          display: flex;
          gap: var(--space-xs, 4px);
        }

        .config-toggle {
          background: transparent;
          border: 1px solid var(--color-border, #333);
          color: var(--color-text-muted, #888);
          padding: 2px 8px;
          border-radius: var(--radius-sm, 4px);
          cursor: pointer;
          font-size: 0.875rem;
        }

        .config-toggle:hover {
          background: var(--color-surface-hover, #2a2a2a);
        }

        .ew-status {
          font-size: 0.75rem;
          font-weight: 500;
        }

        .ew-config-panel {
          background: var(--color-surface-alt, #1a1a1a);
          border: 1px solid var(--color-border, #333);
          border-radius: var(--radius-sm, 4px);
          padding: var(--space-sm, 8px);
          font-size: 0.75rem;
        }

        .config-row {
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
        }

        .config-row label {
          color: var(--color-text-muted, #888);
        }

        .sf-button {
          background: var(--color-secondary, #6366f1);
          color: white;
          border: none;
          padding: var(--space-sm, 8px) var(--space-md, 16px);
          border-radius: var(--radius-sm, 4px);
          cursor: pointer;
          font-weight: 500;
          font-size: 0.875rem;
          transition: background 0.2s ease;
        }

        .sf-button:hover:not(:disabled) {
          background: var(--color-secondary-hover, #4f46e5);
        }

        .sf-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ew-error {
          color: var(--color-error, #ef4444);
          font-size: 0.75rem;
          padding: var(--space-sm, 8px);
          background: var(--color-error-bg, rgba(239, 68, 68, 0.1));
          border-radius: var(--radius-sm, 4px);
        }
      `}</style>
    </div>
  )
}

interface EWResultsProps {
  result: EWResult
  evalSource: EvalSource
  onEvalSourceChange: (source: EvalSource) => void
  onNavigate?: (fen: string) => void
}

/**
 * Formats a nullable winrate, showing "—" if null.
 */
function formatNullableWinrate(winrate: number | null): string {
  return winrate !== null ? formatWinrate(winrate) : '—'
}

/**
 * Displays EW calculation results including summary stats, candidate moves, and tree.
 * SF values show "—" until enrichWithStockfish() is called.
 */
function EWResults({ result, evalSource, onEvalSourceChange, onNavigate }: EWResultsProps) {
  const bestCandidate = result.candidates[0]

  return (
    <div className="ew-results" data-testid="ew-results">
      <div className="ew-summary">
        <div className="summary-row">
          <span className="summary-label">EW (Stockfish):</span>
          <span className="summary-value" data-testid="ew-sf-value">
            {bestCandidate ? formatNullableWinrate(bestCandidate.expectedWinrateSF) : 'N/A'}
          </span>
        </div>
        <div className="summary-row">
          <span className="summary-label">EW (Maia):</span>
          <span className="summary-value" data-testid="ew-maia-value">
            {bestCandidate ? formatWinrate(bestCandidate.expectedWinrateMaia) : 'N/A'}
          </span>
        </div>
      </div>

      <EWTree
        candidates={result.candidates}
        evalSource={evalSource}
        onEvalSourceChange={onEvalSourceChange}
        onNavigate={onNavigate}
      />

      <div className="ew-meta">
        <span>Calculated in {result.calculationTimeMs}ms</span>
      </div>

      <style jsx>{`
        .ew-results {
          display: flex;
          flex-direction: column;
          gap: var(--space-md, 16px);
          margin-top: var(--space-sm, 8px);
        }

        .ew-summary {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs, 4px);
          padding: var(--space-sm, 8px);
          background: var(--color-surface-alt, #1a1a1a);
          border-radius: var(--radius-sm, 4px);
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
        }

        .summary-label {
          color: var(--color-text-muted, #888);
        }

        .summary-value {
          font-weight: 600;
          font-family: var(--font-mono, monospace);
        }

        .ew-meta {
          font-size: 0.6875rem;
          color: var(--color-text-muted, #888);
          text-align: right;
        }
      `}</style>
    </div>
  )
}

interface EWTreeProps {
  candidates: EWCandidateResult[]
  evalSource: EvalSource
  onEvalSourceChange: (source: EvalSource) => void
  onNavigate?: (fen: string) => void
}

/** Maximum number of top-level candidate moves to display */
const MAX_DISPLAYED_CANDIDATES = 5
/** Maximum number of branch alternatives to show at each branch point */
const MAX_BRANCHES = 5

/** A line in the tree display */
interface TreeLine {
  moves: string[] // Moves shown on this line
  leafEval: number | null // Eval if this is a leaf
  leafFen: string // FEN of final position
  indent: number // Indentation level (in character widths of moves before branch)
}

/**
 * Gets the mainline (most likely continuation) and collects branch lines.
 * Returns { mainlineMoves, mainlineEval, mainlineFen, branches }
 */
function extractMainlineAndBranches(
  node: TreeNode,
  evalSource: EvalSource,
): { mainlineMoves: string[]; mainlineEval: number | null; mainlineFen: string; branches: TreeLine[] } {
  const branches: TreeLine[] = []

  function traverse(
    current: TreeNode,
    pathMoves: string[],
    branchIndent: number,
  ): { moves: string[]; eval_: number | null; fen: string } {
    const sortedChildren = [...current.children].sort((a, b) => b.probability - a.probability)

    if (sortedChildren.length === 0) {
      // Leaf
      const eval_ = evalSource === 'stockfish' ? current.sfWinrate : current.maiaWinrate
      return { moves: pathMoves, eval_: eval_, fen: current.fen }
    }

    // Process branches (non-main children) first
    for (let i = 1; i < Math.min(sortedChildren.length, MAX_BRANCHES); i++) {
      const branchChild = sortedChildren[i]
      const branchResult = traverse(
        branchChild,
        [branchChild.san || branchChild.move || '?'],
        pathMoves.length,
      )
      branches.push({
        moves: branchResult.moves,
        leafEval: branchResult.eval_,
        leafFen: branchResult.fen,
        indent: branchIndent,
      })
    }

    // Follow main line
    const mainChild = sortedChildren[0]
    const newPath = [...pathMoves, mainChild.san || mainChild.move || '?']
    return traverse(mainChild, newPath, pathMoves.length + 1)
  }

  const main = traverse(node, [], 0)
  return {
    mainlineMoves: main.moves,
    mainlineEval: main.eval_,
    mainlineFen: main.fen,
    branches,
  }
}

/**
 * Interactive tree visualization of Expected Winrate candidates.
 * Display: candidate + mainline on same row, branches indented below.
 *
 * e3 Nf6 Nf3 Ng8 Ng1    EW: 48.9%    31.2%
 *        Qf3                         39.6%
 *    Nc6                             50.9%
 */
function EWTree({ candidates, evalSource, onEvalSourceChange, onNavigate }: EWTreeProps) {
  const [expandedCandidates, setExpandedCandidates] = useState<Set<number>>(new Set())
  const [tooltipData, setTooltipData] = useState<{
    candidate: EWCandidateResult
    x: number
    y: number
  } | null>(null)

  useEffect(() => {
    setExpandedCandidates(new Set())
    setTooltipData(null)
  }, [candidates])

  const toggleCandidate = useCallback((index: number) => {
    setExpandedCandidates((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const handleCandidateHover = useCallback(
    (event: React.MouseEvent, candidate: EWCandidateResult) => {
      const rect = event.currentTarget.getBoundingClientRect()
      const tooltipWidth = 280
      const tooltipHeight = 180
      const padding = 8

      let x = rect.left - tooltipWidth - padding
      if (x < 0) x = rect.right + padding
      if (x + tooltipWidth > window.innerWidth) x = padding

      let y = rect.top
      if (y + tooltipHeight > window.innerHeight) {
        y = Math.max(padding, window.innerHeight - tooltipHeight - padding)
      }

      setTooltipData({ candidate, x, y })
    },
    [],
  )

  const handleMouseLeave = useCallback(() => {
    setTooltipData(null)
  }, [])

  const handleNavigate = useCallback(
    (fen: string) => {
      onNavigate?.(fen)
    },
    [onNavigate],
  )

  if (candidates.length === 0) return null

  const sortedCandidates = [...candidates].sort((a, b) => {
    const ewA =
      evalSource === 'stockfish'
        ? (a.expectedWinrateSF ?? a.expectedWinrateMaia)
        : a.expectedWinrateMaia
    const ewB =
      evalSource === 'stockfish'
        ? (b.expectedWinrateSF ?? b.expectedWinrateMaia)
        : b.expectedWinrateMaia
    return ewB - ewA
  })

  return (
    <div className="ew-tree" data-testid="ew-tree">
      <div className="eval-source-toggle" data-testid="eval-source-toggle">
        <span className="toggle-label">Eval source:</span>
        <label className="radio-option" data-testid="eval-source-sf">
          <input
            type="radio"
            name="evalSource"
            value="stockfish"
            checked={evalSource === 'stockfish'}
            onChange={() => onEvalSourceChange('stockfish')}
          />
          <span>Stockfish</span>
        </label>
        <label className="radio-option" data-testid="eval-source-maia">
          <input
            type="radio"
            name="evalSource"
            value="maia"
            checked={evalSource === 'maia'}
            onChange={() => onEvalSourceChange('maia')}
          />
          <span>Maia</span>
        </label>
      </div>

      <div className="tree-container">
        {sortedCandidates.slice(0, MAX_DISPLAYED_CANDIDATES).map((candidate, index) => {
          const isExpanded = expandedCandidates.has(index)
          const ew =
            evalSource === 'stockfish'
              ? (candidate.expectedWinrateSF ?? candidate.expectedWinrateMaia)
              : candidate.expectedWinrateMaia

          // Extract mainline and branches
          const { mainlineMoves, mainlineEval, mainlineFen, branches } = extractMainlineAndBranches(
            candidate.tree,
            evalSource,
          )

          // Full mainline includes candidate move
          const fullMainline = [candidate.san, ...mainlineMoves].join(' ')

          return (
            <div key={candidate.move} className="candidate-block">
              <div
                className="candidate-row"
                data-testid={`ew-tree-candidate-${index}`}
                onMouseEnter={(e) => handleCandidateHover(e, candidate)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleNavigate(mainlineFen || candidate.tree.fen)}
              >
                {branches.length > 0 ? (
                  <button
                    className="expand-btn"
                    data-testid={`ew-tree-expand-${index}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleCandidate(index)
                    }}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                ) : (
                  <span className="expand-spacer" />
                )}
                <span className="mainline">{fullMainline}</span>
                <span className="candidate-ew">EW: {formatWinrate(ew)}</span>
                <span className="leaf-eval">
                  {mainlineEval !== null ? formatWinrate(mainlineEval) : '—'}
                </span>
              </div>

              {isExpanded && branches.length > 0 && (
                <div className="branches-container" data-testid={`ew-tree-branches-${index}`}>
                  {branches.map((branch, branchIdx) => {
                    // Calculate indent: candidate move width + space + moves before branch
                    // Use ch units for accurate character-width-based indentation
                    const indentChars = candidate.san.length + 1 + branch.indent * 4
                    return (
                      <div
                        key={branchIdx}
                        className="branch-line"
                        style={{ paddingLeft: `calc(20px + ${indentChars}ch)` }}
                        onClick={() => handleNavigate(branch.leafFen)}
                      >
                        <span className="branch-moves">{branch.moves.join(' ')}</span>
                        <span className="branch-eval">
                          {branch.leafEval !== null ? formatWinrate(branch.leafEval) : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {tooltipData && (
        <div
          className="ew-tooltip"
          data-testid="ew-tree-tooltip"
          style={{
            position: 'fixed',
            left: `${tooltipData.x}px`,
            top: `${tooltipData.y}px`,
          }}
        >
          <CandidateTooltip candidate={tooltipData.candidate} />
        </div>
      )}

      <div className="tree-hint">Hover for details · Click to navigate</div>

      <style jsx>{`
        .ew-tree {
          margin-top: var(--space-sm, 8px);
        }

        .eval-source-toggle {
          display: flex;
          align-items: center;
          gap: var(--space-md, 16px);
          margin-bottom: var(--space-sm, 8px);
          font-size: 0.8125rem;
        }

        .toggle-label {
          color: var(--color-text-muted, #888);
        }

        .radio-option {
          display: flex;
          align-items: center;
          gap: var(--space-xs, 4px);
          cursor: pointer;
        }

        .radio-option input {
          margin: 0;
        }

        .tree-container {
          font-size: 0.8125rem;
          font-family: var(--font-mono, monospace);
        }

        .candidate-block {
          margin-bottom: 2px;
        }

        .candidate-row {
          display: flex;
          align-items: center;
          gap: var(--space-sm, 8px);
          padding: 3px 0;
          cursor: pointer;
          border-radius: var(--radius-sm, 4px);
        }

        .candidate-row:hover {
          background: var(--color-surface-hover, #2a2a2a);
        }

        .expand-btn {
          background: transparent;
          border: none;
          color: var(--color-text-muted, #888);
          cursor: pointer;
          font-size: 0.625rem;
          width: 16px;
          padding: 0;
          flex-shrink: 0;
        }

        .expand-btn:hover {
          color: var(--color-text, #fff);
        }

        .expand-spacer {
          width: 16px;
          flex-shrink: 0;
        }

        .mainline {
          color: var(--color-text, #ccc);
          flex: 1;
        }

        .candidate-ew {
          color: var(--color-primary, #60a5fa);
          font-weight: 500;
        }

        .leaf-eval {
          color: var(--color-text-muted, #888);
          min-width: 48px;
          text-align: right;
        }

        .branches-container {
          margin-left: 16px;
        }

        .branch-line {
          display: flex;
          align-items: center;
          padding: 2px 4px;
          cursor: pointer;
          border-radius: var(--radius-sm, 4px);
        }

        .branch-line:hover {
          background: var(--color-surface-hover, #2a2a2a);
        }

        .branch-moves {
          color: var(--color-text, #aaa);
          flex: 1;
        }

        .branch-eval {
          color: var(--color-text-muted, #888);
          min-width: 48px;
          text-align: right;
        }

        .ew-tooltip {
          background: var(--color-surface, #1a1a1a);
          border: 1px solid var(--color-border, #333);
          border-radius: var(--radius-sm, 4px);
          padding: var(--space-sm, 8px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 1000;
          max-width: 280px;
          font-size: 0.75rem;
        }

        .tree-hint {
          margin-top: var(--space-sm, 8px);
          font-size: 0.6875rem;
          color: var(--color-text-muted, #666);
          font-style: italic;
        }
      `}</style>
    </div>
  )
}

interface CandidateTooltipProps {
  candidate: EWCandidateResult
}

/**
 * Tooltip displayed on hover over candidate moves.
 * Shows: play rate, SF/Maia evals, EW values.
 */
function CandidateTooltip({ candidate }: CandidateTooltipProps) {
  return (
    <div className="tooltip-content">
      <div className="tooltip-header">{candidate.san}</div>
      <div className="tooltip-row">
        <span>Play rate:</span>
        <span>{formatProbability(candidate.probability)}</span>
      </div>
      <div className="tooltip-row">
        <span>SF eval:</span>
        <span>{formatNullableWinrate(candidate.stockfishWinrate)}</span>
      </div>
      <div className="tooltip-row">
        <span>Maia eval:</span>
        <span>{formatWinrate(candidate.maiaWinrate)}</span>
      </div>
      <div className="tooltip-divider" />
      <div className="tooltip-row highlight">
        <span>EW (SF):</span>
        <span>{formatNullableWinrate(candidate.expectedWinrateSF)}</span>
      </div>
      <div className="tooltip-row highlight">
        <span>EW (Maia):</span>
        <span>{formatWinrate(candidate.expectedWinrateMaia)}</span>
      </div>

      <style jsx>{`
        .tooltip-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .tooltip-header {
          font-weight: 600;
          font-size: 0.875rem;
          margin-bottom: 4px;
        }
        .tooltip-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }
        .tooltip-row span:first-child {
          color: var(--color-text-muted, #888);
        }
        .tooltip-row.highlight span {
          font-weight: 500;
        }
        .tooltip-divider {
          height: 1px;
          background: var(--color-border, #333);
          margin: 4px 0;
        }
      `}</style>
    </div>
  )
}
