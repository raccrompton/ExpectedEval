import { useCallback, useContext, useEffect, useMemo } from 'react'

import { useWindowSize } from 'src/hooks'
import { FlipIcon } from 'src/components/Icons/icons'
import { AnalysisGameControllerContext } from 'src/contexts/'

export const AnalysisBoardController: React.FC = () => {
  const { width } = useWindowSize()
  const {
    orientation,
    setOrientation,
    currentNode,
    goToNode,
    goToNextNode,
    goToPreviousNode,
    goToRootNode,
    plyCount,
  } = useContext(AnalysisGameControllerContext)

  const toggleBoardOrientation = useCallback(() => {
    setOrientation(orientation === 'white' ? 'black' : 'white')
  }, [orientation, setOrientation])

  const hasPrevious = useMemo(() => !!currentNode?.parent, [currentNode])

  const hasNext = useMemo(() => !!currentNode?.mainChild, [currentNode])

  const getFirst = useCallback(() => {
    goToRootNode()
  }, [goToRootNode])

  const getPrevious = useCallback(() => {
    goToPreviousNode()
  }, [goToPreviousNode])

  const getNext = useCallback(() => {
    goToNextNode()
  }, [goToNextNode])

  const getLast = useCallback(() => {
    let lastNode = currentNode
    while (lastNode?.mainChild) {
      lastNode = lastNode.mainChild
    }
    if (lastNode) {
      goToNode(lastNode)
    }
  }, [goToNode, currentNode])

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
  ])

  return (
    <div className="flex w-full flex-row items-center gap-[1px] md:rounded">
      <button
        onClick={toggleBoardOrientation}
        className="flex h-7 flex-1 items-center justify-center bg-button-secondary transition duration-200 hover:bg-human-3 disabled:bg-button-secondary/40 md:rounded-sm"
      >
        {FlipIcon}
      </button>
      <button
        onClick={getFirst}
        disabled={!hasPrevious}
        className="flex h-7 flex-1 items-center justify-center bg-button-secondary transition duration-200 hover:bg-human-3 disabled:bg-button-secondary/40 md:rounded-sm"
      >
        &#8249;&#8249;&#8249;
      </button>
      <button
        onClick={getPrevious}
        disabled={!hasPrevious}
        className="flex h-7 flex-1 items-center justify-center bg-button-secondary transition duration-200 hover:bg-human-3 disabled:bg-button-secondary/40 md:rounded-sm"
      >
        &#8249;
      </button>
      <button
        onClick={getNext}
        disabled={!hasNext}
        className="flex h-7 flex-1 items-center justify-center bg-button-secondary transition duration-200 hover:bg-human-3 disabled:bg-button-secondary/40 md:rounded-sm"
      >
        &#8250;
      </button>
      <button
        onClick={getLast}
        disabled={!hasNext}
        className="flex h-7 flex-1 items-center justify-center bg-button-secondary transition duration-200 hover:bg-human-3 disabled:bg-button-secondary/40 md:rounded-sm"
      >
        &#8250;&#8250;&#8250;
      </button>
    </div>
  )
}
