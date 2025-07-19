import React from 'react'
import { motion } from 'framer-motion'
import { GameAnalysisProgress } from 'src/hooks/useAnalysisController/useAnalysisController'

interface Props {
  progress: GameAnalysisProgress
  onCancel: () => void
}

export const AnalysisProgressOverlay: React.FC<Props> = ({
  progress,
  onCancel,
}) => {
  const progressPercentage =
    progress.totalMoves > 0
      ? Math.round((progress.currentMoveIndex / progress.totalMoves) * 100)
      : 0

  if (!progress.isAnalyzing) return null

  return (
    <motion.div
      className="absolute left-0 top-0 z-20 flex h-screen w-screen flex-col items-center justify-center bg-black/10 px-4 backdrop-blur-[2px] md:px-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      data-testid="analysis-progress-overlay"
    >
      <motion.div
        className="flex w-full flex-col gap-5 rounded-md border border-white/10 bg-background-1 p-6 md:w-[min(600px,50vw)] md:p-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-human-4/20">
            <span className="material-symbols-outlined animate-spin text-human-4">
              network_intelligence
            </span>
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold">Analyzing Game</h2>
            <p className="text-sm text-secondary">
              Deep analysis in progress...
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Progress bar */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-primary/80">
                Position {progress.currentMoveIndex} of {progress.totalMoves}
              </span>
              <span className="font-medium text-human-4">
                {progressPercentage}%
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-background-2">
              <motion.div
                className="h-full rounded-full bg-human-4"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Current move being analyzed */}
          {progress.currentMove && (
            <div className="flex items-center gap-2 rounded bg-background-2/60 p-3">
              <span className="material-symbols-outlined text-lg text-human-3">
                memory
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  Currently analyzing:
                </span>
                <span className="font-mono text-xs text-secondary">
                  {progress.currentMove}
                </span>
              </div>
            </div>
          )}

          {/* Analysis info */}
          <div className="rounded bg-background-2/60 p-3">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined !text-base text-secondary">
                info
              </span>
              <p className="text-xs text-secondary">
                Both Maia and Stockfish are analyzing each position. You can
                cancel anytime and keep completed analysis.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <button
            onClick={onCancel}
            className="flex h-10 items-center gap-2 rounded bg-background-2 px-6 text-sm transition duration-200 hover:bg-background-3"
          >
            <span className="material-symbols-outlined text-lg">stop</span>
            Cancel Analysis
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
