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
    hasSFResults,
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
          hasSFResults={hasSFResults}
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
  hasSFResults: boolean
}

/**
 * Formats a nullable winrate, showing "—" if null.
 */
function formatNullableWinrate(winrate: number | null): string {
  return winrate !== null ? formatWinrate(winrate) : '—'
}

/**
 * Displays EW calculation results including summary stats, candidate moves, and tree.
 * Shows both SF and Maia baselines along with the computed expected winrates.
 * SF values show "—" until enrichWithStockfish() is called.
 */
function EWResults({ result, evalSource, onEvalSourceChange, onNavigate, hasSFResults }: EWResultsProps) {
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
        <div className="summary-row baseline">
          <span className="summary-label">SF Baseline:</span>
          <span className="summary-value">{formatNullableWinrate(result.baseSFWinrate)}</span>
        </div>
        <div className="summary-row baseline">
          <span className="summary-label">Maia Baseline:</span>
          <span className="summary-value">{formatWinrate(result.baseMaiaWinrate)}</span>
        </div>
      </div>

      <div className="ew-candidates" data-testid="ew-candidates">
        <h4>Candidate Moves</h4>
        {result.candidates.map((candidate, index) => (
          <EWCandidateRow
            key={candidate.move}
            candidate={candidate}
            index={index}
            evalSource={evalSource}
          />
        ))}
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

        .summary-row.baseline {
          font-size: 0.75rem;
          color: var(--color-text-muted, #888);
        }

        .summary-label {
          color: var(--color-text-muted, #888);
        }

        .summary-value {
          font-weight: 600;
          font-family: var(--font-mono, monospace);
        }

        .ew-candidates h4 {
          margin: 0 0 var(--space-xs, 4px) 0;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted, #888);
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

interface EWCandidateRowProps {
  candidate: EWCandidateResult
  index: number
  evalSource: EvalSource
}

/**
 * Renders a single candidate move row with EW value and probability.
 * Used in the summary section above the tree visualization.
 */
function EWCandidateRow({ candidate, index, evalSource }: EWCandidateRowProps) {
  const ew = evalSource === 'stockfish'
    ? candidate.expectedWinrateSF
    : candidate.expectedWinrateMaia

  return (
    <div className="candidate-row" data-testid={`ew-candidate-${index}`}>
      <span className="candidate-move">{candidate.san}</span>
      <span className="candidate-ew">
        EW: {formatNullableWinrate(ew)}
      </span>
      <span className="candidate-prob">
        {formatProbability(candidate.probability)}
      </span>

      <style jsx>{`
        .candidate-row {
          display: grid;
          grid-template-columns: 50px 1fr 45px;
          align-items: center;
          gap: var(--space-sm, 8px);
          padding: var(--space-xs, 4px) 0;
          font-size: 0.8125rem;
          border-bottom: 1px solid var(--color-border, #333);
        }

        .candidate-row:last-child {
          border-bottom: none;
        }

        .candidate-move {
          font-weight: 600;
          font-family: var(--font-mono, monospace);
        }

        .candidate-ew {
          color: var(--color-text-muted, #888);
        }

        .candidate-prob {
          text-align: right;
          font-family: var(--font-mono, monospace);
          color: var(--color-primary, #3b82f6);
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
/** Maximum number of child nodes to display at each tree level */
const MAX_DISPLAYED_CHILDREN = 5

/**
 * Interactive tree visualization of Expected Winrate candidates.
 * Features:
 * - Eval source toggle (Stockfish/Maia)
 * - Expandable candidate moves sorted by EW
 * - Tree connectors (├─, └─) for visual hierarchy
 * - Hover tooltips with detailed stats
 * - Click-to-navigate to preview positions
 */
function EWTree({ candidates, evalSource, onEvalSourceChange, onNavigate }: EWTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [tooltipData, setTooltipData] = useState<{
    node: TreeNode | EWCandidateResult
    x: number
    y: number
    isCandidate: boolean
  } | null>(null)

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const handleMouseEnter = useCallback((
    event: React.MouseEvent,
    node: TreeNode | EWCandidateResult,
    isCandidate: boolean
  ) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setTooltipData({
      node,
      x: rect.right + 8,
      y: rect.top,
      isCandidate,
    })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTooltipData(null)
  }, [])

  const handleNodeClick = useCallback((fen: string) => {
    if (onNavigate) {
      onNavigate(fen)
    }
  }, [onNavigate])

  if (candidates.length === 0) {
    return null
  }

  // Sort candidates by EW (highest first based on evalSource)
  // When SF not available, fall back to Maia
  const sortedCandidates = [...candidates].sort((a, b) => {
    const ewA = evalSource === 'stockfish'
      ? (a.expectedWinrateSF ?? a.expectedWinrateMaia)
      : a.expectedWinrateMaia
    const ewB = evalSource === 'stockfish'
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
        {sortedCandidates.slice(0, MAX_DISPLAYED_CANDIDATES).map((candidate, index) => (
          <CandidateBranch
            key={candidate.move}
            candidate={candidate}
            index={index}
            evalSource={evalSource}
            expandedNodes={expandedNodes}
            onToggle={toggleNode}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onNodeClick={handleNodeClick}
          />
        ))}
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
          <TreeTooltip
            node={tooltipData.node}
            isCandidate={tooltipData.isCandidate}
          />
        </div>
      )}

      <div className="tree-hint">
        Hover for details · Click to navigate
      </div>

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

interface CandidateBranchProps {
  candidate: EWCandidateResult
  index: number
  evalSource: EvalSource
  expandedNodes: Set<string>
  onToggle: (nodeId: string) => void
  onMouseEnter: (event: React.MouseEvent, node: TreeNode | EWCandidateResult, isCandidate: boolean) => void
  onMouseLeave: () => void
  onNodeClick: (fen: string) => void
}

/**
 * Renders a top-level candidate move branch in the EW tree.
 * Shows move name, EW percentage, and play probability.
 * Expandable to show child responses from the opponent.
 */
function CandidateBranch({
  candidate,
  index,
  evalSource,
  expandedNodes,
  onToggle,
  onMouseEnter,
  onMouseLeave,
  onNodeClick,
}: CandidateBranchProps) {
  const nodeId = `${index}`
  const isExpanded = expandedNodes.has(nodeId)
  const hasChildren = candidate.tree.children.length > 0

  // Use SF if available in stockfish mode, otherwise fall back to Maia
  const ew = evalSource === 'stockfish'
    ? (candidate.expectedWinrateSF ?? candidate.expectedWinrateMaia)
    : candidate.expectedWinrateMaia

  return (
    <div className="candidate-branch">
      <div
        className="candidate-node"
        data-testid={`ew-tree-candidate-${index}`}
        onMouseEnter={(e) => onMouseEnter(e, candidate, true)}
        onMouseLeave={onMouseLeave}
        onClick={() => onNodeClick(candidate.tree.fen)}
      >
        {hasChildren ? (
          <button
            className="expand-button"
            data-testid={`ew-tree-expand-${index}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggle(nodeId)
            }}
            aria-label={isExpanded ? `Collapse ${candidate.san}` : `Expand ${candidate.san}`}
            aria-expanded={isExpanded}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="expand-spacer" />
        )}
        <span className="candidate-move">{candidate.san}</span>
        <span className="candidate-ew">EW: {formatWinrate(ew)}</span>
        <span className="candidate-played">(played {formatProbability(candidate.probability)})</span>
      </div>

      {hasChildren && isExpanded && (
        <div className="tree-children" data-testid={`ew-tree-children-${index}`}>
          {candidate.tree.children
            .slice()
            .sort((a, b) => b.probability - a.probability)
            .slice(0, MAX_DISPLAYED_CHILDREN)
            .map((child, childIndex) => (
              <TreeBranch
                key={child.move || childIndex}
                node={child}
                depth={1}
                nodeId={`${nodeId}-${childIndex}`}
                isLast={childIndex === Math.min(candidate.tree.children.length, MAX_DISPLAYED_CHILDREN) - 1}
                evalSource={evalSource}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onNodeClick={onNodeClick}
              />
            ))}
        </div>
      )}

      <style jsx>{`
        .candidate-branch {
          display: flex;
          flex-direction: column;
        }

        .candidate-node {
          display: flex;
          align-items: center;
          gap: var(--space-xs, 4px);
          padding: 4px 0;
          cursor: pointer;
          border-radius: var(--radius-sm, 4px);
        }

        .candidate-node:hover {
          background: var(--color-surface-hover, #2a2a2a);
        }

        .expand-button {
          background: transparent;
          border: none;
          color: var(--color-text-muted, #888);
          cursor: pointer;
          font-size: 0.625rem;
          width: 16px;
          padding: 0;
          flex-shrink: 0;
        }

        .expand-button:hover {
          color: var(--color-text, #fff);
        }

        .expand-spacer {
          width: 16px;
          flex-shrink: 0;
        }

        .candidate-move {
          font-weight: 600;
          min-width: 40px;
        }

        .candidate-ew {
          color: var(--color-text, #fff);
        }

        .candidate-played {
          color: var(--color-text-muted, #888);
          margin-left: var(--space-xs, 4px);
        }

        .tree-children {
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  )
}

interface TreeBranchProps {
  node: TreeNode
  depth: number
  nodeId: string
  isLast: boolean
  evalSource: EvalSource
  expandedNodes: Set<string>
  onToggle: (nodeId: string) => void
  onMouseEnter: (event: React.MouseEvent, node: TreeNode, isCandidate: boolean) => void
  onMouseLeave: () => void
  onNodeClick: (fen: string) => void
}

/**
 * Renders a nested tree node with tree connectors (├─ or └─).
 * Shows move name and evaluation percentage.
 * Recursively renders children when expanded.
 */
function TreeBranch({
  node,
  depth,
  nodeId,
  isLast,
  evalSource,
  expandedNodes,
  onToggle,
  onMouseEnter,
  onMouseLeave,
  onNodeClick,
}: TreeBranchProps) {
  const hasChildren = node.children.length > 0
  const isExpanded = expandedNodes.has(nodeId)
  const indent = depth * 20

  const eval_ = evalSource === 'stockfish' ? node.sfWinrate : node.maiaWinrate
  const connector = isLast ? '└─' : '├─'

  return (
    <div className="tree-branch">
      <div
        className="tree-node"
        style={{ paddingLeft: `${indent}px` }}
        data-testid={`ew-tree-node-${nodeId.replace(/-/g, '-')}`}
        onMouseEnter={(e) => onMouseEnter(e, node, false)}
        onMouseLeave={onMouseLeave}
        onClick={() => onNodeClick(node.fen)}
      >
        <span className="connector">{connector}</span>
        {hasChildren ? (
          <button
            className="expand-button"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(nodeId)
            }}
            aria-label={isExpanded ? `Collapse ${node.san}` : `Expand ${node.san}`}
            aria-expanded={isExpanded}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="expand-spacer" />
        )}
        <span className="node-move">{node.san || node.move || '?'}</span>
        <span className="node-eval">
          {eval_ !== null ? formatWinrate(eval_) : '—'}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div className="tree-children">
          {node.children
            .slice()
            .sort((a, b) => b.probability - a.probability)
            .slice(0, MAX_DISPLAYED_CHILDREN)
            .map((child, childIndex) => (
              <TreeBranch
                key={child.move || childIndex}
                node={child}
                depth={depth + 1}
                nodeId={`${nodeId}-${childIndex}`}
                isLast={childIndex === Math.min(node.children.length, MAX_DISPLAYED_CHILDREN) - 1}
                evalSource={evalSource}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onNodeClick={onNodeClick}
              />
            ))}
        </div>
      )}

      <style jsx>{`
        .tree-branch {
          display: flex;
          flex-direction: column;
        }

        .tree-node {
          display: flex;
          align-items: center;
          gap: var(--space-xs, 4px);
          padding: 2px 0;
          cursor: pointer;
          border-radius: var(--radius-sm, 4px);
        }

        .tree-node:hover {
          background: var(--color-surface-hover, #2a2a2a);
        }

        .connector {
          color: var(--color-text-muted, #555);
          font-family: var(--font-mono, monospace);
          white-space: pre;
        }

        .expand-button {
          background: transparent;
          border: none;
          color: var(--color-text-muted, #888);
          cursor: pointer;
          font-size: 0.625rem;
          width: 16px;
          padding: 0;
          flex-shrink: 0;
        }

        .expand-button:hover {
          color: var(--color-text, #fff);
        }

        .expand-spacer {
          width: 16px;
          flex-shrink: 0;
        }

        .node-move {
          font-weight: 500;
          min-width: 40px;
        }

        .node-eval {
          color: var(--color-text-muted, #888);
        }

        .tree-children {
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  )
}

interface TreeTooltipProps {
  node: TreeNode | EWCandidateResult
  isCandidate: boolean
}

/**
 * Tooltip displayed on hover over tree nodes.
 * Shows detailed stats:
 * - For candidates: play rate, SF/Maia evals, EW values
 * - For tree nodes: play rate, cumulative probability, SF/Maia evals
 */
function TreeTooltip({ node, isCandidate }: TreeTooltipProps) {
  if (isCandidate) {
    const candidate = node as EWCandidateResult
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

  const treeNode = node as TreeNode
  return (
    <div className="tooltip-content">
      <div className="tooltip-header">{treeNode.san || treeNode.move}</div>
      <div className="tooltip-row">
        <span>Play rate:</span>
        <span>{formatProbability(treeNode.probability)}</span>
      </div>
      <div className="tooltip-row">
        <span>Cumulative prob:</span>
        <span>{formatProbability(treeNode.cumulativeProbability)}</span>
      </div>
      <div className="tooltip-divider" />
      <div className="tooltip-row">
        <span>SF eval:</span>
        <span>{treeNode.sfWinrate !== null ? formatWinrate(treeNode.sfWinrate) : '—'}</span>
      </div>
      <div className="tooltip-row">
        <span>Maia eval:</span>
        <span>{formatWinrate(treeNode.maiaWinrate)}</span>
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
        .tooltip-divider {
          height: 1px;
          background: var(--color-border, #333);
          margin: 4px 0;
        }
      `}</style>
    </div>
  )
}
