/**
 * EWTree Component - Expected Winrate Tree Visualization
 *
 * This component displays the Expected Winrate calculation results
 * as an interactive, expandable tree. It shows:
 * - Candidate moves with their EW scores
 * - Probability trees for each candidate
 * - Click-to-navigate and hover-to-preview functionality
 *
 * Features:
 * - Expandable/collapsible tree nodes
 * - Color-coded evaluations (green = good, red = bad)
 * - Probability-based node sizing
 * - Click to navigate to position
 * - Hover to preview position on board
 * - Sort by EW, probability, or SF eval
 *
 * Architecture:
 * - Receives EWResult from parent
 * - Manages expanded state internally
 * - Calls callbacks for navigation and preview
 *
 * @example
 * ```tsx
 * function Analysis() {
 *   const { result } = useExpectedWinrate()
 *
 *   return (
 *     <EWTree
 *       result={result}
 *       onNavigate={(fen) => setPreviewFen(fen)}
 *       onHover={(fen) => setHoverFen(fen)}
 *     />
 *   )
 * }
 * ```
 *
 * Dependencies:
 * - React: useState, useCallback
 * - @/core/analysis: EW result types
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import type { EWResult, EWCandidateResult, TreeNode } from '@/core/analysis'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Sort options for candidate moves.
 */
export type EWSortBy = 'ew_sf' | 'ew_maia' | 'probability' | 'sf_eval'

/**
 * Props for the EWTree component.
 */
export interface EWTreeProps {
  /**
   * Expected Winrate calculation result.
   * Null shows empty state.
   */
  result: EWResult | null

  /**
   * Callback when user clicks a position.
   * Called with the FEN of the clicked position.
   *
   * @param fen - FEN of the position to navigate to
   */
  onNavigate?: (fen: string) => void

  /**
   * Callback when user hovers over a position.
   * Called with FEN for preview, or null when hover ends.
   *
   * @param fen - FEN to preview, or null
   */
  onHover?: (fen: string | null) => void

  /**
   * Initial sort order.
   * Defaults to 'ew_sf'.
   */
  initialSortBy?: EWSortBy

  /**
   * Maximum depth to show initially (before expanding).
   * Defaults to 2.
   */
  initialDepth?: number

  /**
   * Optional: CSS class name for custom styling.
   */
  className?: string

