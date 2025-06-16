import { useCallback, useContext, useEffect, useMemo } from 'react'

import { useWindowSize } from 'src/hooks'
import { TreeControllerContext } from 'src/contexts/'
import { FlipIcon } from 'src/components/Icons/icons'

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
  } = useContext(TreeControllerContext)
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
    <div className="flex w-full flex-row items-center gap-[1px] rounded">
      <button
        onClick={toggleBoardOrientation}
        className="flex h-7 flex-1 items-center justify-center rounded-sm bg-button-secondary transition duration-200 hover:bg-human-3 disabled:bg-button-secondary/40"
      >
        {FlipIcon}
      </button>
      <button
        onClick={getFirst}
        disabled={!hasPrevious}
        className="flex h-7 flex-1 items-center justify-center rounded-sm bg-button-secondary transition duration-200 hover:bg-human-3 disabled:bg-button-secondary/40"
      >
        &#8249;&#8249;&#8249;
      </button>
      <button
        onClick={getPrevious}
        disabled={!hasPrevious}
        className="flex h-7 flex-1 items-center justify-center rounded-sm bg-button-secondary transition duration-200 hover:bg-human-3 disabled:bg-button-secondary/40"
      >
        &#8249;
      </button>
      <button
        onClick={getNext}
        disabled={!hasNext}
        className="flex h-7 flex-1 items-center justify-center rounded-sm bg-button-secondary transition duration-200 hover:bg-human-3 disabled:bg-button-secondary/40"
      >
        &#8250;
      </button>
      <button
        onClick={getLast}
        disabled={!hasNext}
        className="flex h-7 flex-1 items-center justify-center rounded-sm bg-button-secondary transition duration-200 hover:bg-human-3 disabled:bg-button-secondary/40"
      >
        &#8250;&#8250;&#8250;
      </button>
    </div>
  )
}
