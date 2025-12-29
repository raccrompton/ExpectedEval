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
  onNavigate?: (_fen: string) => void
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

export function EWSection({ fen, isEngineReady: _isEngineReady, onNavigate }: EWSectionProps) {
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

  const isCalculatingMaia = status === 'calculating_maia'
  const isEnrichingSF = status === 'enriching_sf'
  // Show results when Maia is done, even while enriching with SF
  const hasResult =
    (status === 'complete_maia' || status === 'complete' || status === 'enriching_sf') &&
    result !== null

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

      {/* Show progress only when calculating Maia */}
      {isCalculatingMaia && progress && (
        <div className="ew-status" data-testid="ew-status">
          <span style={{ color: getStatusColor(status) }}>
            {progress.phase}: {progress.message}
          </span>
        </div>
      )}

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
          canEnrichSF={canEnrichSF}
          isEnrichingSF={isEnrichingSF}
          onEnrichSF={enrichWithSF}
        />
      )}

      <style jsx>{`
        .ew-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-md, 16px);
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
          border: var(--border-medium, 2px) solid var(--color-border, #333);
          color: var(--color-text-muted, #666);
          padding: 4px 10px;
          cursor: pointer;
          font-size: 0.875rem;
          font-family: var(--font-mono);
          transition: all 0.1s ease;
        }

        .config-toggle:hover {
          background: var(--color-primary, #FFE000);
          border-color: var(--color-primary, #FFE000);
          color: var(--color-background, #0a0a0a);
        }

        .ew-status {
          font-size: var(--font-xs, 11px);
          font-weight: 600;
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .ew-config-panel {
          background: var(--color-background, #0a0a0a);
          border: var(--border-medium, 2px) solid var(--color-border, #333);
          padding: var(--space-md, 16px);
          font-size: var(--font-xs, 11px);
          font-family: var(--font-mono);
        }

        .config-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px solid var(--color-border, #333);
        }

        .config-row:last-child {
          border-bottom: none;
        }

        .config-row label {
          color: var(--color-text-muted, #666);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sf-button {
          background: var(--color-primary, #FFE000);
          color: var(--color-background, #0a0a0a);
          border: var(--border-medium, 2px) solid var(--color-primary, #FFE000);
          padding: var(--space-sm, 8px) var(--space-lg, 24px);
          cursor: pointer;
          font-weight: 700;
          font-size: var(--font-xs, 11px);
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          transition: all 0.1s ease;
        }

        .sf-button:hover:not(:disabled) {
          background: var(--color-background, #0a0a0a);
          color: var(--color-primary, #FFE000);
          transform: translate(-2px, -2px);
          box-shadow: 2px 2px 0 0 var(--color-primary, #FFE000);
        }

        .sf-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .ew-error {
          color: var(--color-error, #FF3333);
          font-size: var(--font-xs, 11px);
          font-family: var(--font-mono);
          padding: var(--space-sm, 8px);
          background: var(--color-error-bg, rgba(255, 51, 51, 0.1));
          border-left: var(--border-thick, 3px) solid var(--color-error, #FF3333);
        }
      `}</style>
    </div>
  )
}

