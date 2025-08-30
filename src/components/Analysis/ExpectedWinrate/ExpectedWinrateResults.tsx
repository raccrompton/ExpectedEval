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
  ExpectedWinrateProgress,
  ExpectedWinrateResultsProps,
} from 'src/types/expectedWinrate'
import { WindowSizeContext } from 'src/contexts/WindowSizeContext'
import { formatMoveNumber, formatTime } from 'src/lib/format'

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

  const handleTreeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onTreeToggle?.(result.move)
  }, [onTreeToggle, result.move])

  const colorInfo = colorSanMapping[result.move] || { san: result.san, color: '#94a3b8' }
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

  return (
    <div className="group">
      <div
        onClick={handleMoveClick}
        className="flex items-center p-2 rounded hover:bg-background-2/50 cursor-pointer transition-colors"
      >
        {/* Rank and Move */}
        <div className="flex items-center min-w-0 flex-1">
          <div className="w-6 text-xs text-text-secondary text-center flex-shrink-0">
            {index + 1}
          </div>
          <div
            className="font-mono font-medium px-2 min-w-0 flex-shrink-0"
            style={{
              color: colorInfo.color,
              fontSize: `${fontSize}px`,
            }}
          >
            {colorInfo.san}
          </div>
        </div>

        {/* Expected Winrate */}
        <div className={`text-right min-w-[60px] flex-shrink-0 ${getWinrateColor(result.expectedWinrate)}`}>
          <div className="text-sm font-medium">
            {winratePercent}%
          </div>
        </div>

        {/* Confidence */}
        <div className={`text-right min-w-[50px] flex-shrink-0 ml-2 ${getConfidenceColor(result.confidence)}`}>
          <div className="text-xs">
            {confidencePercent}%
          </div>
        </div>

        {/* Tree Toggle */}
        <button
          onClick={handleTreeClick}
          className="ml-2 p-1 text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
          aria-label={`${isTreeExpanded ? 'Hide' : 'Show'} probability tree for ${colorInfo.san}`}
        >
          <ChevronRightIcon 
            className={`w-4 h-4 transition-transform ${isTreeExpanded ? 'rotate-90' : ''}`} 
          />
        </button>
      </div>

      {/* Additional Details (on hover/expanded) */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity px-8 pb-2">
        <div className="text-xs text-text-secondary space-x-4">
          <span>Nodes: {result.nodeCount.toLocaleString()}</span>
          <span>Leaves: {result.leafNodeCount.toLocaleString()}</span>
          {result.calculationTime > 0 && (
            <span>Time: {formatTime(result.calculationTime)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

const ProgressIndicator = ({ progress }: { progress: ExpectedWinrateProgress }) => {
  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'filtering': return 'Filtering moves'
      case 'tree_generation': return 'Building trees'
      case 'evaluation': return 'Evaluating positions'
      case 'calculation': return 'Calculating results'
      case 'complete': return 'Complete'
      default: return 'Processing'
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
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">{formatProgressText()}</span>
        <span className="text-text-secondary">
          {Math.round(progress.overallProgress * 100)}%
        </span>
      </div>
      
      <div className="w-full bg-background-2 rounded-full h-2">
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
    if (windowSize.width < 768) return 12  // mobile
    if (windowSize.width < 1024) return 13 // tablet
    if (windowSize.width < 1280) return 14 // desktop
    if (windowSize.width < 1920) return 15 // large desktop
    return 16 // ultra-wide
  }, [windowSize.width])

  const handleTreeToggle = useCallback((move: string) => {
    setExpandedTrees(prev => {
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
      <div className="relative bg-background-1/60 backdrop-blur-sm border border-border-1 rounded-lg p-6">
        <div className="absolute inset-0 bg-background-1/20 backdrop-blur-sm rounded-lg" />
        <div className="relative z-10 text-center text-text-secondary">
          <h3 className="text-sm font-medium mb-2">Expected Winrate Results</h3>
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
      <div className="bg-background-1/60 backdrop-blur-sm border border-border-1 rounded-lg">
        <div className="p-3 border-b border-border-1">
          <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
            Expected Winrate Results
            <div className="w-2 h-2 bg-accent-1 rounded-full animate-pulse" />
          </h3>
        </div>
        <ProgressIndicator progress={progress} />
      </div>
    )
  }

  // Show empty state when no results
  if (!results || results.length === 0) {
    return (
      <div className="bg-background-1/60 backdrop-blur-sm border border-border-1 rounded-lg p-6">
        <div className="text-center text-text-secondary">
          <h3 className="text-sm font-medium mb-2">Expected Winrate Results</h3>
          <p className="text-xs opacity-75">
            Start calculation to see Expected Winrate analysis
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background-1/60 backdrop-blur-sm border border-border-1 rounded-lg">
      {/* Header */}
      <div className="p-3 border-b border-border-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-primary">
            Expected Winrate Results
          </h3>
          <div className="text-xs text-text-secondary">
            {results.length} move{results.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {/* Column Headers */}
        <div className="flex items-center mt-2 px-2 text-xs text-text-secondary">
          <div className="w-6 text-center">#</div>
          <div className="px-2 min-w-0 flex-1">Move</div>
          <div className="text-right min-w-[60px]">Winrate</div>
          <div className="text-right min-w-[50px] ml-2">Conf</div>
          <div className="w-6 ml-2"></div>
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