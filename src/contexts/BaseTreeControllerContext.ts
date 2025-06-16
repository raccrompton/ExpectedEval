import { GameTree, GameNode } from 'src/types'

export interface BaseTreeControllerContext {
  gameTree: GameTree
  currentNode?: GameNode
  goToNode: (node: GameNode) => void
  goToNextNode: () => void
  goToPreviousNode: () => void
  goToRootNode: () => void
  currentIndex: number
  setCurrentIndex: (index: number) => void
  plyCount: number
  orientation: 'white' | 'black'
  setOrientation: (orientation: 'white' | 'black') => void
}
