/**
 * Expected Winrate Results Component
 *
 * Displays Expected Winrate calculation results with move rankings, confidence scores,
 * and interactive tree visualization. Follows established patterns from MovesByRating
 * and integrates with existing responsive design and color systems.
 */

import { useContext, useCallback, useMemo, useState } from 'react'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

import {
  ExpectedWinRateResult,
  ExpectedWinRateNode,
  ExpectedWinrateProgress,
  ExpectedWinrateResultsProps,
} from 'src/types/expectedWinrate'
import { WindowSizeContext } from 'src/contexts/WindowSizeContext'
import { formatMoveNumber, formatTime } from 'src/lib/format'

/**
 * Extract the most likely continuation line from a probability tree
 *
 * This function traverses the tree following the highest-probability child
 * at each node, building a line of moves that represents the most likely
 * sequence of play according to Maia's move predictions.
 *
 * @param tree - The root node of the probability tree for a candidate move
 * @param maxMoves - Maximum number of moves to include in the line (default: 4)
 * @returns Array of SAN notation moves representing the most likely line
 *
 * @example
 * // Returns ['e5', 'Nf3', 'Nc6', 'Bb5'] for a typical Italian game line
 * getMostLikelyLine(e4Tree, 4)
 */
function getMostLikelyLine(tree: ExpectedWinRateNode, maxMoves = 4): string[] {
  const moves: string[] = []
  let current = tree

  // Traverse down the tree following highest probability children
  while (current.children.length > 0 && moves.length < maxMoves) {
    // Find the child node with the highest probability
    // This represents the most likely response according to Maia
    const bestChild = current.children.reduce((a, b) =>
      a.probability > b.probability ? a : b,
    )

    // Add the move in standard algebraic notation
    moves.push(bestChild.san)

    // Move to the child and continue traversing
    current = bestChild
  }

  return moves
}

interface MoveResultRowProps {
  result: ExpectedWinRateResult
  index: number
  onMoveSelect?: (move: string) => void
  onTreeToggle?: (move: string) => void
  colorSanMapping: { [move: string]: { san: string; color: string } }
  fontSize: number
  isTreeExpanded: boolean
}

