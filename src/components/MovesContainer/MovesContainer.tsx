/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import classNames from 'classnames'
import { Tooltip } from 'react-tooltip'
import { useCallback, useContext, useMemo } from 'react'

import { CheckIcon } from '../Icons/icons'
import styles from './MovesContainer.module.scss'
import { AnalyzedGame, BaseGame, Move, Termination } from 'src/types'
import { GameControllerContext, WindowSizeContext } from 'src/contexts'

interface Props {
  game: BaseGame | AnalyzedGame
  setCurrentMove?: (move: [string, string] | null) => void
  highlightIndices?: number[]
  mobile?: boolean
  control?: boolean
  termination?: Termination
}

export const MovesContainer: React.FC<Props> = ({
  game,
  setCurrentMove,
  highlightIndices,
  mobile = false,
  control = false,
  termination,
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

  // const scroll = useCallback(
  //   (ref: HTMLDivElement) => {
  //     if (!ref) return
  //     const selected =
  //       parseInt(ref.dataset.index ?? '', 10) == controller.currentIndex
  //     if (selected && ref != null) {
  //       ref.scrollIntoView({
  //         behavior: 'smooth',
  //         block: 'start',
  //         inline: 'center',
  //       })
  //     }
  //   },
  //   [controller.currentIndex],
  // )

  const container = (
    <div className={classNames(styles.container, { [styles.mobile]: mobile })}>
      <Tooltip id="check" />
      {moves.map(([white, black], index) => {
        const prevMoveIndex = index * 2
        const whiteMoveIndex = prevMoveIndex + 1
        let predictedWhite, predictedBlack

        if ('maiaEvaluations' in game) {
          const evals = game.maiaEvaluations['maia_kdd_1100']

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
          <div key={index} className={styles.move}>
            <span>{index + 1}</span>
            <div
              onClick={() => {
                if (setCurrentMove) setCurrentMove(null)
                controller.setCurrentIndex(index * 2 + 1)
              }}
              data-index={index * 2 + 1}
              className={classNames([
                {
                  'flex flex-row items-center justify-between': true,
                  [styles.selected]: controller.currentIndex === index * 2 + 1,
                  [styles.highlighted]: highlightSet.has(index * 2 + 1),
                },
              ])}
              // ref={scroll}
            >
              {white?.san ?? white?.lastMove?.join(' ')}
              {predictedWhite && (
                <i
                  data-tooltip-id="check"
                  data-tooltip-content="Maia predicted this move"
                  className={styles.checked}
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
              className={classNames([
                {
                  'flex flex-row items-center justify-between': true,
                  [styles.selected]: controller.currentIndex === index * 2 + 2,
                  [styles.highlighted]: highlightSet.has(index * 2 + 2),
                },
              ])}
              // ref={scroll}
            >
              {black?.san ?? black?.lastMove?.join(' ')}
              {predictedBlack && (
                <i
                  data-tooltip-id="check"
                  data-tooltip-content="Maia predicted this move"
                  className={styles.checked}
                >
                  {CheckIcon}
                </i>
              )}
            </div>
          </div>
        )
      })}
      {termination && !control && !isMobile && (
        <div
          className={styles.termination}
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

  if (control)
    return (
      <div className={styles.control}>
        <button onClick={getPrevious} disabled={!hasPrevious}>
          &#8249;
        </button>
        {container}
        <button onClick={getNext} disabled={!hasNext}>
          &#8250;
        </button>
      </div>
    )

  return container
}
