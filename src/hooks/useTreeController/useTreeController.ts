import { Color, GameTree, GameNode } from 'src/types'
import { useState, useMemo, useCallback, useEffect } from 'react'

export const useTreeController = (
  gameTree: GameTree,
  initialOrientation: Color = 'white',
) => {
  const [tree, setTree] = useState(gameTree)
  const [currentNode, setCurrentNode] = useState<GameNode>(tree.getRoot())
  const [orientation, setOrientation] = useState<Color>(initialOrientation)

  useEffect(() => {
    if (tree !== gameTree) {
      setTree(gameTree)
      setCurrentNode(gameTree.getRoot())
    }
  }, [gameTree])

  const plyCount = useMemo(() => {
    if (!tree) return 0
    return tree.getMainLine().length
  }, [tree])

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
    if (tree) {
      setCurrentNode(tree.getRoot())
    }
  }, [tree, setCurrentNode])

  useEffect(() => {
    setOrientation(initialOrientation)
  }, [initialOrientation])

  return {
    tree,
    currentNode,
    setCurrentNode,
    orientation,
    setOrientation,
    goToNode,
    goToNextNode,
    goToPreviousNode,
    goToRootNode,
    plyCount,
  }
}
