import { Chess } from 'chess.ts'
import {
  useMemo,
  useState,
  Dispatch,
  useEffect,
  SetStateAction,
  useCallback,
} from 'react'

import { Markdown } from 'src/components'
import styles from './Feedback.module.scss'
import { useTrainingController } from 'src/hooks'
import { TrainingGame, Status } from 'src/types/training'

interface Props {
  latestGuess: string | null
  trainingController: ReturnType<typeof useTrainingController>
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
  ## PUZZLE COMPLETED
  You already solved this puzzle. Use the boxes on the left to navigate to another puzzle.
`

  const defaultContent = `
  ## YOUR TURN
  Find the best move for **${turn}**!
  `
  const incorrectContent = `
  ## ${latestGuess} is incorrect
  Try again or give up to see the best move.
  `

  const correctContent = `
  ## Correct! ${latestGuess} is the best move.
  You can now explore the position.
  `

  const gaveUpContent = `
  ## Explore the position
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
    <div className={styles.container}>
      <div>
        <Markdown>{content.trim()}</Markdown>
      </div>
      <div className={styles.buttons}>
        {status !== 'archived' && (
          <>
            {status === 'incorrect' && currentMove && (
              <button
                onClick={() => {
                  setStatus('default')
                  setCurrentMove(null)
                }}
              >
                Try Again
              </button>
            )}
            {status !== 'correct' && status !== 'incorrect' && (
              <button
                onClick={moveToTarget}
                disabled={status == 'loading' || !currentMove}
              >
                Reset
              </button>
            )}
            {status !== 'forfeit' && status !== 'correct' && (
              <button className={styles.secondary} onClick={setAndGiveUp}>
                Give Up
              </button>
            )}
            {(status === 'forfeit' || status === 'correct') && (
              <button
                onClick={async () => {
                  setCurrentMove(null)

                  await getNewGame()
                }}
                className={styles.secondary}
              >
                Next Puzzle
              </button>
            )}
          </>
        )}

        {/* <button
              onClick={() => {
                router.push(
                  {
                    pathname: '/analysis/[id]',
                    query: {
                      id: game.id,
                      index: game.targetIndex,
                      orientation:
                        game.targetIndex % 2 === 0 ? 'white' : 'black',
                    },
                  },
                  `/analysis/${game.id}`,
                )
              }}
              className={styles.secondary}
            >
              Analyze This Board
            </button> */}
      </div>
    </div>
  )
}
