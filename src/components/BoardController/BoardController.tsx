import { useCallback, useContext, useEffect, useMemo } from 'react'
import { GameControllerContext } from 'src/contexts/'
import { useWindowSize } from 'src/hooks'
import { FlipIcon } from 'src/components/Icons/icons'

import styles from './BoardController.module.scss'

interface Props {
  setCurrentMove?: (move: [string, string] | null) => void
}

export const BoardController: React.FC<Props> = ({ setCurrentMove }: Props) => {
  const { width } = useWindowSize()
  const {
    orientation,
    setOrientation,
    setCurrentIndex,
    currentIndex,
    plyCount,
  } = useContext(GameControllerContext)
  const toggleBoardOrientation = useCallback(() => {
    setOrientation(orientation === 'white' ? 'black' : 'white')
  }, [orientation, setOrientation])

  const hasPrevious = useMemo(() => currentIndex > 0, [currentIndex])

  const hasNext = useMemo(
    () => currentIndex < plyCount - 1,
    [currentIndex, plyCount],
  )

  const getFirst = useCallback(() => {
    setCurrentIndex(0)
    if (setCurrentMove) setCurrentMove(null)
  }, [setCurrentIndex, setCurrentMove])

  const getPrevious = useCallback(() => {
    setCurrentIndex(currentIndex - 1)
    if (setCurrentMove) setCurrentMove(null)
  }, [setCurrentIndex, currentIndex, setCurrentMove])

  const getNext = useCallback(() => {
    setCurrentIndex(currentIndex + 1)
    if (setCurrentMove) setCurrentMove(null)
  }, [setCurrentIndex, currentIndex, setCurrentMove])

  const getLast = useCallback(() => {
    setCurrentIndex(plyCount - 1)

    if (setCurrentMove) setCurrentMove(null)
  }, [setCurrentIndex, plyCount, setCurrentMove])

  useEffect(() => {
    if (width <= 670) return
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Left':
        case 'ArrowLeft':
          if (hasPrevious) getPrevious()
          break
        case 'Right':
        case 'ArrowRight':
          if (hasNext) getNext()
          break
        case 'Down':
        case 'ArrowDown':
          if (hasNext) getLast()
          break
        case 'Up':
        case 'ArrowUp':
          if (hasPrevious) getFirst()
          break
        case 'f':
          toggleBoardOrientation()
          break
        default:
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    getFirst,
    getLast,
    getNext,
    getPrevious,
    hasNext,
    hasPrevious,
    toggleBoardOrientation,
    width,
    currentIndex,
  ])

  return (
    <div className={styles.container}>
      <button onClick={toggleBoardOrientation}>{FlipIcon}</button>
      <button onClick={getFirst} disabled={!hasPrevious}>
        &#8249;&#8249;&#8249;
      </button>
      <button onClick={getPrevious} disabled={!hasPrevious}>
        &#8249;
      </button>
      <button onClick={getNext} disabled={!hasNext}>
        &#8250;
      </button>
      <button onClick={getLast} disabled={!hasNext}>
        &#8250;&#8250;&#8250;
      </button>
    </div>
  )
}
