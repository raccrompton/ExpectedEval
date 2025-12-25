/**
 * EWSection Component
 *
 * Container for Expected Winrate analysis functionality.
 * Provides the calculate button, status display, and results visualization.
 */

import { useState, useCallback, useEffect } from 'react'
import { useExpectedWinrate, type EWStatus } from '@/hooks'
import { useSettingsContext } from '@/contexts'
import type { EWResult, EWCandidateResult, TreeNode } from '@/core/analysis'

const MAX_DISPLAYED_CANDIDATES = 3
const MAX_DISPLAYED_CHILDREN = 5
const TREE_INDENT_PX = 16

interface EWSectionProps {
  fen: string
  isEngineReady: boolean
}

function formatWinrate(winrate: number): string {
  return `${(winrate * 100).toFixed(1)}%`
}

function formatProbability(prob: number): string {
  return `${(prob * 100).toFixed(0)}%`
}

function getStatusText(status: EWStatus): string {
  switch (status) {
    case 'idle':
      return 'Ready to calculate'
    case 'calculating':
      return 'Calculating...'
    case 'complete':
      return 'Complete'
    case 'error':
      return 'Error'
    default:
      return 'Unknown'
  }
}

function getStatusColor(status: EWStatus): string {
  switch (status) {
    case 'complete':
      return 'var(--color-success, #22c55e)'
    case 'error':
      return 'var(--color-error, #ef4444)'
    case 'calculating':
      return 'var(--color-warning, #f59e0b)'
    default:
      return 'var(--color-text-muted, #6b7280)'
  }
}

