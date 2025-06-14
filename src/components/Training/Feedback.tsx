import { Chess } from 'chess.ts'
import { useMemo, Dispatch, SetStateAction, useCallback } from 'react'

import { Markdown } from 'src/components'
import { useTrainingTreeController } from 'src/hooks'
import { TrainingGame, Status } from 'src/types/training'

interface Props {
  latestGuess: string | null
  trainingController: ReturnType<typeof useTrainingTreeController>
  game: TrainingGame
  setAndGiveUp: () => void
  status: string
  setStatus: Dispatch<SetStateAction<Status>>
  getNewGame: () => Promise<void>
}

export const Feedback: React.FC<Props> = ({
  game,
  status,
  setStatus,
  getNewGame,
  latestGuess,
  setAndGiveUp,
  trainingController,
}: Props) => {
  const { controller, move, currentMove, setCurrentMove, moveEvaluation } =
    trainingController
  const { currentIndex, setCurrentIndex } = controller
  const { targetIndex } = game

  const turn =
    new Chess(game.moves[targetIndex].board).turn() === 'w' ? 'white' : 'black'

  const archivedContent = `
  ##### PUZZLE COMPLETED
  You already solved this puzzle. Use the boxes on the left to navigate to another puzzle.
`

  const defaultContent = `
  ##### YOUR TURN
  Find the best move for **${turn}**!
  `
  const incorrectContent = `
  ##### ${latestGuess} is incorrect
  Try again or give up to see the best move.
  `

  const correctContent = `
  ##### Correct! ${latestGuess} is the best move.
  You can now explore the position.
  `

  const gaveUpContent = `
  ##### Explore the position
  Explore the current position by using the move map, or train on another position.`

  const content = useMemo(() => {
    if (status === 'archived') {
      return archivedContent
    } else if (status === 'forfeit') {
      return gaveUpContent
    } else if (status === 'correct') {
      return correctContent
    } else if (status === 'incorrect') {
      return incorrectContent
    } else {
      return defaultContent
    }
  }, [
    currentIndex,
    currentMove,
    defaultContent,
    move,
    incorrectContent,
    moveEvaluation,
    correctContent,
    status,
    targetIndex,
  ])

  const moveToTarget = useCallback(() => {
    setCurrentMove(null)
    setCurrentIndex(game.targetIndex)
  }, [game.targetIndex, setCurrentIndex])

  return (
    <div className="flex w-screen flex-1 flex-col justify-between gap-2 rounded-sm bg-background-1 p-3 md:w-auto md:gap-0 md:p-5">
      <div>
        <Markdown>{content.trim()}</Markdown>
      </div>
      <div className="flex flex-col gap-1.5">
        {status !== 'archived' && (
          <>
            {status === 'incorrect' && currentMove && (
              <button
                onClick={() => {
                  setStatus('default')
                  setCurrentMove(null)
                }}
                className="flex w-full justify-center rounded-sm bg-engine-3 py-1.5 text-sm font-medium text-primary transition duration-300 hover:bg-engine-4 disabled:bg-backdrop disabled:text-secondary"
              >
                Try Again
              </button>
            )}
            {status !== 'correct' && status !== 'incorrect' && (
              <button
                onClick={moveToTarget}
                disabled={status == 'loading' || !currentMove}
                className="flex w-full justify-center rounded-sm bg-engine-3 py-1.5 text-sm font-medium text-primary transition duration-300 hover:bg-engine-4 disabled:bg-backdrop disabled:text-secondary"
              >
                Reset
              </button>
            )}
            {status !== 'forfeit' && status !== 'correct' && (
              <button
                onClick={setAndGiveUp}
                className="flex w-full justify-center rounded-sm bg-human-3 py-1.5 text-sm font-medium text-primary transition duration-300 hover:bg-human-4 disabled:bg-backdrop disabled:text-secondary"
              >
                Give Up
              </button>
            )}
            {(status === 'forfeit' || status === 'correct') && (
              <button
                onClick={async () => {
                  setCurrentMove(null)
                  await getNewGame()
                }}
                className="flex w-full justify-center rounded-sm bg-human-3 py-1.5 text-sm font-medium text-primary transition duration-300 hover:bg-human-4 disabled:bg-backdrop disabled:text-secondary"
              >
                Next Puzzle
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
