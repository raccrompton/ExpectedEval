import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ModalContainer } from '../Misc'
import { DrillPerformanceData } from 'src/types/openings'

interface Props {
  performanceData: DrillPerformanceData
  onContinueAnalyzing: () => void
  onNextDrill: () => void
  isLastDrill: boolean
}

export const DrillPerformanceModal: React.FC<Props> = ({
  performanceData,
  onContinueAnalyzing,
  onNextDrill,
  isLastDrill,
}) => {
  const {
    drill,
    evaluationChart,
    accuracy,
    blunderCount,
    goodMoveCount,
    feedback,
  } = performanceData

  return (
    <ModalContainer dismiss={onContinueAnalyzing}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative flex h-[80vh] max-h-[600px] w-[90vw] max-w-[800px] flex-col overflow-hidden rounded-lg bg-background-1 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div>
            <h2 className="text-2xl font-bold text-primary">Drill Complete!</h2>
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
          {/* Left Panel - Stats */}
          <div className="flex w-1/2 flex-col gap-4 border-r border-white/10 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded bg-background-2 p-4 text-center">
                <p className="text-2xl font-bold text-human-4">
                  {Math.round(accuracy)}%
                </p>
                <p className="text-sm text-secondary">Accuracy</p>
              </div>
              <div className="rounded bg-background-2 p-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {drill.totalMoves}
                </p>
                <p className="text-sm text-secondary">Moves Played</p>
              </div>
              <div className="rounded bg-background-2 p-4 text-center">
                <p className="text-2xl font-bold text-green-400">
                  {goodMoveCount}
                </p>
                <p className="text-sm text-secondary">Good Moves</p>
              </div>
              <div className="rounded bg-background-2 p-4 text-center">
                <p className="text-2xl font-bold text-red-400">
                  {blunderCount}
                </p>
                <p className="text-sm text-secondary">Blunders</p>
              </div>
            </div>

            {/* Evaluation Chart Placeholder */}
            <div className="flex-1 rounded bg-background-2 p-4">
              <h3 className="mb-2 text-sm font-medium">Position Evaluation</h3>
              <div className="flex h-full items-center justify-center text-secondary">
                {/* Simple text representation for now */}
                <div className="text-center">
                  <p className="text-sm">Final Position:</p>
                  <p className="text-lg font-bold">
                    {drill.finalEvaluation > 0 ? '+' : ''}
                    {(drill.finalEvaluation / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Feedback */}
          <div className="flex w-1/2 flex-col gap-4 p-6">
            <h3 className="text-lg font-semibold">Performance Feedback</h3>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {feedback.map((item, index) => (
                <div key={index} className="rounded bg-background-2 p-3">
                  <p className="text-sm text-primary">{item}</p>
                </div>
              ))}
              {feedback.length === 0 && (
                <p className="text-center text-secondary">
                  Great job completing this opening drill!
                </p>
              )}
            </div>

            {/* Notable Moves */}
            <div className="space-y-2">
              {drill.goodMoves.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-400">
                    Best Moves: {drill.goodMoves.slice(0, 3).join(', ')}
                  </h4>
                </div>
              )}
              {drill.blunders.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-red-400">
                    Blunders: {drill.blunders.slice(0, 3).join(', ')}
                  </h4>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 border-t border-white/10 p-6">
          <button
            onClick={onContinueAnalyzing}
            className="flex-1 rounded bg-background-2 py-3 font-medium transition-colors hover:bg-background-3"
          >
            Continue Analyzing
          </button>
          <button
            onClick={onNextDrill}
            className="flex-1 rounded bg-human-4 py-3 font-medium transition-colors hover:bg-human-4/80"
          >
            {isLastDrill ? 'View Summary' : 'Next Drill'}
          </button>
        </div>
      </motion.div>
    </ModalContainer>
  )
}
