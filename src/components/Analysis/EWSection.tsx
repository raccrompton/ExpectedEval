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

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useExpectedWinrate, type EWStatus } from '@/hooks'
import { useSettingsContext } from '@/contexts'
import type { EWResult, EWCandidateResult, TreeNode } from '@/core/analysis'
import { EWTable } from './EWTable'

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
  const { settings, updateSetting } = useSettingsContext()

  // Hook now auto-triggers on fen change
  const {
    result,
    status,
    progress,
    error,
    config: _config,
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

      {/* Show status during calculation phases and after completion */}
      {(isCalculatingMaia || isEnrichingSF || status === 'complete') && (
        <div className="ew-status" data-testid="ew-status">
          <span style={{ color: getStatusColor(status) }}>
            {status === 'complete'
              ? 'Complete (Stockfish enriched)'
              : progress
                ? `${progress.phase}: ${progress.message}`
                : isEnrichingSF
                  ? 'Enriching with Stockfish...'
                  : 'Calculating...'}
          </span>
        </div>
      )}

      {showConfig && (
        <div className="ew-config-panel" data-testid="ew-config-panel">
          <div className="config-row">
            <label htmlFor="ew-prob-threshold">Probability Threshold:</label>
            <select
              id="ew-prob-threshold"
              data-testid="ew-prob-threshold"
              value={settings.probabilityThreshold}
              onChange={(e) => updateSetting('probabilityThreshold', Number(e.target.value))}
            >
              <option value={0.10}>10%</option>
              <option value={0.05}>5%</option>
              <option value={0.02}>2%</option>
              <option value={0.01}>1%</option>
            </select>
          </div>
          <div className="config-row">
            <label htmlFor="ew-winrate-loss">Winrate Loss Threshold:</label>
            <select
              id="ew-winrate-loss"
              data-testid="ew-winrate-loss"
              value={settings.winrateLossThreshold}
              onChange={(e) => updateSetting('winrateLossThreshold', Number(e.target.value))}
            >
              <option value={0.03}>3%</option>
              <option value={0.05}>5%</option>
              <option value={0.10}>10%</option>
            </select>
          </div>
          <div className="config-row">
            <label htmlFor="ew-maia-level">Maia Level:</label>
            <select
              id="ew-maia-level"
              data-testid="ew-maia-level"
              value={settings.maiaLevel}
              onChange={(e) => updateSetting('maiaLevel', Number(e.target.value))}
            >
              <option value={1100}>1100</option>
              <option value={1200}>1200</option>
              <option value={1300}>1300</option>
              <option value={1400}>1400</option>
              <option value={1500}>1500</option>
              <option value={1600}>1600</option>
              <option value={1700}>1700</option>
              <option value={1800}>1800</option>
              <option value={1900}>1900</option>
            </select>
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

        .config-row select {
          background: var(--color-background, #0a0a0a);
          border: 1px solid var(--color-border, #333);
          color: var(--color-text, #fff);
          padding: 2px 8px;
          font-size: var(--font-xs, 11px);
          font-family: var(--font-mono);
          cursor: pointer;
        }

        .config-row select:hover {
          border-color: var(--color-primary, #FFE000);
        }

        .config-row select:focus {
          outline: none;
          border-color: var(--color-primary, #FFE000);
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
/** Tooltip data for tree nodes */
interface NodeTooltipData {
  node: TreeNode
  x: number
  y: number
}

/**
 * Two-column Expected Winrate visualization.
 * Left column: Candidate moves list
 * Right column: Tree for selected candidate with branch toggles
 */
function EWTree({ candidates, evalSource, onNavigate }: EWTreeProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [tooltipData, setTooltipData] = useState<NodeTooltipData | null>(null)

  // Sort candidates once and memoize
  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => {
      const ewA = evalSource === 'stockfish'
        ? (a.expectedWinrateSF ?? a.expectedWinrateMaia)
        : a.expectedWinrateMaia
      const ewB = evalSource === 'stockfish'
        ? (b.expectedWinrateSF ?? b.expectedWinrateMaia)
        : b.expectedWinrateMaia
      return ewB - ewA
    }).slice(0, MAX_DISPLAYED_CANDIDATES)
  }, [candidates, evalSource])

  const selectedCandidate = sortedCandidates[selectedIndex] || sortedCandidates[0] || null

  // Reset selection when candidates change
  useEffect(() => {
    setSelectedIndex(0)
    setTooltipData(null)
  }, [candidates])

  const handleNodeHover = useCallback(
    (event: React.MouseEvent | null, node: TreeNode | null) => {
      if (!event || !node) {
        setTooltipData(null)
        return
      }
      const rect = event.currentTarget.getBoundingClientRect()
      const tooltipWidth = 280
      const tooltipHeight = 200
      const padding = 8

      let x = rect.left - tooltipWidth - padding
      if (x < 0) x = rect.right + padding
      if (x + tooltipWidth > window.innerWidth) x = padding

      let y = rect.top
      if (y + tooltipHeight > window.innerHeight) {
        y = Math.max(padding, window.innerHeight - tooltipHeight - padding)
      }

      setTooltipData({ node, x, y })
    },
    [],
  )

  const handleNavigate = useCallback(
    (fen: string) => {
      onNavigate?.(fen)
    },
    [onNavigate],
  )

  if (candidates.length === 0) return null

  return (
    <div className="ew-candidate-tree-view" data-testid="ew-candidate-tree-view">
      {/* Also keep ew-tree for backwards compatibility */}
      <div data-testid="ew-tree" style={{ display: 'contents' }}>
        <CandidateColumn
          candidates={sortedCandidates}
          selectedIndex={selectedIndex}
          evalSource={evalSource}
          onSelect={setSelectedIndex}
        />
        <EWTable
          candidate={selectedCandidate}
          evalSource={evalSource}
          onNavigate={handleNavigate}
          onNodeHover={handleNodeHover}
        />
      </div>

      {tooltipData && (
        <div
          className="ew-tooltip"
          data-testid="ew-node-tooltip"
          style={{
            position: 'fixed',
            left: `${tooltipData.x}px`,
            top: `${tooltipData.y}px`,
          }}
        >
          <NodeTooltip node={tooltipData.node} />
        </div>
      )}

      <style jsx>{`
        .ew-candidate-tree-view {
          display: grid;
          grid-template-columns: minmax(120px, 160px) 1fr;
          gap: var(--space-md, 16px);
          border: var(--border-thin, 1px) solid var(--color-border, #333);
          margin-top: var(--space-md, 16px);
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
      `}</style>
    </div>
  )
}

interface CandidateColumnProps {
  candidates: EWCandidateResult[]
  selectedIndex: number
  evalSource: EvalSource
  onSelect: (_index: number) => void
}

/**
 * Left column displaying all candidate moves in a vertical list.
 */
function CandidateColumn({ candidates, selectedIndex, evalSource, onSelect }: CandidateColumnProps) {
  return (
    <div className="candidate-column" data-testid="ew-candidate-column">
      <div className="column-header">CANDIDATE</div>
      {candidates.map((candidate, i) => {
        const ew =
          evalSource === 'stockfish'
            ? (candidate.expectedWinrateSF ?? candidate.expectedWinrateMaia)
            : candidate.expectedWinrateMaia

        return (
          <div
            key={candidate.move}
            className={`candidate-row ${i === selectedIndex ? 'selected' : ''}`}
            data-testid={`ew-candidate-${i}`}
            data-selected={i === selectedIndex ? 'true' : 'false'}
            onClick={() => onSelect(i)}
          >
            <span className="move-san">{candidate.san}</span>
            <span className="move-ew">EW: {formatWinrate(ew)}</span>
            <span className="move-maia">Maia: {formatWinrate(candidate.maiaWinrate)}</span>
          </div>
        )
      })}

      <style jsx>{`
        .candidate-column {
          border-right: var(--border-medium, 2px) solid var(--color-border, #333);
          padding: var(--space-sm, 8px);
          font-family: var(--font-mono);
        }

        .column-header {
          font-size: var(--font-xs, 11px);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--color-text-muted, #666);
          padding-bottom: var(--space-xs, 4px);
          border-bottom: var(--border-thin, 1px) solid var(--color-border, #333);
          margin-bottom: var(--space-sm, 8px);
        }

        .candidate-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: var(--space-xs, 4px) var(--space-sm, 8px);
          cursor: pointer;
          border-left: 3px solid transparent;
          transition: all 0.1s ease;
        }

        .candidate-row:hover {
          background: var(--color-surface-hover, #1a1a1a);
        }

        .candidate-row.selected {
          border-left-color: var(--color-primary, #FFE000);
          background: rgba(255, 224, 0, 0.1);
        }

        .move-san {
          font-weight: 700;
          font-size: var(--font-md, 15px);
          color: var(--color-text, #fff);
          white-space: nowrap;
        }

        .move-ew {
          color: var(--color-text-muted, #666);
          font-size: var(--font-xs, 11px);
        }

        .move-maia {
          color: var(--color-text-dim, #444);
          font-size: var(--font-xs, 11px);
        }

        .candidate-row.selected .move-ew {
          color: var(--color-primary, #FFE000);
        }

        .candidate-row.selected .move-maia {
          color: var(--color-text-muted, #666);
        }
      `}</style>
    </div>
  )
}




interface NodeTooltipProps {
  node: TreeNode
}

/**
 * Enhanced tooltip shown on hover for any tree node.
 * Shows play rate, cumulative probability, and both evaluations.
 */
function NodeTooltip({ node }: NodeTooltipProps) {
  return (
    <div className="tooltip-content">
      <div className="tooltip-header">{node.san || node.move || '?'}</div>

      <div className="tooltip-row">
        <span>Play rate:</span>
        <span>{formatProbability(node.probability)}</span>
      </div>

      <div className="tooltip-row">
        <span>Cumulative prob:</span>
        <span>{formatProbability(node.cumulativeProbability)}</span>
      </div>

      <div className="tooltip-divider" />

      <div className="tooltip-row">
        <span>Maia eval:</span>
        <span>{node.maiaWinrate !== null ? formatWinrate(node.maiaWinrate) : '—'}</span>
      </div>

      <div className="tooltip-row">
        <span>SF eval:</span>
        <span>{node.sfWinrate !== null ? formatWinrate(node.sfWinrate) : '—'}</span>
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

        .tooltip-divider {
          height: var(--border-medium, 2px);
          background: var(--color-border, #333);
          margin: 8px 0;
        }
      `}</style>
    </div>
  )
}

