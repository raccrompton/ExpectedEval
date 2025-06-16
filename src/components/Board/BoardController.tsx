import { useWindowSize } from 'src/hooks'
import { FlipIcon } from 'src/components/Icons/icons'
import { useCallback, useEffect, useMemo } from 'react'

interface Props {
  // Controller data
  orientation: 'white' | 'black'
  setOrientation: (orientation: 'white' | 'black') => void
  currentNode?: any
  currentIndex?: number
  plyCount: number
  goToNode?: (node: any) => void
  goToNextNode: () => void
  goToPreviousNode: () => void
  goToRootNode: () => void
  setCurrentIndex?: (index: number) => void
  gameTree?: any

  // Optional event handler
  setCurrentMove?: (move: [string, string] | null) => void
}

export const BoardController: React.FC<Props> = ({
  orientation,
  setOrientation,
  currentNode,
  currentIndex,
  plyCount,
  goToNode,
  goToNextNode,
  goToPreviousNode,
  goToRootNode,
  setCurrentIndex,
  gameTree,
  setCurrentMove,
}: Props) => {
  const { width } = useWindowSize()

  const toggleBoardOrientation = useCallback(() => {
    setOrientation(orientation === 'white' ? 'black' : 'white')
  }, [orientation, setOrientation])

  // Determine navigation state based on available data
  const hasPrevious = useMemo(() => {
    if (currentNode !== undefined) {
      return !!currentNode?.parent
    }
    if (currentIndex !== undefined) {
      return currentIndex > 0
    }
    return false
  }, [currentNode, currentIndex])

  const hasNext = useMemo(() => {
    if (currentNode !== undefined) {
      return !!currentNode?.mainChild
    }
    if (currentIndex !== undefined) {
      return currentIndex < plyCount - 1
    }
    return false
  }, [currentNode, currentIndex, plyCount])

  const getFirst = useCallback(() => {
    goToRootNode()
    setCurrentMove?.(null)
  }, [goToRootNode, setCurrentMove])

  const getPrevious = useCallback(() => {
    goToPreviousNode()
    setCurrentMove?.(null)
  }, [goToPreviousNode, setCurrentMove])

  const getNext = useCallback(() => {
    goToNextNode()
    setCurrentMove?.(null)
  }, [goToNextNode, setCurrentMove])

  const getLast = useCallback(() => {
    if (currentNode && goToNode) {
      // Node-based navigation (Analysis, Play, Training)
      let lastNode = currentNode
      while (lastNode?.mainChild) {
        lastNode = lastNode.mainChild
      }
      if (lastNode) {
        goToNode(lastNode)
      }
    } else if (gameTree && setCurrentIndex) {
      // Index-based navigation (Turing)
      const mainLine = gameTree.getMainLine()
      if (mainLine.length > 0) {
        setCurrentIndex(mainLine.length - 1)
      }
    }
    setCurrentMove?.(null)
  }, [currentNode, goToNode, gameTree, setCurrentIndex, setCurrentMove])

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
    width,
    hasPrevious,
    hasNext,
    getPrevious,
    getNext,
    getFirst,
    getLast,
    toggleBoardOrientation,
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
