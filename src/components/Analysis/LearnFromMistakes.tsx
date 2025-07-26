import React from 'react'
import { LearnFromMistakesState, MistakePosition } from 'src/types/analysis'

interface Props {
  state: LearnFromMistakesState
  currentInfo: {
    mistake: MistakePosition
    progress: string
    isLastMistake: boolean
  } | null
  onShowSolution: () => void
  onNext: () => void
  onStop: () => void
  lastMoveResult?: 'correct' | 'incorrect' | 'not-learning'
}

export const LearnFromMistakes: React.FC<Props> = ({
  state,
  currentInfo,
  onShowSolution,
  onNext,
  onStop,
  lastMoveResult,
}) => {
  if (!state.isActive || !currentInfo) {
    return null
  }

  const { mistake, progress, isLastMistake } = currentInfo

  const getMoveDisplay = () => {
    const moveNumber = Math.ceil((mistake.moveIndex + 1) / 2)
    const isWhiteMove = mistake.moveIndex % 2 === 0

    if (isWhiteMove) {
      return `${moveNumber}. ${mistake.san}`
    } else {
      return `${moveNumber}... ${mistake.san}`
    }
  }

  const getPromptText = () => {
    const mistakeType = mistake.type === 'blunder' ? '??' : '?!'
    const moveDisplay = getMoveDisplay()
    const playerColorName = mistake.playerColor === 'white' ? 'White' : 'Black'

    return `${moveDisplay}${mistakeType} was played. Find a better move for ${playerColorName}.`
  }

  const getFeedbackText = () => {
    if (state.showSolution) {
      return `Correct! ${mistake.bestMoveSan} was the best move.`
    }

    if (lastMoveResult === 'incorrect') {
      const playerColorName =
        mistake.playerColor === 'white' ? 'White' : 'Black'
      return `You can do better. Try another move for ${playerColorName}.`
    }

    return null
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 transform rounded-lg border border-white/10 bg-background-1 p-4 shadow-lg">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-human-4">
              school
            </span>
            <h3 className="font-semibold text-primary">Learn from Mistakes</h3>
            <span className="text-xs text-secondary">({progress})</span>
          </div>
          <button
            onClick={onStop}
            className="flex items-center gap-1 rounded bg-background-2 px-2 py-1 text-xs text-secondary transition duration-200 hover:bg-background-3 hover:text-primary"
          >
            <span className="material-symbols-outlined !text-sm">close</span>
            Stop
          </button>
        </div>

        {/* Main prompt */}
        <div className="rounded bg-background-2/50 p-3">
          <p className="text-sm text-primary">{getPromptText()}</p>
          {getFeedbackText() && (
            <p
              className={`mt-2 text-sm ${
                state.showSolution
                  ? 'text-green-400'
                  : lastMoveResult === 'incorrect'
                    ? 'text-orange-400'
                    : 'text-primary'
              }`}
            >
              {getFeedbackText()}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {!state.showSolution ? (
            <button
              onClick={onShowSolution}
              className="flex items-center gap-1.5 rounded bg-human-4/60 px-3 py-1.5 text-sm text-primary/70 transition duration-200 hover:bg-human-4/80 hover:text-primary"
            >
              <span className="material-symbols-outlined !text-sm">
                lightbulb
              </span>
              Show me the solution
            </button>
          ) : (
            <button
              onClick={onNext}
              className="flex items-center gap-1.5 rounded bg-human-4/60 px-3 py-1.5 text-sm text-primary/70 transition duration-200 hover:bg-human-4/80 hover:text-primary"
            >
              <span className="material-symbols-outlined !text-sm">
                {isLastMistake ? 'check' : 'arrow_forward'}
              </span>
              {isLastMistake ? 'Finish' : 'Next mistake'}
            </button>
          )}

          {state.showSolution && !isLastMistake && (
            <button
              onClick={onNext}
              className="flex items-center gap-1.5 rounded bg-background-2 px-3 py-1.5 text-sm text-secondary transition duration-200 hover:bg-background-3 hover:text-primary"
            >
              <span className="material-symbols-outlined !text-sm">
                skip_next
              </span>
              Skip to next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