const MoveResultRow = ({
  result,
  index,
  onMoveSelect,
  onTreeToggle,
  colorSanMapping,
  fontSize,
  isTreeExpanded,
}: MoveResultRowProps) => {
  const handleMoveClick = useCallback(() => {
    onMoveSelect?.(result.move)
  }, [onMoveSelect, result.move])

  const handleTreeClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onTreeToggle?.(result.move)
    },
    [onTreeToggle, result.move],
  )

  const colorInfo = colorSanMapping[result.move] || {
    san: result.san,
    color: '#94a3b8',
  }
  const winratePercent = (result.expectedWinrate * 100).toFixed(1)
  const confidencePercent = (result.confidence * 100).toFixed(0)

  // Determine move quality color based on expected winrate
  const getWinrateColor = (winrate: number) => {
    if (winrate >= 0.6) return 'text-green-400'
    if (winrate >= 0.5) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-300'
    if (confidence >= 0.6) return 'text-yellow-300'
    return 'text-red-300'
  }

  // Get the most likely continuation line from this move's tree
  // This shows what sequence of moves Maia predicts is most probable
  const mostLikelyLine = useMemo(
    () => getMostLikelyLine(result.tree, 4),
    [result.tree],
  )

  // Handle keyboard interaction (Enter or Space triggers click)
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleMoveClick()
      }
    },
    [handleMoveClick],
  )

  return (
    <div className="group">
      <div
        role="button"
        tabIndex={0}
        onClick={handleMoveClick}
        onKeyDown={handleKeyDown}
        className="flex cursor-pointer items-center rounded p-2 transition-colors hover:bg-background-2/50"
      >
        {/* Rank and Move */}
        <div className="flex min-w-0 items-center">
          <div className="text-text-secondary w-6 flex-shrink-0 text-center text-xs">
            {index + 1}
          </div>
          <div
            className="min-w-0 flex-shrink-0 px-2 font-mono font-medium"
            style={{
              color: colorInfo.color,
              fontSize: `${fontSize}px`,
            }}
          >
            {colorInfo.san}
          </div>
        </div>

        {/* Expected Winrate */}
        <div
          className={`min-w-[55px] flex-shrink-0 text-right ${getWinrateColor(result.expectedWinrate)}`}
        >
          <div className="text-sm font-medium">{winratePercent}%</div>
        </div>

        {/* Most Likely Line - inline continuation preview */}
        {mostLikelyLine.length > 0 && (
          <div className="text-text-secondary ml-3 flex min-w-0 flex-1 items-center overflow-hidden">
            <span className="mr-1 text-xs opacity-60">══►</span>
            <span className="truncate font-mono text-xs">
              {mostLikelyLine.join(' ')}
            </span>
          </div>
        )}

        {/* Tree Toggle */}
        <button
          onClick={handleTreeClick}
          className="text-text-secondary hover:text-text-primary ml-2 flex-shrink-0 p-1 transition-colors"
          aria-label={`${isTreeExpanded ? 'Hide' : 'Show'} probability tree for ${colorInfo.san}`}
        >
          <ChevronRightIcon
            className={`h-4 w-4 transition-transform ${isTreeExpanded ? 'rotate-90' : ''}`}
          />
        </button>
      </div>

      {/* Additional Details (on hover/expanded) */}
      <div className="px-8 pb-2 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="text-text-secondary space-x-4 text-xs">
          <span>Nodes: {result.nodeCount.toLocaleString()}</span>
          <span>Leaves: {result.leafNodeCount.toLocaleString()}</span>
          <span>Conf: {confidencePercent}%</span>
          {result.calculationTime > 0 && (
            <span>Time: {formatTime(result.calculationTime)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

const ProgressIndicator = ({
  progress,
}: {
  progress: ExpectedWinrateProgress
}) => {
  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'filtering':
        return 'Filtering moves'
      case 'tree_generation':
        return 'Building trees'
      case 'evaluation':
        return 'Evaluating positions'
      case 'calculation':
        return 'Calculating results'
      case 'complete':
        return 'Complete'
      default:
        return 'Processing'
    }
  }

  const formatProgressText = () => {
    if (progress.currentMove) {
      return `${getPhaseLabel(progress.currentPhase)}: ${progress.currentMove}`
    }
    if (progress.movesProcessed > 0 && progress.totalMoves > 0) {
      return `${getPhaseLabel(progress.currentPhase)} (${progress.movesProcessed}/${progress.totalMoves})`
    }
    return getPhaseLabel(progress.currentPhase)
  }

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">{formatProgressText()}</span>
        <span className="text-text-secondary">
          {Math.round(progress.overallProgress * 100)}%
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-background-2">
        <div
          className="bg-accent-1 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress.overallProgress * 100}%` }}
        />
      </div>

      {progress.warnings.length > 0 && (
        <div className="space-y-1">
          {progress.warnings.map((warning, index) => (
            <div key={index} className="text-xs text-yellow-400">
              ⚠ {warning}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const ExpectedWinrateResults = ({
  results,
  progress,
  analysisEnabled,
  onMoveSelect,
  colorSanMapping = {},
}: ExpectedWinrateResultsProps) => {
  const windowSize = useContext(WindowSizeContext)
  const [expandedTrees, setExpandedTrees] = useState<Set<string>>(new Set())

  // Progressive font sizing based on window width (following MoveMap pattern)
  const fontSize = useMemo(() => {
    if (!windowSize.width) return 14
    if (windowSize.width < 768) return 12 // mobile
    if (windowSize.width < 1024) return 13 // tablet
    if (windowSize.width < 1280) return 14 // desktop
    if (windowSize.width < 1920) return 15 // large desktop
    return 16 // ultra-wide
  }, [windowSize.width])

  const handleTreeToggle = useCallback((move: string) => {
    setExpandedTrees((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(move)) {
        newSet.delete(move)
      } else {
        newSet.add(move)
      }
      return newSet
    })
  }, [])

  if (!analysisEnabled) {
    return (
      <div className="border-border-1 relative rounded-lg border bg-background-1/60 p-6 backdrop-blur-sm">
        <div className="absolute inset-0 rounded-lg bg-background-1/20 backdrop-blur-sm" />
        <div className="text-text-secondary relative z-10 text-center">
          <h3 className="mb-2 text-sm font-medium">Expected Winrate Results</h3>
          <p className="text-xs opacity-75">
            Enable analysis to view Expected Winrate calculations
          </p>
        </div>
      </div>
    )
  }

  // Show progress indicator during calculation
  if (progress?.isCalculating) {
    return (
      <div className="border-border-1 rounded-lg border bg-background-1/60 backdrop-blur-sm">
        <div className="border-border-1 border-b p-3">
          <h3 className="text-text-primary flex items-center gap-2 text-sm font-medium">
            Expected Winrate Results
            <div className="bg-accent-1 h-2 w-2 animate-pulse rounded-full" />
          </h3>
        </div>
        <ProgressIndicator progress={progress} />
      </div>
    )
  }

  // Show empty state when no results
  if (!results || results.length === 0) {
    return (
      <div className="border-border-1 rounded-lg border bg-background-1/60 p-6 backdrop-blur-sm">
        <div className="text-text-secondary text-center">
          <h3 className="mb-2 text-sm font-medium">Expected Winrate Results</h3>
          <p className="text-xs opacity-75">
            Start calculation to see Expected Winrate analysis
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="border-border-1 rounded-lg border bg-background-1/60 backdrop-blur-sm">
      {/* Header */}
      <div className="border-border-1 border-b p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-text-primary text-sm font-medium">
            Expected Winrate Results
          </h3>
          <div className="text-text-secondary text-xs">
            {results.length} move{results.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Column Headers */}
        <div className="text-text-secondary mt-2 flex items-center px-2 text-xs">
          <div className="w-6 text-center">#</div>
          <div className="px-2">Move</div>
          <div className="min-w-[55px] text-right">Win%</div>
          <div className="ml-3 min-w-0 flex-1">Likely Line</div>
          <div className="ml-2 w-6"></div>
        </div>
      </div>

      {/* Results List */}
      <div className="max-h-96 overflow-y-auto">
        <div className="p-1">
          {results.map((result, index) => (
            <MoveResultRow
              key={result.move}
              result={result}
              index={index}
              onMoveSelect={onMoveSelect}
              onTreeToggle={handleTreeToggle}
              colorSanMapping={colorSanMapping}
              fontSize={fontSize}
              isTreeExpanded={expandedTrees.has(result.move)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
