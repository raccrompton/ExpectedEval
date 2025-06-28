import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Chess } from 'chess.ts'
import Chessground from '@react-chess/chessground'
import type { Key } from 'chessground/types'
import type { DrawShape, DrawBrushes } from 'chessground/draw'
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
  Tooltip,
} from 'recharts'
import { ModalContainer } from '../Misc'
import { DrillPerformanceData, MoveAnalysis } from 'src/types/openings'

interface Props {
  performanceData: DrillPerformanceData
  onContinueAnalyzing: () => void
  onNextDrill: () => void
  isLastDrill: boolean
}

// Component for animated game replay
const AnimatedGameReplay: React.FC<{
  moveAnalyses: MoveAnalysis[]
  openingFen: string
  playerColor: 'white' | 'black'
  onMoveIndexChange?: (index: number) => void
  externalMoveIndex?: number
  onMoveClick?: (moveIndex: number) => void
}> = ({
  moveAnalyses,
  openingFen,
  playerColor,
  onMoveIndexChange,
  externalMoveIndex,
  onMoveClick,
}) => {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false) // Start paused for interactive mode
  const [chess] = useState(() => new Chess(openingFen))
  const [currentFen, setCurrentFen] = useState(openingFen)
  const [currentMoveQuality, setCurrentMoveQuality] = useState<string | null>(
    null,
  )

  // Reset to opening position
  const resetToStart = useCallback(() => {
    chess.load(openingFen)
    setCurrentFen(openingFen)
    setCurrentMoveIndex(-1)
    setCurrentMoveQuality(null)
    onMoveIndexChange?.(-1)
  }, [chess, openingFen, onMoveIndexChange])

  // Go to specific move
  const goToMove = useCallback(
    (moveIndex: number) => {
      chess.load(openingFen)
      setCurrentMoveIndex(moveIndex)
      onMoveIndexChange?.(moveIndex)

      for (let i = 0; i <= moveIndex && i < moveAnalyses.length; i++) {
        const move = moveAnalyses[i]
        try {
          chess.move(move.move, { sloppy: true })
        } catch (error) {
          console.error('Error making move:', move.move, error)
          break
        }
      }

      setCurrentFen(chess.fen())

      if (moveIndex >= 0 && moveIndex < moveAnalyses.length) {
        const currentMove = moveAnalyses[moveIndex]
        if (currentMove.isPlayerMove) {
          setCurrentMoveQuality(currentMove.classification)
        } else {
          setCurrentMoveQuality(null)
        }
      } else {
        setCurrentMoveQuality(null)
      }
    },
    [chess, openingFen, moveAnalyses, onMoveIndexChange],
  )

  // Respond to external move index changes (from chart hover)
  useEffect(() => {
    if (
      externalMoveIndex !== undefined &&
      externalMoveIndex !== currentMoveIndex
    ) {
      goToMove(externalMoveIndex)
    }
  }, [externalMoveIndex, currentMoveIndex, goToMove])

  // Remove auto-play - now controlled by chart interaction
  // Auto-play animation with continuous looping
  // useEffect(() => {
  //   if (!isPlaying) return

  //   const timer = setTimeout(() => {
  //     if (currentMoveIndex < moveAnalyses.length - 1) {
  //       goToMove(currentMoveIndex + 1)
  //     } else {
  //       // Loop back to the beginning
  //       resetToStart()
  //     }
  //   }, 1500) // Slightly slower for better viewing

  //   return () => clearTimeout(timer)
  // }, [isPlaying, currentMoveIndex, moveAnalyses.length, goToMove, resetToStart])

  // // Start playing automatically on mount
  // useEffect(() => {
  //   if (moveAnalyses.length > 0) {
  //     const timer = setTimeout(() => {
  //       setIsPlaying(true)
  //     }, 1000) // Start after 1 second
  //     return () => clearTimeout(timer)
  //   }
  // }, [moveAnalyses.length])

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return 'text-green-400'
      case 'good':
        return 'text-blue-400'
      case 'inaccuracy':
        return 'text-yellow-400'
      case 'mistake':
        return 'text-orange-400'
      case 'blunder':
        return 'text-red-400'
      default:
        return 'text-secondary'
    }
  }

  const getQualitySymbol = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return '!!'
      case 'good':
        return '!'
      case 'inaccuracy':
        return '?!'
      case 'mistake':
        return '?'
      case 'blunder':
        return '??'
      default:
        return ''
    }
  }

  // Get arrows for optimal moves from the current position (before next move is played)
  const getArrowsForCurrentMove = useCallback((): DrawShape[] => {
    // Show arrows for the position we're currently viewing
    // If we're at the start (currentMoveIndex = -1), show arrows for the opening position
    // If we're at move N, show arrows for what's optimal from the current position
    const positionIndex = currentMoveIndex + 1 // Next move to be analyzed

    if (positionIndex < 0 || positionIndex >= moveAnalyses.length) {
      return []
    }

    const arrows: DrawShape[] = []
    const nextMove = moveAnalyses[positionIndex]

    // Show arrows for any position where we have analysis data
    try {
      // Maia best move (red arrow - user requested red for Maia)
      if (nextMove.maiaBestMove && nextMove.maiaBestMove.length === 4) {
        arrows.push({
          brush: 'red',
          orig: nextMove.maiaBestMove.slice(0, 2) as Key,
          dest: nextMove.maiaBestMove.slice(2, 4) as Key,
        })
      }

      // Stockfish best move (blue arrow - user requested blue for Stockfish)
      if (
        nextMove.stockfishBestMove &&
        nextMove.stockfishBestMove.length === 4 &&
        nextMove.stockfishBestMove !== nextMove.maiaBestMove
      ) {
        arrows.push({
          brush: 'blue',
          orig: nextMove.stockfishBestMove.slice(0, 2) as Key,
          dest: nextMove.stockfishBestMove.slice(2, 4) as Key,
          modifiers: { lineWidth: 8 },
        })
      }
    } catch (error) {
      // Move parsing failed, skip arrows
      console.warn('Error creating arrows:', error)
    }

    return arrows
  }, [currentMoveIndex, moveAnalyses])

  return (
    <div className="rounded bg-background-2 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Game Replay</h4>
          <p className="text-xs text-secondary">
            Watch your opening unfold with move quality indicators
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="rounded bg-human-4 px-2 py-1 text-xs transition-colors hover:bg-human-4/80"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>

      {/* Chess Board */}
      <div className="relative mx-auto aspect-square w-full max-w-[280px]">
        <Chessground
          contained
          config={{
            viewOnly: true,
            fen: currentFen,
            orientation: playerColor,
            coordinates: true,
            animation: { enabled: true, duration: 200 },
            drawable: {
              enabled: true,
              visible: true,
              defaultSnapToValidMove: false,
              autoShapes: getArrowsForCurrentMove(),
              brushes: {
                red: {
                  key: 'red',
                  color: '#dc2626',
                  opacity: 0.8,
                  lineWidth: 8,
                },
                blue: {
                  key: 'blue',
                  color: '#2563eb',
                  opacity: 0.8,
                  lineWidth: 8,
                },
              } as DrawBrushes,
            },
          }}
        />

        {/* Move Quality Overlay */}
        {currentMoveQuality && (
          <div className="absolute right-2 top-2 z-50 rounded border border-white/20 bg-background-1/95 px-2 py-1 shadow-lg">
            <div
              className={`font-mono text-sm font-bold ${getQualityColor(currentMoveQuality)}`}
            >
              {getQualitySymbol(currentMoveQuality)}
            </div>
            <div className="text-xs capitalize text-secondary">
              {currentMoveQuality}
            </div>
          </div>
        )}
      </div>

      {/* Move Navigation */}
      <div className="mt-4">
        <div className="mb-2 text-xs text-secondary">
          Move {currentMoveIndex + 1} of {moveAnalyses.length}
        </div>
        <div className="flex h-2 w-full rounded bg-background-3">
          <div
            className="h-full rounded bg-human-4 transition-all duration-300"
            style={{
              width: `${((currentMoveIndex + 1) / moveAnalyses.length) * 100}%`,
            }}
          />
        </div>

        {/* Arrow Legend */}
        <div className="mt-3 flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-2 w-4 bg-red-500"></div>
            <span>Maia</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-4 bg-blue-500"></div>
            <span>Stockfish</span>
          </div>
        </div>

        {/* Compact Move List */}
        <div className="red-scrollbar mt-3 max-h-32 overflow-y-auto">
          <div className="space-y-1">
            {Array.from(
              { length: Math.ceil(moveAnalyses.length / 2) },
              (_, pairIndex) => {
                const whiteMove = moveAnalyses[pairIndex * 2]
                const blackMove = moveAnalyses[pairIndex * 2 + 1]

                return (
                  <div
                    key={pairIndex}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="w-6 text-secondary">{pairIndex + 1}.</span>

                    {/* White's move */}
                    <button
                      onClick={() => {
                        goToMove(pairIndex * 2)
                        onMoveClick?.(pairIndex * 2)
                      }}
                      className={`rounded px-2 py-1 font-mono transition-colors ${
                        currentMoveIndex === pairIndex * 2
                          ? 'bg-human-4/20 text-human-4'
                          : 'hover:bg-background-3'
                      }`}
                    >
                      {whiteMove.san}
                      {whiteMove.isPlayerMove && (
                        <span
                          className={`ml-1 ${getQualityColor(whiteMove.classification)}`}
                        >
                          {getQualitySymbol(whiteMove.classification)}
                        </span>
                      )}
                    </button>

                    {/* Black's move */}
                    {blackMove && (
                      <button
                        onClick={() => {
                          goToMove(pairIndex * 2 + 1)
                          onMoveClick?.(pairIndex * 2 + 1)
                        }}
                        className={`rounded px-2 py-1 font-mono transition-colors ${
                          currentMoveIndex === pairIndex * 2 + 1
                            ? 'bg-human-4/20 text-human-4'
                            : 'hover:bg-background-3'
                        }`}
                      >
                        {blackMove.san}
                        {blackMove.isPlayerMove && (
                          <span
                            className={`ml-1 ${getQualityColor(blackMove.classification)}`}
                          >
                            {getQualitySymbol(blackMove.classification)}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                )
              },
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Component for the evaluation chart
// Custom dot component for move quality indicators
const CustomDot: React.FC<any> = (props) => {
  const { cx, cy, payload, index } = props
  if (!payload) return null

  const isPlayerMove = payload.isPlayerMove
  const classification = payload.moveClassification
  const isCurrentMove = payload.isCurrentMove

  // Color based on move quality
  let color = '#9ca3af' // Default gray
  if (isPlayerMove) {
    switch (classification) {
      case 'excellent':
        color = '#10b981' // Green
        break
      case 'blunder':
        color = '#ef4444' // Red
        break
      default:
        color = '#9ca3af' // Gray
    }
  }

  const radius = isCurrentMove
    ? 8
    : classification === 'excellent' || classification === 'blunder'
      ? 6
      : 4
  const strokeColor = isCurrentMove
    ? '#ffffff'
    : classification === 'excellent' || classification === 'blunder'
      ? '#ffffff'
      : '#1f2937'
  const strokeWidth = isCurrentMove
    ? 3
    : classification === 'excellent' || classification === 'blunder'
      ? 2
      : 1

  return (
    <Dot
      cx={cx}
      cy={cy}
      r={radius}
      fill={isCurrentMove ? '#f59e0b' : color}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
    />
  )
}

// Custom tooltip component
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload[0]) return null

  const data = payload[0].payload
  const formatEvaluation = (evaluation: number) => {
    if (Math.abs(evaluation) >= 1000) {
      return evaluation > 0 ? '+M' : '-M'
    }
    return evaluation > 0
      ? `+${(evaluation / 100).toFixed(1)}`
      : `${(evaluation / 100).toFixed(1)}`
  }

  return (
    <div className="rounded border border-white/20 bg-background-1/95 p-2 shadow-lg">
      <p className="text-xs font-medium text-primary">
        {data.san ? `${data.san} (Ply ${label})` : `Ply ${label}`}
      </p>
      <p className="text-xs text-secondary">
        Evaluation: {formatEvaluation(data.evaluation)}
      </p>
      {data.isPlayerMove && data.moveClassification && (
        <p
          className={`text-xs capitalize ${
            data.moveClassification === 'excellent'
              ? 'text-green-400'
              : data.moveClassification === 'blunder'
                ? 'text-red-400'
                : 'text-secondary'
          }`}
        >
          {data.moveClassification}
        </p>
      )}
    </div>
  )
}

// Component for the evaluation chart using Recharts
const EvaluationChart: React.FC<{
  evaluationChart: DrillPerformanceData['evaluationChart']
  moveAnalyses: MoveAnalysis[]
  currentMoveIndex?: number
  chartHighlightMove?: number | null
  onHoverMove?: (moveIndex: number) => void
  onClickMove?: (moveIndex: number) => void
}> = ({
  evaluationChart,
  moveAnalyses,
  currentMoveIndex = -1,
  chartHighlightMove,
  onHoverMove,
  onClickMove,
}) => {
  if (evaluationChart.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded bg-background-2 text-secondary">
        <p>Evaluation chart unavailable</p>
      </div>
    )
  }

  // Transform data for Recharts with move analysis
  const chartData = evaluationChart.map((point, index) => {
    // Find corresponding move analysis to get SAN notation
    const moveAnalysis = moveAnalyses[index]

    return {
      moveNumber: index + 1,
      evaluation: point.evaluation,
      isPlayerMove: point.isPlayerMove,
      moveClassification: point.moveClassification,
      isCurrentMove: index === currentMoveIndex,
      san: moveAnalysis?.san || '',
      // For shaded areas - split positive and negative evaluations
      whiteAdvantage: point.evaluation > 0 ? point.evaluation : 0,
      blackAdvantage: point.evaluation < 0 ? point.evaluation : 0,
    }
  })

  // Calculate evaluation bounds for Y-axis
  const maxEval = Math.max(
    Math.abs(Math.max(...evaluationChart.map((point) => point.evaluation))),
    Math.abs(Math.min(...evaluationChart.map((point) => point.evaluation))),
    300,
  )

  const formatEvaluation = (evaluation: number) => {
    if (Math.abs(evaluation) >= 1000) {
      return evaluation > 0 ? '+M' : '-M'
    }
    return evaluation > 0
      ? `+${(evaluation / 100).toFixed(1)}`
      : `${(evaluation / 100).toFixed(1)}`
  }

  return (
    <div className="rounded bg-background-2 p-3">
      <div className="mb-3">
        <h4 className="text-sm font-medium">Position Evaluation</h4>
        <p className="text-xs text-secondary">
          Track how the position&apos;s value changed throughout the opening
        </p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 15, right: 20, left: 25, bottom: 25 }}
            onMouseMove={(data) => {
              if (data && data.activeLabel && onHoverMove) {
                const moveIndex = parseInt(data.activeLabel as string) - 1
                onHoverMove(moveIndex)
              }
            }}
            onClick={(data) => {
              if (data && data.activeLabel && onClickMove) {
                const moveIndex = parseInt(data.activeLabel as string) - 1
                onClickMove(moveIndex)
              }
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.1)"
            />
            <XAxis
              dataKey="moveNumber"
              stroke="#9ca3af"
              fontSize={10}
              label={{
                value: 'Ply Number',
                position: 'insideBottom',
                offset: -15,
                style: {
                  textAnchor: 'middle',
                  fill: '#9ca3af',
                  fontSize: '10px',
                },
              }}
            />
            <YAxis
              domain={[-maxEval, maxEval]}
              stroke="#9ca3af"
              fontSize={10}
              tickFormatter={formatEvaluation}
              label={{
                value: 'Evaluation',
                angle: -90,
                position: 'insideLeft',
                style: {
                  textAnchor: 'middle',
                  fill: '#9ca3af',
                  fontSize: '10px',
                },
              }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Shaded areas for advantage - enhanced visibility */}
            <Area
              type="monotone"
              dataKey="whiteAdvantage"
              stroke="none"
              fill="rgba(240, 240, 240, 0.6)"
              fillOpacity={0.7}
            />
            <Area
              type="monotone"
              dataKey="blackAdvantage"
              stroke="none"
              fill="rgba(60, 60, 60, 0.6)"
              fillOpacity={0.8}
            />

            {/* Reference line at 0 evaluation */}
            <ReferenceLine
              y={0}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={2}
            />

            {/* Current move reference line */}
            {currentMoveIndex >= 0 && currentMoveIndex < chartData.length && (
              <ReferenceLine
                x={currentMoveIndex + 1}
                stroke="#f59e0b"
                strokeWidth={3}
                strokeDasharray="5 5"
                opacity={0.8}
              />
            )}

            {/* Clicked move reference line (from move list) */}
            {chartHighlightMove !== null &&
              chartHighlightMove !== undefined &&
              chartHighlightMove >= 0 &&
              chartHighlightMove < chartData.length &&
              chartHighlightMove !== currentMoveIndex && (
                <ReferenceLine
                  x={chartHighlightMove + 1}
                  stroke="#ec4899"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  opacity={0.9}
                />
              )}

            <Line
              type="monotone"
              dataKey="evaluation"
              stroke="#e5e7eb"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{
                r: 8,
                stroke: '#f59e0b',
                strokeWidth: 2,
                fill: '#f59e0b',
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-3 flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-400"></div>
          <span className="text-secondary">Excellent Move</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-400"></div>
          <span className="text-secondary">Blunder</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-gray-400"></div>
          <span className="text-secondary">Other Moves</span>
        </div>
      </div>
    </div>
  )
}

// Component for rating comparison
const RatingComparison: React.FC<{
  ratingComparison: DrillPerformanceData['ratingComparison']
}> = ({ ratingComparison }) => {
  // Find the rating with the highest probability, but handle edge cases
  const validComparisons = ratingComparison.filter((c) => c.probability > 0)
  const bestMatch =
    validComparisons.length > 0
      ? validComparisons.reduce((best, current) =>
          current.probability > best.probability ? current : best,
        )
      : { rating: 1500, probability: 0 } // Default fallback

  // Sort ratings from lowest to highest
  const sortedRatings = [...ratingComparison].sort(
    (a, b) => a.rating - b.rating,
  )

  return (
    <div className="rounded bg-background-2 p-3">
      <div className="mb-3">
        <h4 className="text-sm font-medium">Playing Strength Analysis</h4>
        <p className="text-xs text-secondary">
          Compares your moves against different Maia rating levels to estimate
          your playing strength
        </p>
      </div>
      {validComparisons.length > 0 ? (
        <>
          {/* Circular/radial visualization */}
          <div className="relative mx-auto mb-4 h-40 w-40">
            <svg viewBox="0 0 160 160" className="h-full w-full">
              {sortedRatings.map((comparison, index) => {
                const radius = 60
                const strokeWidth = 8
                const normalizedRadius = radius - strokeWidth * 0.5
                const circumference = normalizedRadius * 2 * Math.PI
                const strokeDasharray = circumference * comparison.probability
                const rotation = (index * 360) / sortedRatings.length - 90

                const isStrongest = comparison.rating === bestMatch.rating
                const strokeColor = isStrongest ? '#ec4899' : '#374151'
                const opacity = Math.max(0.3, comparison.probability)

                return (
                  <g key={comparison.rating}>
                    <circle
                      cx="80"
                      cy="80"
                      r={normalizedRadius}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${strokeDasharray} ${circumference}`}
                      strokeLinecap="round"
                      opacity={opacity}
                      transform={`rotate(${rotation} 80 80)`}
                    />
                    {/* Rating labels */}
                    <text
                      x={
                        80 +
                        Math.cos(((rotation + 90) * Math.PI) / 180) *
                          (radius + 15)
                      }
                      y={
                        80 +
                        Math.sin(((rotation + 90) * Math.PI) / 180) *
                          (radius + 15)
                      }
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      fontSize="10"
                      fill={isStrongest ? '#ec4899' : '#9ca3af'}
                      fontWeight={isStrongest ? 'bold' : 'normal'}
                    >
                      {comparison.rating}
                    </text>
                  </g>
                )
              })}

              {/* Center text */}
              <text
                x="80"
                y="75"
                textAnchor="middle"
                fontSize="12"
                fill="#9ca3af"
                fontWeight="500"
              >
                Your Level
              </text>
              <text
                x="80"
                y="90"
                textAnchor="middle"
                fontSize="18"
                fill="#ec4899"
                fontWeight="bold"
              >
                {bestMatch.rating}
              </text>
            </svg>
          </div>

          {/* Detailed breakdown */}
          <div className="space-y-1">
            <p className="mb-2 text-xs font-medium text-secondary">
              Rating Breakdown:
            </p>
            {sortedRatings.map((comparison) => (
              <div
                key={comparison.rating}
                className="flex items-center justify-between text-xs"
              >
                <span
                  className={
                    comparison.rating === bestMatch.rating
                      ? 'font-semibold text-human-4'
                      : ''
                  }
                >
                  {comparison.rating}
                </span>
                <span
                  className={
                    comparison.rating === bestMatch.rating
                      ? 'font-semibold text-human-4'
                      : 'text-secondary'
                  }
                >
                  {Math.round(comparison.probability * 100)}%
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded bg-background-3 p-2 text-xs text-secondary">
            <p>
              <strong>How it works:</strong> We compare your moves against what
              Maia models of different ratings would play. The rating with the
              highest percentage match indicates your estimated strength.
            </p>
          </div>
        </>
      ) : (
        <div className="text-center">
          <p className="text-lg font-bold text-human-4">Analyzing...</p>
          <p className="text-xs text-secondary">Rating analysis in progress</p>
        </div>
      )}
    </div>
  )
}

export const DrillPerformanceModal: React.FC<Props> = ({
  performanceData,
  onContinueAnalyzing,
  onNextDrill,
  isLastDrill,
}) => {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [chartHighlightMove, setChartHighlightMove] = useState<number | null>(
    null,
  )
  const [hoveredMoveIndex, setHoveredMoveIndex] = useState<number | null>(null)

  const { drill, evaluationChart, moveAnalyses, ratingComparison } =
    performanceData

  // Handle hover on chart - update board position
  const handleChartHover = (moveIndex: number) => {
    setHoveredMoveIndex(moveIndex)
  }

  // Handle click on move list - highlight on chart
  const handleMoveClick = (moveIndex: number) => {
    setChartHighlightMove(moveIndex)
    setCurrentMoveIndex(moveIndex)
  }

  // Get opening FEN from the drill
  const openingFen = drill.selection.variation
    ? drill.selection.variation.fen
    : drill.selection.opening.fen

  return (
    <ModalContainer dismiss={onContinueAnalyzing}>
      <div className="relative flex h-[90vh] max-h-[800px] w-[95vw] max-w-[1200px] flex-col overflow-hidden rounded-lg bg-background-1 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <h2 className="text-xl font-bold text-primary">
              Drill Analysis Complete
            </h2>
            <p className="text-sm text-secondary">
              {drill.selection.opening.name}
              {drill.selection.variation &&
                ` - ${drill.selection.variation.name}`}
            </p>
          </div>
          <button
            onClick={onContinueAnalyzing}
            className="text-secondary hover:text-primary"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Animated Game Replay */}
          <div className="red-scrollbar flex w-1/3 flex-col gap-3 overflow-y-auto border-r border-white/10 p-4">
            <AnimatedGameReplay
              moveAnalyses={moveAnalyses}
              openingFen={openingFen}
              playerColor={drill.selection.playerColor}
              onMoveIndexChange={setCurrentMoveIndex}
              externalMoveIndex={hoveredMoveIndex ?? undefined}
              onMoveClick={handleMoveClick}
            />
          </div>

          {/* Center Panel - Evaluation Chart */}
          <div className="red-scrollbar flex w-1/3 flex-col gap-3 overflow-y-auto border-r border-white/10 p-4">
            <EvaluationChart
              evaluationChart={evaluationChart}
              moveAnalyses={moveAnalyses}
              currentMoveIndex={currentMoveIndex}
              chartHighlightMove={chartHighlightMove}
              onHoverMove={handleChartHover}
              onClickMove={handleMoveClick}
            />
          </div>

          {/* Right Panel - Rating Analysis */}
          <div className="red-scrollbar flex w-1/3 flex-col gap-3 overflow-y-auto p-4">
            <RatingComparison ratingComparison={ratingComparison} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 border-t border-white/10 p-4">
          <button
            onClick={onContinueAnalyzing}
            className="flex-1 rounded bg-background-2 py-2 font-medium transition-colors hover:bg-background-3"
          >
            Continue Analyzing
          </button>
          <button
            onClick={onNextDrill}
            className="flex-1 rounded bg-human-4 py-2 font-medium transition-colors hover:bg-human-4/80"
          >
            {isLastDrill ? 'View Summary' : 'Next Drill'}
          </button>
        </div>
      </div>
    </ModalContainer>
  )
}
