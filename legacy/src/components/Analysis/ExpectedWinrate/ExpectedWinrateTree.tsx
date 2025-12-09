/**
 * Expected Winrate Tree Component
 *
 * Interactive probability tree visualization for Expected Winrate analysis.
 * Displays hierarchical move sequences with probabilities and evaluations.
 * Follows established patterns from MovesContainer tree visualization.
 */

import React, { useState, useCallback, useMemo } from 'react'
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { EyeIcon, ArrowPathIcon } from '@heroicons/react/24/solid'

import {
  ExpectedWinRateNode,
  ExpectedWinrateTreeProps,
} from 'src/types/expectedWinrate'

interface TreeNodeRowProps {
  node: ExpectedWinRateNode
  level: number
  isExpanded: boolean
  onToggleExpand: (nodeId: string) => void
  onNodeClick?: (node: ExpectedWinRateNode) => void
  onBoardPreview?: (fen: string, path: string[]) => void
  highlightedNodeId?: string
  path: string[]
}

const TreeNodeRow = ({
  node,
  level,
  isExpanded,
  onToggleExpand,
  onNodeClick,
  onBoardPreview,
  highlightedNodeId,
  path,
}: TreeNodeRowProps) => {
  const hasChildren = node.children.length > 0
  const isHighlighted = highlightedNodeId === node.id
  const isLeaf = node.isLeafNode
  const isPruned = node.isPruned

  const handleToggle = useCallback(() => {
    if (hasChildren) {
      onToggleExpand(node.id)
    }
  }, [hasChildren, onToggleExpand, node.id])

  const handleNodeClick = useCallback(() => {
    onNodeClick?.(node)
  }, [onNodeClick, node])

  const handlePreview = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onBoardPreview?.(node.fen, path)
    },
    [onBoardPreview, node.fen, path],
  )

  const probabilityPercent = (node.probability * 100).toFixed(1)
  const cumulativePercent = (node.cumulativeProbability * 100).toFixed(2)

  const getWinrateDisplay = () => {
    if (node.stockfishWinrate === undefined) return '—'
    return `${(node.stockfishWinrate * 100).toFixed(1)}%`
  }

  const getWinrateColor = (winrate?: number) => {
    if (winrate === undefined) return 'text-text-secondary'
    if (winrate >= 0.6) return 'text-green-400'
    if (winrate >= 0.5) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.2) return 'text-green-300'
    if (probability >= 0.1) return 'text-yellow-300'
    if (probability >= 0.05) return 'text-orange-300'
    return 'text-red-300'
  }

  // Handle keyboard interaction for accessibility
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleNodeClick()
      }
    },
    [handleNodeClick],
  )

  return (
    <div className={`group ${isHighlighted ? 'bg-accent-1/20' : ''}`}>
      <div
        role="button"
        tabIndex={0}
        className="flex cursor-pointer items-center px-2 py-1 hover:bg-background-2/30"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleNodeClick}
        onKeyDown={handleKeyDown}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={handleToggle}
          className="text-text-secondary hover:text-text-primary mr-2 flex h-4 w-4 flex-shrink-0 items-center justify-center"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDownIcon className="h-3 w-3" />
            ) : (
              <ChevronRightIcon className="h-3 w-3" />
            )
          ) : (
            <div className="h-3 w-3" />
          )}
        </button>

        {/* Move notation */}
        <div className="text-text-primary min-w-[40px] flex-shrink-0 font-mono text-sm">
          {node.san}
        </div>

        {/* Probability */}
        <div
          className={`ml-2 min-w-[50px] flex-shrink-0 text-right text-xs ${getProbabilityColor(node.probability)}`}
        >
          {probabilityPercent}%
        </div>

        {/* Cumulative Probability */}
        <div className="text-text-secondary ml-2 min-w-[50px] flex-shrink-0 text-right text-xs">
          {cumulativePercent}%
        </div>

        {/* Stockfish Winrate */}
        <div
          className={`ml-2 min-w-[50px] flex-shrink-0 text-right text-xs ${getWinrateColor(node.stockfishWinrate)}`}
        >
          {getWinrateDisplay()}
        </div>

        {/* Depth indicator */}
        <div className="text-text-secondary ml-2 min-w-[30px] flex-shrink-0 text-right text-xs">
          d{node.depth}
        </div>

        {/* Status indicators */}
        <div className="ml-2 flex flex-shrink-0 items-center gap-1">
          {isLeaf && (
            <div
              className={`h-2 w-2 rounded-full ${isPruned ? 'bg-orange-400' : 'bg-blue-400'}`}
              title={isPruned ? 'Pruned leaf' : 'Natural leaf'}
            />
          )}
        </div>

        {/* Preview button */}
        <button
          onClick={handlePreview}
          className="text-text-secondary hover:text-accent-1 ml-auto flex-shrink-0 p-1 opacity-0 transition-opacity group-hover:opacity-100"
          title="Preview position"
        >
          <EyeIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export const ExpectedWinrateTree = ({
  tree,
  analysisEnabled,
  onNodeClick,
  onBoardPreview,
  highlightedNodeId,
}: ExpectedWinrateTreeProps) => {
  // Track which nodes are expanded in the tree view
  // Initially only the root node is expanded
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    () => new Set(tree?.id ? [tree.id] : []),
  )

  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }, [])

  // Handler for board preview button clicks on tree nodes
  // Calls parent callback to display position in BoardPreview component
  const handleBoardPreview = useCallback(
    (fen: string, path: string[]) => {
      onBoardPreview?.(fen, path)
    },
    [onBoardPreview],
  )

  const expandAll = useCallback(() => {
    if (!tree) return
    const allNodeIds = new Set<string>()

    const collectNodeIds = (node: ExpectedWinRateNode) => {
      allNodeIds.add(node.id)
      node.children.forEach(collectNodeIds)
    }

    collectNodeIds(tree)
    setExpandedNodes(allNodeIds)
  }, [tree])

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set(tree?.id ? [tree.id] : []))
  }, [tree?.id])

  const renderNode = useCallback(
    (
      node: ExpectedWinRateNode,
      level = 0,
      path: string[] = [],
    ): React.ReactElement[] => {
      const currentPath = [...path, node.san]
      const isExpanded = expandedNodes.has(node.id)

      const elements = [
        <TreeNodeRow
          key={node.id}
          node={node}
          level={level}
          isExpanded={isExpanded}
          onToggleExpand={handleToggleExpand}
          onNodeClick={onNodeClick}
          onBoardPreview={handleBoardPreview}
          highlightedNodeId={highlightedNodeId}
          path={currentPath}
        />,
      ]

      if (isExpanded) {
        node.children.forEach((child) => {
          elements.push(...renderNode(child, level + 1, currentPath))
        })
      }

      return elements
    },
    [
      expandedNodes,
      handleToggleExpand,
      onNodeClick,
      handleBoardPreview,
      highlightedNodeId,
    ],
  )

  const treeStats = useMemo(() => {
    if (!tree) return null

    let totalNodes = 0
    let leafNodes = 0
    let prunedNodes = 0
    let maxDepth = 0

    const traverseTree = (node: ExpectedWinRateNode) => {
      totalNodes++
      maxDepth = Math.max(maxDepth, node.depth)

      if (node.isLeafNode) {
        leafNodes++
        if (node.isPruned) prunedNodes++
      }

      node.children.forEach(traverseTree)
    }

    traverseTree(tree)

    return { totalNodes, leafNodes, prunedNodes, maxDepth }
  }, [tree])

  if (!analysisEnabled) {
    return (
      <div className="border-border-1 relative rounded-lg border bg-background-1/60 p-6 backdrop-blur-sm">
        <div className="absolute inset-0 rounded-lg bg-background-1/20 backdrop-blur-sm" />
        <div className="text-text-secondary relative z-10 text-center">
          <h3 className="mb-2 text-sm font-medium">Probability Tree</h3>
          <p className="text-xs opacity-75">
            Enable analysis to view probability trees
          </p>
        </div>
      </div>
    )
  }

  if (!tree) {
    return (
      <div className="border-border-1 rounded-lg border bg-background-1/60 p-6 backdrop-blur-sm">
        <div className="text-text-secondary text-center">
          <h3 className="mb-2 text-sm font-medium">Probability Tree</h3>
          <p className="text-xs opacity-75">
            Select a move to view its probability tree
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="border-border-1 rounded-lg border bg-background-1/60 backdrop-blur-sm">
      {/* Header */}
      <div className="border-border-1 border-b p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-text-primary text-sm font-medium">
            Probability Tree: {tree.san}
          </h3>
          <div className="flex gap-1">
            <button
              onClick={expandAll}
              className="text-text-secondary hover:text-text-primary p-1 text-xs transition-colors"
              title="Expand all"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
            <button
              onClick={collapseAll}
              className="text-text-secondary hover:text-text-primary p-1 text-xs transition-colors"
              title="Collapse all"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        {treeStats && (
          <div className="text-text-secondary space-x-4 text-xs">
            <span>Nodes: {treeStats.totalNodes}</span>
            <span>Leaves: {treeStats.leafNodes}</span>
            {treeStats.prunedNodes > 0 && (
              <span>Pruned: {treeStats.prunedNodes}</span>
            )}
            <span>Max depth: {treeStats.maxDepth}</span>
          </div>
        )}

        {/* Column Headers */}
        <div className="text-text-secondary mt-3 flex items-center px-2 text-xs">
          <div className="mr-2 w-4"></div>
          <div className="min-w-[40px]">Move</div>
          <div className="ml-2 min-w-[50px] text-right">Prob%</div>
          <div className="ml-2 min-w-[50px] text-right">Cum%</div>
          <div className="ml-2 min-w-[50px] text-right">Win%</div>
          <div className="ml-2 min-w-[30px] text-right">D</div>
        </div>
      </div>

      {/* Tree */}
      <div className="max-h-96 overflow-y-auto">
        <div className="py-1">{renderNode(tree)}</div>
      </div>
    </div>
  )
}