export function EWSection({ fen, isEngineReady }: EWSectionProps) {
  const { settings, getEWConfig } = useSettingsContext()

  const {
    result,
    status,
    progress,
    error,
    config,
    calculate,
    updateConfig,
    reset,
  } = useExpectedWinrate()

  const [showConfig, setShowConfig] = useState(false)

  useEffect(() => {
    updateConfig({
      probabilityThreshold: settings.probabilityThreshold,
      winrateLossThreshold: settings.winrateLossThreshold,
      maiaLevel: settings.maiaLevel,
      stockfishDepth: settings.stockfishDepth,
    })
  }, [settings, updateConfig])

  const handleCalculate = useCallback(() => {
    calculate(fen)
  }, [calculate, fen])

  const isCalculating = status === 'calculating'
  const hasResult = status === 'complete' && result !== null

  return (
    <div className="ew-section" data-testid="ew-section">
      <div className="ew-header">
        <h3>Expected Winrate</h3>
        <div className="ew-controls">
          <button
            className="config-toggle"
            data-testid="ew-config-toggle"
            onClick={() => setShowConfig(!showConfig)}
            title="Configure EW parameters"
            aria-label="Configure Expected Winrate parameters"
            aria-expanded={showConfig}
          >
            ...
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

      <button
        className="calculate-button"
        data-testid="calculate-ew-button"
        onClick={handleCalculate}
        disabled={!isEngineReady || isCalculating}
      >
        {isCalculating ? 'Calculating...' : 'Calculate Expected Winrate'}
      </button>

      {error && (
        <div className="ew-error">
          Error: {error.message}
        </div>
      )}

      {hasResult && result && (
        <EWResults result={result} />
      )}

      <style jsx>{`
        .ew-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm, 8px);
        }

        .ew-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: var(--space-sm, 8px);
          border-bottom: 1px solid var(--color-border, #333);
        }

        .ew-header h3 {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
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

        .calculate-button {
          background: var(--color-primary, #3b82f6);
          color: white;
          border: none;
          padding: var(--space-sm, 8px) var(--space-md, 16px);
          border-radius: var(--radius-sm, 4px);
          cursor: pointer;
          font-weight: 500;
          font-size: 0.875rem;
          transition: background 0.2s ease;
        }

        .calculate-button:hover:not(:disabled) {
          background: var(--color-primary-hover, #2563eb);
        }

        .calculate-button:disabled {
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
}

function EWResults({ result }: EWResultsProps) {
  const bestCandidate = result.candidates[0]

  return (
    <div className="ew-results" data-testid="ew-results">
      <div className="ew-summary">
        <div className="summary-row">
          <span className="summary-label">EW (Stockfish):</span>
          <span className="summary-value" data-testid="ew-sf-value">
            {bestCandidate ? formatWinrate(bestCandidate.expectedWinrateSF) : 'N/A'}
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
          <span className="summary-value">{formatWinrate(result.baseSFWinrate)}</span>
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
          />
        ))}
      </div>

      <EWTree candidates={result.candidates} />

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
}

function EWCandidateRow({ candidate, index }: EWCandidateRowProps) {
  return (
    <div className="candidate-row" data-testid={`ew-candidate-${index}`}>
      <span className="candidate-move">{candidate.san}</span>
      <span className="candidate-ew">
        EW: {formatWinrate(candidate.expectedWinrateSF)}
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
}

function EWTree({ candidates }: EWTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

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

  if (candidates.length === 0) {
    return null
  }

  return (
    <div className="ew-tree" data-testid="ew-tree">
      <h4>Analysis Tree</h4>
      <div className="tree-container">
        {candidates.slice(0, MAX_DISPLAYED_CANDIDATES).map((candidate, index) => (
          <TreeBranch
            key={candidate.move}
            node={candidate.tree}
            moveLabel={candidate.san}
            probability={candidate.probability}
            depth={0}
            nodeId={`${index}`}
            expandedNodes={expandedNodes}
            onToggle={toggleNode}
            index={index}
          />
        ))}
      </div>

      <style jsx>{`
        .ew-tree {
          margin-top: var(--space-sm, 8px);
        }

        .ew-tree h4 {
          margin: 0 0 var(--space-xs, 4px) 0;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted, #888);
        }

        .tree-container {
          font-size: 0.8125rem;
          font-family: var(--font-mono, monospace);
        }
      `}</style>
    </div>
  )
}

interface TreeBranchProps {
  node: TreeNode
  moveLabel: string
  probability: number
  depth: number
  nodeId: string
  expandedNodes: Set<string>
  onToggle: (nodeId: string) => void
  index: number
}

function TreeBranch({
  node,
  moveLabel,
  probability,
  depth,
  nodeId,
  expandedNodes,
  onToggle,
  index,
}: TreeBranchProps) {
  const hasChildren = node.children.length > 0
  const isExpanded = expandedNodes.has(nodeId)
  const indent = depth * TREE_INDENT_PX

  return (
    <div className="tree-branch">
      <div
        className="tree-node"
        style={{ paddingLeft: `${indent}px` }}
      >
        {hasChildren && (
          <button
            className="expand-button"
            data-testid={`ew-tree-expand-${index}`}
            onClick={() => onToggle(nodeId)}
            aria-label={isExpanded ? `Collapse ${moveLabel}` : `Expand ${moveLabel}`}
            aria-expanded={isExpanded}
          >
            {isExpanded ? '\u25BC' : '\u25B6'}
          </button>
        )}
        {!hasChildren && <span className="expand-spacer" />}
        <span className="node-move">{moveLabel}</span>
        <span className="node-prob">{formatProbability(probability)}</span>
        {node.sfWinrate !== null && (
          <span className="node-eval">{formatWinrate(node.sfWinrate)}</span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="tree-children" data-testid={`ew-tree-children-${index}`}>
          {node.children.slice(0, MAX_DISPLAYED_CHILDREN).map((child, childIndex) => (
            <TreeBranch
              key={child.move || childIndex}
              node={child}
              moveLabel={child.san || child.move || '?'}
              probability={child.probability}
              depth={depth + 1}
              nodeId={`${nodeId}-${childIndex}`}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              index={childIndex}
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
        }

        .expand-button {
          background: transparent;
          border: none;
          color: var(--color-text-muted, #888);
          cursor: pointer;
          font-size: 0.625rem;
          width: 16px;
          padding: 0;
        }

        .expand-button:hover {
          color: var(--color-text, #fff);
        }

        .expand-spacer {
          width: 16px;
        }

        .node-move {
          font-weight: 500;
          min-width: 40px;
        }

        .node-prob {
          color: var(--color-primary, #3b82f6);
          min-width: 35px;
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
