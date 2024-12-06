/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { Tooltip } from 'react-tooltip'
import { useCallback, useContext, useMemo } from 'react'

import { CheckIcon } from '../Icons/icons'
import { AnalyzedGame, BaseGame, Move, Termination } from 'src/types'
import { GameControllerContext, WindowSizeContext } from 'src/contexts'

interface Props {
  game: BaseGame | AnalyzedGame
  setCurrentMove?: (move: [string, string] | null) => void
  highlightIndices?: number[]
  mobile?: boolean
  termination?: Termination
  currentMaiaModel?: string
}

export const MovesContainer: React.FC<Props> = ({
  game,
  setCurrentMove,
  highlightIndices,
  mobile = false,
  termination,
  currentMaiaModel,
}: Props) => {
  const controller = useContext(GameControllerContext)
  const { isMobile } = useContext(WindowSizeContext)
  const { setCurrentIndex, currentIndex, plyCount } = controller

  const hasPrevious = useMemo(() => currentIndex > 0, [currentIndex])

  const hasNext = useMemo(
    () => currentIndex < plyCount - 1,
    [currentIndex, plyCount],
  )

  const getPrevious = useCallback(() => {
    setCurrentIndex(currentIndex - 1)
    if (setCurrentMove) setCurrentMove(null)
  }, [setCurrentIndex, currentIndex, setCurrentMove])

  const getNext = useCallback(() => {
    setCurrentIndex(currentIndex + 1)
    if (setCurrentMove) setCurrentMove(null)
  }, [setCurrentIndex, currentIndex, setCurrentMove])

  const moves = useMemo(
    () =>
      game.moves.slice(1).reduce((rows: Move[][], move, index) => {
        index % 2 === 0 ? rows.push([move]) : rows[rows.length - 1].push(move)
        return rows
      }, []),
    [game.moves],
  )

  const highlightSet = useMemo(
    () => new Set(highlightIndices ?? []),
    [highlightIndices],
  )

  const container = (
    <div className="red-scrollbar flex h-64 flex-col overflow-y-auto overflow-x-hidden whitespace-nowrap rounded-sm bg-background-1/60 md:h-full">
      <Tooltip id="check" />
      {moves.map(([white, black], index) => {
        const prevMoveIndex = index * 2
        const whiteMoveIndex = prevMoveIndex + 1
        let predictedWhite, predictedBlack

        if ('maiaEvaluations' in game) {
          const evals =
            game.maiaEvaluations[currentMaiaModel ?? 'maia_kdd_1100']

          const prevEvals = evals?.[prevMoveIndex]
          const whiteEvals = evals?.[whiteMoveIndex]

          const whitePrediction = prevEvals
            ? Object.keys(prevEvals).reduce((a, b) =>
                prevEvals[a] > prevEvals[b] ? a : b,
              )
            : null
          const blackPrediction = whiteEvals
            ? Object.keys(whiteEvals).reduce((a, b) =>
                whiteEvals[a] > whiteEvals[b] ? a : b,
              )
            : null

          predictedWhite = whitePrediction === white?.lastMove?.join('')
          predictedBlack = blackPrediction === black?.lastMove?.join('')
        }

        return (
          <div key={index} className="flex w-full flex-row">
            <span className="flex w-1/6 items-center justify-center bg-background-2 py-1 text-sm text-secondary">
              {index + 1}
            </span>
            <div
              onClick={() => {
                if (setCurrentMove) setCurrentMove(null)
                controller.setCurrentIndex(index * 2 + 1)
              }}
              data-index={index * 2 + 1}
              className={`flex flex-1 cursor-pointer flex-row items-center justify-between px-2 hover:bg-background-2 ${controller.currentIndex === index * 2 + 1 && 'bg-engine-3/90'} ${highlightSet.has(index * 2 + 1) && 'bg-human-3/80'}`}
            >
              {white?.san ?? white?.lastMove?.join(' ')}
              {predictedWhite && (
                <i
                  data-tooltip-id="check"
                  data-tooltip-content="Maia predicted this move"
                  className="*:h-4 *:w-4 *:fill-human-2"
                >
                  {CheckIcon}
                </i>
              )}
            </div>
            <div
              onClick={() => {
                if (setCurrentMove) setCurrentMove(null)
                if (black) controller.setCurrentIndex(index * 2 + 2)
              }}
              data-index={index * 2 + 2}
              className={`flex flex-1 cursor-pointer flex-row items-center justify-between px-2 hover:bg-background-2 ${controller.currentIndex === index * 2 + 2 && 'bg-engine-3/90'} ${highlightSet.has(index * 2 + 2) && 'bg-human-3/80'}`}
            >
              {black?.san ?? black?.lastMove?.join(' ')}
              {predictedBlack && (
                <i
                  data-tooltip-id="check"
                  data-tooltip-content="Maia predicted this move"
                  className="*:h-4 *:w-4 *:fill-human-2"
                >
                  {CheckIcon}
                </i>
              )}
            </div>
          </div>
        )
      })}
      {termination && !isMobile && (
        <div
          className="cursor-pointer rounded-sm border border-primary/10 bg-background-1/90 p-5 text-center opacity-90"
          onClick={() => setCurrentIndex(plyCount - 1)}
        >
          {termination.result}
          {', '}
          {termination.winner !== 'none'
            ? `${termination.winner} is victorious`
            : 'draw'}
        </div>
      )}
    </div>
  )

  return container
}