  /**
   * Optional: data-testid for testing.
   */
  'data-testid'?: string
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format win percentage for display.
 */
function formatWinrate(winrate: number): string {
  return `${(winrate * 100).toFixed(1)}%`
}

/**
 * Format probability for display.
 */
function formatProb(prob: number): string {
  return `${(prob * 100).toFixed(0)}%`
}

/**
 * Get color for evaluation (green for good, red for bad).
 */
function getEvalColor(winrate: number): string {
  if (winrate >= 0.6) return '#27ae60'
  if (winrate >= 0.55) return '#2ecc71'
  if (winrate >= 0.45) return '#666'
  if (winrate >= 0.4) return '#e67e22'
  return '#e74c3c'
}

/**
 * Get opacity based on probability (higher prob = more visible).
 */
function getProbOpacity(prob: number): number {
  return Math.max(0.4, Math.min(1, prob * 5))
}

/**
 * Sort candidates based on selected criteria.
 */
function sortCandidates(
  candidates: EWCandidateResult[],
  sortBy: EWSortBy
): EWCandidateResult[] {
  return [...candidates].sort((a, b) => {
    switch (sortBy) {
      case 'ew_sf':
        return b.expectedWinrateSF - a.expectedWinrateSF
      case 'ew_maia':
        return b.expectedWinrateMaia - a.expectedWinrateMaia
      case 'probability':
        return b.probability - a.probability
      case 'sf_eval':
        return b.stockfishWinrate - a.stockfishWinrate
      default:
        return 0
    }
  })
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Props for TreeNodeView.
 */
interface TreeNodeViewProps {
  node: TreeNode
  depth: number
  maxVisibleDepth: number
  expandedNodes: Set<string>
  onToggle: (nodeId: string) => void
  onNavigate?: (fen: string) => void
  onHover?: (fen: string | null) => void
}

/**
 * Recursive tree node component.
 */
function TreeNodeView({
  node,
  depth,
  maxVisibleDepth,
  expandedNodes,
  onToggle,
  onNavigate,
  onHover,
}: TreeNodeViewProps) {
  // Generate unique ID for this node based on path
  const nodeId = `${node.fen}-${depth}`

  const isExpanded = expandedNodes.has(nodeId)
  const hasChildren = node.children.length > 0
  const isVisible = depth <= maxVisibleDepth || isExpanded

  // Don't render children beyond max depth unless expanded
  const shouldRenderChildren = hasChildren && (depth < maxVisibleDepth || isExpanded)

  // Use SF winrate if available, otherwise Maia
  const winrate = node.sfWinrate ?? node.maiaWinrate

  return (
    <div
      style={{
        marginLeft: depth > 0 ? '16px' : '0',
        opacity: getProbOpacity(node.cumulativeProbability),
      }}
    >
      {/* Node content */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: '#f8f9fa',
          marginBottom: '2px',
        }}
        onClick={() => {
          if (hasChildren) onToggle(nodeId)
          if (onNavigate) onNavigate(node.fen)
        }}
        onMouseEnter={() => onHover?.(node.fen)}
        onMouseLeave={() => onHover?.(null)}
        data-testid={`tree-node-${depth}`}
      >
        {/* Expand/collapse indicator */}
        {hasChildren && (
          <span
            style={{
              marginRight: '8px',
              fontSize: '12px',
              color: '#666',
              width: '12px',
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span style={{ marginRight: '8px', width: '12px' }} />}

        {/* Move */}
        <span
          style={{
            fontWeight: 500,
            marginRight: '8px',
            fontFamily: 'monospace',
          }}
        >
          {node.san || '(root)'}
        </span>

        {/* Probability */}
        <span
          style={{
            fontSize: '12px',
            color: '#666',
            marginRight: '8px',
          }}
        >
          {formatProb(node.probability)}
        </span>

        {/* Evaluation */}
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: getEvalColor(winrate),
          }}
        >
          {formatWinrate(winrate)}
        </span>
      </div>

      {/* Children */}
      {shouldRenderChildren && (
        <div>
          {node.children.map((child, idx) => (
            <TreeNodeView
              key={`${child.fen}-${idx}`}
              node={child}
              depth={depth + 1}
              maxVisibleDepth={maxVisibleDepth}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onNavigate={onNavigate}
              onHover={onHover}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Candidate move row in the main tree.
 */
interface CandidateRowProps {
  candidate: EWCandidateResult
  isExpanded: boolean
  onToggle: () => void
  expandedNodes: Set<string>
  onToggleNode: (nodeId: string) => void
  onNavigate?: (fen: string) => void
  onHover?: (fen: string | null) => void
}

function CandidateRow({
  candidate,
  isExpanded,
  onToggle,
  expandedNodes,
  onToggleNode,
  onNavigate,
  onHover,
}: CandidateRowProps) {
  return (
    <div
      style={{
        marginBottom: '8px',
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        overflow: 'hidden',
      }}
    >
      {/* Candidate header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 12px',
          backgroundColor: '#f8f9fa',
          cursor: 'pointer',
        }}
        onClick={onToggle}
        onMouseEnter={() => onHover?.(candidate.tree.fen)}
        onMouseLeave={() => onHover?.(null)}
        data-testid={`candidate-${candidate.move}`}
      >
        {/* Expand indicator */}
        <span
          style={{
            marginRight: '12px',
            fontSize: '12px',
            color: '#666',
          }}
        >
          {isExpanded ? '▼' : '▶'}
        </span>

        {/* Move name */}
        <span
          style={{
            fontWeight: 'bold',
            fontSize: '16px',
            marginRight: '16px',
            fontFamily: 'monospace',
          }}
        >
          {candidate.san}
        </span>

        {/* EW (SF) */}
        <span
          style={{
            marginRight: '16px',
            color: getEvalColor(candidate.expectedWinrateSF),
            fontWeight: 500,
          }}
          data-testid={`candidate-${candidate.move}-ew`}
        >
          EW: {formatWinrate(candidate.expectedWinrateSF)}
        </span>

        {/* SF Eval */}
        <span
          style={{
            marginRight: '16px',
            color: '#666',
            fontSize: '13px',
          }}
        >
          SF: {formatWinrate(candidate.stockfishWinrate)}
        </span>

        {/* Probability */}
        <span
          style={{
            color: '#999',
            fontSize: '13px',
          }}
        >
          ({formatProb(candidate.probability)})
        </span>
      </div>

      {/* Expanded tree */}
      {isExpanded && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#fff',
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          {candidate.tree.children.length > 0 ? (
            candidate.tree.children.map((child, idx) => (
              <TreeNodeView
                key={`${child.fen}-${idx}`}
                node={child}
                depth={1}
                maxVisibleDepth={2}
                expandedNodes={expandedNodes}
                onToggle={onToggleNode}
                onNavigate={onNavigate}
                onHover={onHover}
              />
            ))
          ) : (
            <div style={{ color: '#999', fontSize: '13px' }}>
              No continuations explored
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Expected Winrate tree visualization component.
 */
export function EWTree({
  result,
  onNavigate,
  onHover,
  initialSortBy = 'ew_sf',
  initialDepth = 2,
  className = '',
  'data-testid': testId = 'ew-tree',
}: EWTreeProps) {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /**
   * Current sort order.
   */
  const [sortBy, setSortBy] = useState<EWSortBy>(initialSortBy)

  /**
   * Expanded candidate indices.
   */
  const [expandedCandidates, setExpandedCandidates] = useState<Set<number>>(
    new Set([0]) // Expand first candidate by default
  )

  /**
   * Expanded tree nodes (by ID).
   */
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  /**
   * Sorted candidates.
   */
  const sortedCandidates = useMemo(() => {
    if (!result) return []
    return sortCandidates(result.candidates, sortBy)
  }, [result, sortBy])

  // ---------------------------------------------------------------------------
  // EVENT HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Toggle candidate expansion.
   */
  const handleToggleCandidate = useCallback((index: number) => {
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

  /**
   * Toggle tree node expansion.
   */
  const handleToggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  /**
   * Handle sort change.
   */
  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSortBy(e.target.value as EWSortBy)
    },
    []
  )

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  // Empty state
  if (!result) {
    return (
      <div
        className={`ew-tree empty ${className}`}
        data-testid={testId}
        style={{
          padding: '16px',
          color: '#666',
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: '8px', fontSize: '14px' }}>
          No Expected Winrate calculation yet
        </div>
        <div style={{ fontSize: '12px', color: '#999' }}>
          Click "Calculate EW" to analyze the current position
        </div>
      </div>
    )
  }

  // No candidates
  if (sortedCandidates.length === 0) {
    return (
      <div
        className={`ew-tree no-candidates ${className}`}
        data-testid={testId}
        style={{
          padding: '16px',
          color: '#666',
        }}
      >
        No candidate moves found
      </div>
    )
  }

  return (
    <div
      className={`ew-tree ${className}`}
      data-testid={testId}
      style={{
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header with sort controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          padding: '8px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
        }}
      >
        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
          Expected Winrate Analysis
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: '#666' }}>Sort by:</label>
          <select
            value={sortBy}
            onChange={handleSortChange}
            data-testid="ew-sort-select"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontSize: '12px',
            }}
          >
            <option value="ew_sf">EW (SF)</option>
            <option value="ew_maia">EW (Maia)</option>
            <option value="probability">Probability</option>
            <option value="sf_eval">SF Eval</option>
          </select>
        </div>
      </div>

      {/* Candidate moves */}
      <div>
        {sortedCandidates.map((candidate, idx) => (
          <CandidateRow
            key={candidate.move}
            candidate={candidate}
            isExpanded={expandedCandidates.has(idx)}
            onToggle={() => handleToggleCandidate(idx)}
            expandedNodes={expandedNodes}
            onToggleNode={handleToggleNode}
            onNavigate={onNavigate}
            onHover={onHover}
          />
        ))}
      </div>

      {/* Summary */}
      <div
        style={{
          marginTop: '12px',
          padding: '8px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#666',
        }}
      >
        <div>
          Analyzed {sortedCandidates.length} candidate moves in{' '}
          {result.calculationTimeMs}ms
        </div>
        <div style={{ marginTop: '4px' }}>
          Baseline: SF {formatWinrate(result.baseSFWinrate)} | Maia{' '}
          {formatWinrate(result.baseMaiaWinrate)}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default EWTree
