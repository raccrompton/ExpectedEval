import React, { useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts'
import { AnalyzedGame } from 'src/types'
import { extractPlayerMistakes } from 'src/lib/analysis'

interface Props {
  isOpen: boolean
  onClose: () => void
  game: AnalyzedGame
}

interface GameSummary {
  whiteMistakes: {
    total: number
    blunders: number
    inaccuracies: number
  }
  blackMistakes: {
    total: number
    blunders: number
    inaccuracies: number
  }
  evaluationData: Array<{
    ply: number
    evaluation: number
    moveNumber: number
  }>
}

export const AnalysisSummaryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  game,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const summary = useMemo((): GameSummary => {
    const mainLine = game.tree.getMainLine()
    const whiteMistakes = extractPlayerMistakes(game.tree, 'white')
    const blackMistakes = extractPlayerMistakes(game.tree, 'black')

    // Generate evaluation data for the chart
    const evaluationData = mainLine.slice(1).map((node, index) => {
      const evaluation = node.analysis.stockfish?.model_optimal_cp || 0
      // Convert centipawns to evaluation (cap at +/- 5 for chart readability)
      const normalizedEval = Math.max(-5, Math.min(5, evaluation / 100))
      
      return {
        ply: index + 1,
        evaluation: normalizedEval,
        moveNumber: Math.ceil((index + 1) / 2),
      }
    })

    return {
      whiteMistakes: {
        total: whiteMistakes.length,
        blunders: whiteMistakes.filter((m) => m.type === 'blunder').length,
        inaccuracies: whiteMistakes.filter((m) => m.type === 'inaccuracy').length,
      },
      blackMistakes: {
        total: blackMistakes.length,
        blunders: blackMistakes.filter((m) => m.type === 'blunder').length,
        inaccuracies: blackMistakes.filter((m) => m.type === 'inaccuracy').length,
      },
      evaluationData,
    }
  }, [game.tree])

  if (!isOpen) return null

  const formatYAxisLabel = (value: number) => {
    if (value === 0) return '0.00'
    return value > 0 ? `+${value.toFixed(1)}` : `${value.toFixed(1)}`
  }

  const PlayerPerformanceRow = ({ 
    title, 
    color, 
    mistakes, 
    playerName 
  }: { 
    title: string
    color: string
    mistakes: { total: number; blunders: number; inaccuracies: number }
    playerName: string 
  }) => (
    <div className="flex items-center justify-between rounded border border-white/5 bg-background-2/30 p-3">
      <div className="flex items-center gap-3">
        <div className={`h-4 w-4 rounded-full ${color === 'white' ? 'bg-white' : 'border border-white bg-black'}`} />
        <div>
          <p className="text-sm font-medium text-primary">{playerName}</p>
          <p className="text-xs text-secondary">{title}</p>
        </div>
      </div>
      
      {mistakes.total === 0 ? (
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined !text-sm text-green-400">check_circle</span>
          <span className="text-xs text-green-400">Clean game</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-red-400">{mistakes.blunders}</span>
            <span className="text-secondary">blunders</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-orange-400">{mistakes.inaccuracies}</span>
            <span className="text-secondary">inaccuracies</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-primary">{mistakes.total}</span>
            <span className="text-secondary">total</span>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <motion.div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm md:px-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        className="flex w-full max-w-4xl flex-col gap-5 rounded-lg border border-white/10 bg-background-1 p-6 shadow-2xl"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-human-4">
              analytics
            </span>
            <h2 className="text-xl font-bold text-primary">Analysis Complete</h2>
          </div>
          <button
            onClick={onClose}
            className="text-secondary transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {/* Player Performance */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-primary/90">Player Performance</h3>
            <div className="flex flex-col gap-2">
              <PlayerPerformanceRow
                title="White"
                color="white"
                mistakes={summary.whiteMistakes}
                playerName={game.whitePlayer.name}
              />
              <PlayerPerformanceRow
                title="Black"
                color="black"
                mistakes={summary.blackMistakes}
                playerName={game.blackPlayer.name}
              />
            </div>
          </div>

          {/* Evaluation Chart */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-primary/90">Game Evaluation</h3>
            <div className="rounded border border-white/10 bg-background-2/20 p-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.evaluationData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <XAxis 
                      dataKey="moveNumber" 
                      tick={{ fontSize: 12, fill: '#94a3b8' }}
                      tickLine={{ stroke: '#334155' }}
                      axisLine={{ stroke: '#334155' }}
                    />
                    <YAxis 
                      domain={[-5, 5]}
                      tickFormatter={formatYAxisLabel}
                      tick={{ fontSize: 12, fill: '#94a3b8' }}
                      tickLine={{ stroke: '#334155' }}
                      axisLine={{ stroke: '#334155' }}
                    />
                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />
                    <Line 
                      type="monotone" 
                      dataKey="evaluation" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#3b82f6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-center justify-center gap-4 text-xs text-secondary">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span>Stockfish Evaluation</span>
                </div>
                <span>•</span>
                <span>Positive values favor White</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-white/10 pt-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded bg-human-4 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-human-4/90"
          >
            <span className="material-symbols-outlined !text-sm">check</span>
            Continue
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}