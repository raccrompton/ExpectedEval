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
    const moveNumber = Math.ceil(mistake.moveIndex / 2)
    const isWhiteMove = mistake.playerColor === 'white'

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
      if (lastMoveResult === 'correct') {
        return `Correct! ${mistake.bestMoveSan} was the best move.`
      } else {
        return `The best move was ${mistake.bestMoveSan}.`
      }
    }

    if (lastMoveResult === 'incorrect') {
      const playerColorName =
        mistake.playerColor === 'white' ? 'White' : 'Black'
      return `You can do better. Try another move for ${playerColorName}.`
    }

    return null
  }

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <div className="flex h-full flex-col justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined !text-sm text-primary">
                school
              </span>
              <h3 className="text-sm font-medium text-primary">
                Learn from your mistakes
              </h3>
              <span className="mt-1 text-xxs text-secondary">({progress})</span>
            </div>
            <button
              onClick={onStop}
              className="flex items-center gap-1 rounded bg-background-1 px-2 py-1 text-xxs text-secondary transition duration-200 hover:bg-background-2/60 hover:text-primary"
            >
              <span className="material-symbols-outlined !text-xxs">close</span>
              Stop
            </button>
          </div>

          {/* Main prompt */}
          <div className="flex flex-col gap-2 px-3 py-1">
            <p className="text-xs text-secondary">{getPromptText()}</p>
            {getFeedbackText() && (
              <p
                className={`text-xs ${
                  state.showSolution
                    ? 'text-green-400'
                    : lastMoveResult === 'incorrect'
                      ? 'text-orange-400/80'
                      : 'text-primary'
                }`}
              >
                {getFeedbackText()}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex w-full gap-2 p-3">
          {!state.showSolution && lastMoveResult !== 'correct' ? (
            <>
              <button
                onClick={onShowSolution}
                className="flex items-center gap-1.5 rounded bg-human-4/80 px-3 py-1.5 text-sm text-primary/70 transition duration-200 hover:bg-human-4 hover:text-primary"
              >
                <span className="material-symbols-outlined !text-sm">
                  lightbulb
                </span>
                See solution
              </button>
              {!isLastMistake && (
                <button
                  onClick={onNext}
                  className="flex items-center gap-1.5 rounded bg-background-2 px-3 py-1.5 text-sm text-secondary transition duration-200 hover:bg-background-3 hover:text-primary"
                >
                  <span className="material-symbols-outlined !text-sm">
                    skip_next
                  </span>
                  Skip
                </button>
              )}
            </>
          ) : (
            <button
              onClick={onNext}
              className="flex items-center gap-1.5 rounded bg-human-4/60 px-3 py-1.5 text-sm text-primary/70 transition duration-200 hover:bg-human-4/80 hover:text-primary"
            >
              <span className="material-symbols-outlined !text-base">
                {isLastMistake ? 'check' : 'arrow_forward'}
              </span>
              {isLastMistake ? 'Finish' : 'Next mistake'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
