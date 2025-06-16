import { Color, GameTree, GameNode } from 'src/types'
import { useState, useMemo, useCallback, Dispatch, SetStateAction } from 'react'

export const useTreeController = (
  gameTree: GameTree,
  initialNode?: GameNode,
  initialOrientation: Color = 'white',
) => {
  const [currentNode, setCurrentNode] = useState<GameNode | undefined>(
    initialNode ?? gameTree?.getRoot(),
  )
  const [orientation, setOrientation] = useState<Color>(initialOrientation)

  const plyCount = useMemo(() => {
    if (!gameTree) return 0
    return gameTree.getMainLine().length
  }, [gameTree])

  // Get current index in the main line for legacy compatibility
  const currentIndex = useMemo(() => {
    if (!currentNode || !gameTree) return 0
    const mainLine = gameTree.getMainLine()
    return mainLine.findIndex((node) => node === currentNode)
  }, [currentNode, gameTree])

  const setCurrentIndex = useCallback(
    (indexOrUpdater: SetStateAction<number>) => {
      if (!gameTree) return
      const mainLine = gameTree.getMainLine()
      const newIndex =
        typeof indexOrUpdater === 'function'
          ? indexOrUpdater(currentIndex)
          : indexOrUpdater
      if (newIndex >= 0 && newIndex < mainLine.length) {
        setCurrentNode(mainLine[newIndex])
      }
    },
    [gameTree, currentIndex],
  )

  const goToNode = useCallback(
    (node: GameNode) => {
      setCurrentNode(node)
    },
    [setCurrentNode],
  )

  const goToNextNode = useCallback(() => {
    if (currentNode?.mainChild) {
      setCurrentNode(currentNode.mainChild)
    }
  }, [currentNode, setCurrentNode])

  const goToPreviousNode = useCallback(() => {
    if (currentNode?.parent) {
      setCurrentNode(currentNode.parent)
    }
  }, [currentNode, setCurrentNode])

  const goToRootNode = useCallback(() => {
    if (gameTree) {
      setCurrentNode(gameTree.getRoot())
    }
  }, [gameTree, setCurrentNode])

  return {
    // Tree navigation
    currentNode,
    setCurrentNode,
    orientation,
    setOrientation,
    goToNode,
    goToNextNode,
    goToPreviousNode,
    goToRootNode,
    plyCount,

    // Legacy array-style interface for backward compatibility
    currentIndex,
    setCurrentIndex,
  }
}
