/**
 * Expected Winrate Tree Component
 *
 * Interactive probability tree visualization for Expected Winrate analysis.
 * Displays hierarchical move sequences with probabilities and evaluations.
 * Follows established patterns from MovesContainer tree visualization.
 */

import { useState, useCallback, useMemo } from 'react'
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { EyeIcon, ArrowPathIcon } from '@heroicons/react/24/solid'

import {
  ExpectedWinRateNode,
  ExpectedWinrateTreeProps,
  BoardPreviewState,
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

  const handlePreview = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onBoardPreview?.(node.fen, path)
  }, [onBoardPreview, node.fen, path])

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

  return (
    <div className={`group ${isHighlighted ? 'bg-accent-1/20' : ''}`}>
      <div 
        className="flex items-center py-1 px-2 hover:bg-background-2/30 cursor-pointer"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleNodeClick}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={handleToggle}
          className="w-4 h-4 flex items-center justify-center text-text-secondary hover:text-text-primary mr-2 flex-shrink-0"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDownIcon className="w-3 h-3" />
            ) : (
              <ChevronRightIcon className="w-3 h-3" />
            )
          ) : (
            <div className="w-3 h-3" />
          )}
        </button>

        {/* Move notation */}
        <div className="font-mono text-sm min-w-[40px] flex-shrink-0 text-text-primary">
          {node.san}
        </div>

        {/* Probability */}
        <div className={`text-xs min-w-[50px] text-right flex-shrink-0 ml-2 ${getProbabilityColor(node.probability)}`}>
          {probabilityPercent}%
        </div>

        {/* Cumulative Probability */}
        <div className="text-xs min-w-[50px] text-right flex-shrink-0 ml-2 text-text-secondary">
          {cumulativePercent}%
        </div>

        {/* Stockfish Winrate */}
        <div className={`text-xs min-w-[50px] text-right flex-shrink-0 ml-2 ${getWinrateColor(node.stockfishWinrate)}`}>
          {getWinrateDisplay()}
        </div>

        {/* Depth indicator */}
        <div className="text-xs text-text-secondary min-w-[30px] text-right flex-shrink-0 ml-2">
          d{node.depth}
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {isLeaf && (
            <div className={`w-2 h-2 rounded-full ${isPruned ? 'bg-orange-400' : 'bg-blue-400'}`} 
                 title={isPruned ? 'Pruned leaf' : 'Natural leaf'} />
          )}
        </div>

        {/* Preview button */}
        <button
          onClick={handlePreview}
          className="opacity-0 group-hover:opacity-100 p-1 text-text-secondary hover:text-accent-1 transition-opacity ml-auto flex-shrink-0"
          title="Preview position"
        >
          <EyeIcon className="w-4 h-4" />
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
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([tree?.id].filter(Boolean)))
  const [previewState, setPreviewState] = useState<BoardPreviewState>({
    isPreviewActive: false,
    previewPosition: null,
    previewPath: [],
    highlightedNodeId: null,
    analysisPosition: tree?.fen || '',
  })

  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }, [])

  const handleBoardPreview = useCallback((fen: string, path: string[]) => {
    setPreviewState(prev => ({
      ...prev,
      isPreviewActive: true,
      previewPosition: fen,
      previewPath: path,
      highlightedNodeId: null, // Will be set by parent component
    }))
    onBoardPreview?.(fen, path)
  }, [onBoardPreview])

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
    setExpandedNodes(new Set([tree?.id].filter(Boolean)))
  }, [tree?.id])

  const renderNode = useCallback((
    node: ExpectedWinRateNode,
    level: number = 0,
    path: string[] = []
  ): JSX.Element[] => {
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
      />
    ]

    if (isExpanded) {
      node.children.forEach(child => {
        elements.push(...renderNode(child, level + 1, currentPath))
      })
    }

    return elements
  }, [expandedNodes, handleToggleExpand, onNodeClick, handleBoardPreview, highlightedNodeId])

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
      <div className="relative bg-background-1/60 backdrop-blur-sm border border-border-1 rounded-lg p-6">
        <div className="absolute inset-0 bg-background-1/20 backdrop-blur-sm rounded-lg" />
        <div className="relative z-10 text-center text-text-secondary">
          <h3 className="text-sm font-medium mb-2">Probability Tree</h3>
          <p className="text-xs opacity-75">
            Enable analysis to view probability trees
          </p>
        </div>
      </div>
    )
  }

  if (!tree) {
    return (
      <div className="bg-background-1/60 backdrop-blur-sm border border-border-1 rounded-lg p-6">
        <div className="text-center text-text-secondary">
          <h3 className="text-sm font-medium mb-2">Probability Tree</h3>
          <p className="text-xs opacity-75">
            Select a move to view its probability tree
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background-1/60 backdrop-blur-sm border border-border-1 rounded-lg">
      {/* Header */}
      <div className="p-3 border-b border-border-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-text-primary">
            Probability Tree: {tree.san}
          </h3>
          <div className="flex gap-1">
            <button
              onClick={expandAll}
              className="p-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
              title="Expand all"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
            <button
              onClick={collapseAll}
              className="p-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
              title="Collapse all"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        {treeStats && (
          <div className="text-xs text-text-secondary space-x-4">
            <span>Nodes: {treeStats.totalNodes}</span>
            <span>Leaves: {treeStats.leafNodes}</span>
            {treeStats.prunedNodes > 0 && (
              <span>Pruned: {treeStats.prunedNodes}</span>
            )}
            <span>Max depth: {treeStats.maxDepth}</span>
          </div>
        )}

        {/* Column Headers */}
        <div className="flex items-center mt-3 px-2 text-xs text-text-secondary">
          <div className="w-4 mr-2"></div>
          <div className="min-w-[40px]">Move</div>
          <div className="min-w-[50px] text-right ml-2">Prob%</div>
          <div className="min-w-[50px] text-right ml-2">Cum%</div>
          <div className="min-w-[50px] text-right ml-2">Win%</div>
          <div className="min-w-[30px] text-right ml-2">D</div>
        </div>
      </div>

      {/* Tree */}
      <div className="max-h-96 overflow-y-auto">
        <div className="py-1">
          {renderNode(tree)}
        </div>
      </div>
    </div>
  )
}