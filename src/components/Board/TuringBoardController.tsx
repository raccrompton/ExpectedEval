import { useCallback, useContext, useEffect, useMemo } from 'react'

import { useWindowSize } from 'src/hooks'
import { TuringTreeControllerContext } from 'src/contexts/'
import { FlipIcon } from 'src/components/Icons/icons'

interface Props {
  setCurrentMove?: (move: [string, string] | null) => void
}

export const TuringBoardController: React.FC<Props> = ({
  setCurrentMove,
}: Props) => {
  const { width } = useWindowSize()
  const {
    orientation,
    setOrientation,
    setCurrentIndex,
    currentIndex,
    plyCount,
    goToRootNode,
    goToPreviousNode,
    goToNextNode,
    gameTree,
  } = useContext(TuringTreeControllerContext)

  const toggleBoardOrientation = useCallback(() => {
    setOrientation(orientation === 'white' ? 'black' : 'white')
  }, [orientation, setOrientation])

  const hasPrevious = useMemo(() => currentIndex > 0, [currentIndex])

  const hasNext = useMemo(
    () => currentIndex < plyCount - 1,
    [currentIndex, plyCount],
  )

  const getFirst = useCallback(() => {
    goToRootNode()
    if (setCurrentMove) setCurrentMove(null)
  }, [goToRootNode, setCurrentMove])

  const getPrevious = useCallback(() => {
    goToPreviousNode()
    if (setCurrentMove) setCurrentMove(null)
  }, [goToPreviousNode, setCurrentMove])

  const getNext = useCallback(() => {
    goToNextNode()
    if (setCurrentMove) setCurrentMove(null)
  }, [goToNextNode, setCurrentMove])

  const getLast = useCallback(() => {
    const mainLine = gameTree.getMainLine()
    if (mainLine.length > 0) {
      setCurrentIndex(mainLine.length - 1)
    }
    if (setCurrentMove) setCurrentMove(null)
  }, [gameTree, setCurrentIndex, setCurrentMove])

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