interface EWResultsProps {
  result: EWResult
  evalSource: EvalSource
  onEvalSourceChange: (_source: EvalSource) => void
  onNavigate?: (_fen: string) => void
  canEnrichSF: boolean
  isEnrichingSF: boolean
  onEnrichSF: () => void
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
function EWResults({
  result,
  evalSource,
  onEvalSourceChange,
  onNavigate,
  canEnrichSF,
  isEnrichingSF,
  onEnrichSF,
}: EWResultsProps) {
  const bestCandidate = result.candidates[0]
  const hasSFResults = bestCandidate?.expectedWinrateSF !== null

  return (
    <div className="ew-results" data-testid="ew-results">
      {/* Horizontal row: EW Maia | EW SF (or button) | Eval source selector */}
      <div className="ew-summary-row">
        {/* EW Maia - always visible */}
        <div className="summary-box">
          <span className="summary-label">EW (Maia):</span>
          <span className="summary-value" data-testid="ew-maia-value">
            {bestCandidate ? formatWinrate(bestCandidate.expectedWinrateMaia) : 'N/A'}
          </span>
        </div>

        {/* EW SF - shows button overlay when SF not yet run */}
        <div className="summary-box sf-box">
          {hasSFResults ? (
            <>
              <span className="summary-label">EW (Stockfish):</span>
              <span className="summary-value" data-testid="ew-sf-value">
                {bestCandidate ? formatNullableWinrate(bestCandidate.expectedWinrateSF) : 'N/A'}
              </span>
            </>
          ) : (
            <button
              className="sf-button"
              data-testid="add-sf-analysis-button"
              onClick={onEnrichSF}
              disabled={!canEnrichSF || isEnrichingSF}
            >
              {isEnrichingSF ? 'Adding SF...' : 'Add SF Analysis'}
            </button>
          )}
        </div>

        {/* Eval source selector */}
        <div className="eval-source-toggle" data-testid="eval-source-toggle">
          <span className="toggle-label">Eval:</span>
          <label className="radio-option" data-testid="eval-source-sf">
            <input
              type="radio"
              name="evalSource"
              value="stockfish"
              checked={evalSource === 'stockfish'}
              onChange={() => onEvalSourceChange('stockfish')}
            />
            <span>SF</span>
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
      </div>

      <EWTree
        candidates={result.candidates}
        evalSource={evalSource}
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
        }

        .ew-summary-row {
          display: flex;
          align-items: stretch;
          gap: var(--space-md, 16px);
        }

        .summary-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: var(--space-sm, 8px) var(--space-md, 16px);
          background: var(--color-background, #0a0a0a);
          border: var(--border-thin, 1px) solid var(--color-border, #333);
          min-width: 140px;
        }

        .sf-box {
          position: relative;
          justify-content: center;
        }

        .summary-label {
          color: var(--color-text-muted, #666);
          font-family: var(--font-mono);
          font-size: var(--font-xs, 11px);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .summary-value {
          font-weight: 700;
          font-family: var(--font-mono);
          font-size: var(--font-xl, 28px);
          color: var(--color-primary, #FFE000);
          letter-spacing: -0.02em;
        }

        .sf-button {
          background: var(--color-primary, #FFE000);
          color: var(--color-background, #0a0a0a);
          border: none;
          padding: var(--space-sm, 8px) var(--space-md, 16px);
          cursor: pointer;
          font-weight: 700;
          font-size: var(--font-xs, 11px);
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          transition: all 0.1s ease;
          white-space: nowrap;
        }

        .sf-button:hover:not(:disabled) {
          background: var(--color-background, #0a0a0a);
          color: var(--color-primary, #FFE000);
          outline: 2px solid var(--color-primary, #FFE000);
        }

        .sf-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .eval-source-toggle {
          display: flex;
          align-items: center;
          gap: var(--space-sm, 8px);
          padding: var(--space-sm, 8px);
          font-size: var(--font-xs, 11px);
          font-family: var(--font-mono);
          margin-left: auto;
        }

        .toggle-label {
          color: var(--color-text-muted, #666);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .radio-option {
          display: flex;
          align-items: center;
          gap: var(--space-xs, 4px);
          cursor: pointer;
          padding: 4px 8px;
          border: var(--border-thin, 1px) solid transparent;
          transition: all 0.1s ease;
        }

        .radio-option:hover {
          border-color: var(--color-border, #333);
        }

        .radio-option input {
          margin: 0;
          accent-color: var(--color-primary, #FFE000);
        }

        .ew-meta {
          font-size: var(--font-xs, 11px);
          font-family: var(--font-mono);
          color: var(--color-text-dim, #333);
          text-align: right;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      `}</style>
    </div>
  )
}

interface EWTreeProps {
  candidates: EWCandidateResult[]
  evalSource: EvalSource
  onNavigate?: (_fen: string) => void
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
  indentChars: number // Pre-computed character width for indentation
}

/**
 * Collects all moves following the mainline (highest probability) from a node.
 * Returns the moves, leaf eval, and leaf FEN.
 */
function collectBranchMoves(
  node: TreeNode,
  evalSource: EvalSource,
): { moves: string[]; leafEval: number | null; fen: string } {
  const moves: string[] = []
  let current = node

  while (current.children.length > 0) {
    const sortedChildren = [...current.children].sort((a, b) => b.probability - a.probability)
    const mainChild = sortedChildren[0]
    moves.push(mainChild.san || mainChild.move || '?')
    current = mainChild
  }

  const leafEval = evalSource === 'stockfish' ? current.sfWinrate : current.maiaWinrate
  return { moves, leafEval, fen: current.fen }
}

/**
 * Gets the mainline (most likely continuation) and collects branch lines.
 * Pre-computes indentation for each branch based on mainline move widths.
 */
function extractMainlineAndBranches(
  node: TreeNode,
  evalSource: EvalSource,
  candidateSan: string,
): { mainlineMoves: string[]; mainlineEval: number | null; mainlineFen: string; branches: TreeLine[] } {
  const branches: TreeLine[] = []
  const mainlineMoves: string[] = []
  let mainlineFen = node.fen
  let mainlineEval: number | null = evalSource === 'stockfish' ? node.sfWinrate : node.maiaWinrate

  let current = node
  // Track cumulative character width: candidate move + space
  let cumulativeChars = candidateSan.length + 1

  while (current.children.length > 0) {
    const sortedChildren = [...current.children].sort((a, b) => b.probability - a.probability)

    // Collect alternative branches at this depth with pre-computed indentation
    for (let i = 1; i < Math.min(sortedChildren.length, MAX_BRANCHES); i++) {
      const branchChild = sortedChildren[i]
      const branchResult = collectBranchMoves(branchChild, evalSource)
      branches.push({
        moves: [branchChild.san || branchChild.move || '?', ...branchResult.moves],
        leafEval: branchResult.leafEval,
        leafFen: branchResult.fen,
        indentChars: cumulativeChars,
      })
    }

    // Follow main line and accumulate character width
    const mainChild = sortedChildren[0]
    const moveSan = mainChild.san || mainChild.move || '?'
    mainlineMoves.push(moveSan)
    cumulativeChars += moveSan.length + 1 // move + space
    current = mainChild
  }

  // Final eval and FEN from the leaf
  mainlineEval = evalSource === 'stockfish' ? current.sfWinrate : current.maiaWinrate
  mainlineFen = current.fen

  return { mainlineMoves, mainlineEval, mainlineFen, branches }
}

/**
 * Interactive tree visualization of Expected Winrate candidates.
 * Display: candidate + mainline on same row, branches indented below.
 *
 * e3 Nf6 Nf3 Ng8 Ng1    EW: 48.9%    31.2%
 *        Qf3                         39.6%
 *    Nc6                             50.9%
 */
function EWTree({ candidates, evalSource, onNavigate }: EWTreeProps) {
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
      <div className="tree-container">
        {sortedCandidates.slice(0, MAX_DISPLAYED_CANDIDATES).map((candidate, index) => {
          const isExpanded = expandedCandidates.has(index)
          const ew =
            evalSource === 'stockfish'
              ? (candidate.expectedWinrateSF ?? candidate.expectedWinrateMaia)
              : candidate.expectedWinrateMaia

          // Extract mainline and branches with pre-computed indentation
          const { mainlineMoves, mainlineEval, mainlineFen, branches } = extractMainlineAndBranches(
            candidate.tree,
            evalSource,
            candidate.san,
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
                  {branches.map((branch, branchIdx) => (
                    <div
                      key={branchIdx}
                      className="branch-line"
                      style={{ paddingLeft: `calc(20px + ${branch.indentChars}ch)` }}
                      onClick={() => handleNavigate(branch.leafFen)}
                    >
                      <span className="branch-moves">{branch.moves.join(' ')}</span>
                      <span className="branch-eval">
                        {branch.leafEval !== null ? formatWinrate(branch.leafEval) : '—'}
                      </span>
                    </div>
                  ))}
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
          margin-top: var(--space-md, 16px);
        }

        .tree-container {
          font-size: var(--font-sm, 13px);
          font-family: var(--font-mono);
        }

        .candidate-block {
          margin-bottom: 4px;
          border-left: var(--border-medium, 2px) solid var(--color-border, #333);
          transition: border-color 0.1s ease;
        }

        .candidate-block:hover {
          border-color: var(--color-primary, #FFE000);
        }

        .candidate-row {
          display: flex;
          align-items: center;
          gap: var(--space-sm, 8px);
          padding: 6px 8px;
          cursor: pointer;
          transition: background 0.1s ease;
        }

        .candidate-row:hover {
          background: var(--color-surface-hover, #1a1a1a);
        }

        .expand-btn {
          background: transparent;
          border: var(--border-thin, 1px) solid var(--color-border, #333);
          color: var(--color-text-muted, #666);
          cursor: pointer;
          font-size: 0.6rem;
          width: 20px;
          height: 20px;
          padding: 0;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.1s ease;
        }

        .expand-btn:hover {
          background: var(--color-primary, #FFE000);
          border-color: var(--color-primary, #FFE000);
          color: var(--color-background, #0a0a0a);
        }

        .expand-spacer {
          width: 20px;
          flex-shrink: 0;
        }

        .mainline {
          color: var(--color-text, #fff);
          flex: 1;
          font-weight: 500;
        }

        .candidate-ew {
          color: var(--color-primary, #FFE000);
          font-weight: 700;
        }

        .leaf-eval {
          color: var(--color-text-muted, #666);
          min-width: 52px;
          text-align: right;
        }

        .branches-container {
          margin-left: 20px;
          border-left: var(--border-thin, 1px) solid var(--color-border, #333);
        }

        .branch-line {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          cursor: pointer;
          transition: background 0.1s ease;
        }

        .branch-line:hover {
          background: var(--color-surface-hover, #1a1a1a);
        }

        .branch-moves {
          color: var(--color-text-muted, #666);
          flex: 1;
        }

        .branch-eval {
          color: var(--color-text-dim, #444);
          min-width: 52px;
          text-align: right;
        }

        .ew-tooltip {
          background: var(--color-background, #0a0a0a);
          border: var(--border-medium, 2px) solid var(--color-primary, #FFE000);
          padding: var(--space-md, 16px);
          box-shadow: 4px 4px 0 0 var(--color-primary, #FFE000);
          z-index: 1000;
          max-width: 280px;
          font-size: var(--font-xs, 11px);
          font-family: var(--font-mono);
        }

        .tree-hint {
          margin-top: var(--space-md, 16px);
          font-size: var(--font-xs, 11px);
          font-family: var(--font-mono);
          color: var(--color-text-dim, #333);
          text-transform: uppercase;
          letter-spacing: 0.05em;
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
          gap: 4px;
        }
        .tooltip-header {
          font-weight: 700;
          font-size: var(--font-lg, 18px);
          margin-bottom: 8px;
          color: var(--color-primary, #FFE000);
          font-family: var(--font-mono);
        }
        .tooltip-row {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          font-family: var(--font-mono);
        }
        .tooltip-row span:first-child {
          color: var(--color-text-muted, #666);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .tooltip-row span:last-child {
          font-weight: 600;
          color: var(--color-text, #fff);
        }
        .tooltip-row.highlight span:last-child {
          color: var(--color-primary, #FFE000);
          font-weight: 700;
        }
        .tooltip-divider {
          height: var(--border-medium, 2px);
          background: var(--color-border, #333);
          margin: 8px 0;
        }
      `}</style>
    </div>
  )
}
