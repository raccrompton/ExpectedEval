import React from 'react'
import { motion } from 'framer-motion'
import { DeepAnalysisProgress } from 'src/hooks/useAnalysisController/useAnalysisController'

interface Props {
  progress: DeepAnalysisProgress
  onCancel: () => void
}

export const AnalysisNotification: React.FC<Props> = ({
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
      className="fixed bottom-4 right-4 z-30 w-80 rounded-lg border border-white/10 bg-background-1 p-4 shadow-lg"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      data-testid="analysis-notification"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-human-4/20">
            <span className="material-symbols-outlined animate-spin !text-lg text-human-4">
              network_intelligence
            </span>
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold">Analyzing Game</h3>
            <p className="text-xs text-secondary">
              Position {progress.currentMoveIndex} of {progress.totalMoves}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-human-4">
            {progressPercentage}%
          </span>
          <button
            onClick={onCancel}
            className="flex h-6 w-6 items-center justify-center rounded bg-background-2 text-xs transition duration-200 hover:bg-background-3"
            title="Cancel Analysis"
          >
            <span className="material-symbols-outlined !text-sm">close</span>
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-background-2">
          <motion.div
            className="h-full rounded-full bg-human-4"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      {progress.currentMove && (
        <div className="mt-2">
          <p className="text-xs text-secondary">
            Current:{' '}
            <span className="font-mono text-human-3">
              {progress.currentMove}
            </span>
          </p>
        </div>
      )}
    </motion.div>
  )
}
