import React from 'react'
import { motion } from 'framer-motion'
import { ModalContainer } from '../Misc'
import { OverallPerformanceData } from 'src/types/openings'

interface Props {
  performanceData: OverallPerformanceData
  onContinueAnalyzing: () => void
  onSelectNewOpenings: () => void
}

export const FinalCompletionModal: React.FC<Props> = ({
  performanceData,
  onContinueAnalyzing,
  onSelectNewOpenings,
}) => {
  const {
    totalDrills,
    completedDrills,
    overallAccuracy,
    totalBlunders,
    totalGoodMoves,
    bestPerformance,
    worstPerformance,
    averageEvaluation,
  } = performanceData

  return (
    <ModalContainer dismiss={onContinueAnalyzing}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative flex h-[85vh] max-h-[700px] w-[90vw] max-w-[900px] flex-col overflow-hidden rounded-lg bg-background-1 shadow-2xl"
      >
        {/* Header */}
        <div className="border-b border-white/10 p-6 text-center">
          <div className="mb-2">
            <span className="material-symbols-outlined text-6xl text-human-4">
              emoji_events
            </span>
          </div>
          <h2 className="text-3xl font-bold text-primary">Congratulations!</h2>
          <p className="mt-2 text-secondary">
            You have completed all {totalDrills} opening drills!
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Overall Stats */}
          <div className="flex w-1/2 flex-col gap-4 border-r border-white/10 p-6">
            <h3 className="text-xl font-semibold">Overall Performance</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded bg-background-2 p-4 text-center">
                <p className="text-3xl font-bold text-human-4">
                  {Math.round(overallAccuracy)}%
                </p>
                <p className="text-sm text-secondary">Overall Accuracy</p>
              </div>
              <div className="rounded bg-background-2 p-4 text-center">
                <p className="text-3xl font-bold text-primary">{totalDrills}</p>
                <p className="text-sm text-secondary">Drills Completed</p>
              </div>
              <div className="rounded bg-background-2 p-4 text-center">
                <p className="text-3xl font-bold text-green-400">
                  {totalGoodMoves}
                </p>
                <p className="text-sm text-secondary">Total Good Moves</p>
              </div>
              <div className="rounded bg-background-2 p-4 text-center">
                <p className="text-3xl font-bold text-red-400">
                  {totalBlunders}
                </p>
                <p className="text-sm text-secondary">Total Blunders</p>
              </div>
            </div>

            <div className="rounded bg-background-2 p-4">
              <h4 className="mb-2 text-sm font-medium">
                Average Final Evaluation
              </h4>
              <p className="text-center text-2xl font-bold">
                {averageEvaluation > 0 ? '+' : ''}
                {(averageEvaluation / 100).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Right Panel - Drill Details */}
          <div className="flex w-1/2 flex-col gap-4 p-6">
            <h3 className="text-xl font-semibold">Drill Summary</h3>

            {/* Best and Worst Performance */}
            <div className="space-y-3">
              {bestPerformance && (
                <div className="rounded bg-green-500/10 p-3">
                  <h4 className="text-sm font-medium text-green-400">
                    Best Performance
                  </h4>
                  <p className="text-sm text-primary">
                    {bestPerformance.selection.opening.name}
                    {bestPerformance.selection.variation &&
                      ` - ${bestPerformance.selection.variation.name}`}
                  </p>
                  <p className="text-xs text-secondary">
                    {bestPerformance.goodMoves.length} good moves,
                    {bestPerformance.blunders.length} blunders
                  </p>
                </div>
              )}

              {worstPerformance && (
                <div className="rounded bg-red-500/10 p-3">
                  <h4 className="text-sm font-medium text-red-400">
                    Most Challenging
                  </h4>
                  <p className="text-sm text-primary">
                    {worstPerformance.selection.opening.name}
                    {worstPerformance.selection.variation &&
                      ` - ${worstPerformance.selection.variation.name}`}
                  </p>
                  <p className="text-xs text-secondary">
                    {worstPerformance.goodMoves.length} good moves,
                    {worstPerformance.blunders.length} blunders
                  </p>
                </div>
              )}
            </div>

            {/* Completed Drills List */}
            <div className="flex-1 overflow-y-auto">
              <h4 className="mb-2 text-sm font-medium">All Completed Drills</h4>
              <div className="space-y-2">
                {completedDrills.map((drill, index) => (
                  <div
                    key={drill.selection.id}
                    className="rounded bg-background-2 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {drill.selection.opening.name}
                        </p>
                        {drill.selection.variation && (
                          <p className="text-xs text-secondary">
                            {drill.selection.variation.name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {Math.round(
                            (drill.goodMoves.length / drill.totalMoves) * 100,
                          )}
                          %
                        </p>
                        <p className="text-xs text-secondary">
                          {drill.totalMoves} moves
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 border-t border-white/10 p-6">
          <button
            onClick={onContinueAnalyzing}
            className="flex-1 rounded bg-background-2 py-3 font-medium transition-colors hover:bg-background-3"
          >
            Continue Analyzing Openings
          </button>
          <button
            onClick={onSelectNewOpenings}
            className="flex-1 rounded bg-human-4 py-3 font-medium transition-colors hover:bg-human-4/80"
          >
            Select New Openings
          </button>
        </div>
      </motion.div>
    </ModalContainer>
  )
}
