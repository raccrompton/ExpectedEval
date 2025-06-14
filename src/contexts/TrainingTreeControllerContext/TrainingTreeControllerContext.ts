import { createContext } from 'react'
import { Chess } from 'chess.ts'
import { GameTree, GameNode } from 'src/types'

export interface TrainingTreeControllerContextType {
  // Game tree navigation
  gameTree: GameTree
  currentNode?: GameNode
  goToNode: (node: GameNode) => void
  goToNextNode: () => void
  goToPreviousNode: () => void
  goToRootNode: () => void

  // Position and orientation
  currentIndex: number
  setCurrentIndex: (index: number) => void
  plyCount: number
  orientation: 'white' | 'black'
  setOrientation: (orientation: 'white' | 'black') => void

  // Training-specific
  moves?: Map<string, string[]>
  currentMove: [string, string] | null
  setCurrentMove: (move: [string, string] | null) => void
  currentSquare: string | null
  setCurrentSquare: (square: string | null) => void
  moveEvaluation: { maia: number; stockfish: number } | null
  data: any[]
  move?: any
  parseMove: (move: string[]) => any
}

const defaultContext: TrainingTreeControllerContextType = {
  gameTree: new GameTree(new Chess().fen()),
  currentNode: undefined,
  goToNode: () => {
    /* no-op */
  },
  goToNextNode: () => {
    /* no-op */
  },
  goToPreviousNode: () => {
    /* no-op */
  },
  goToRootNode: () => {
    /* no-op */
  },
  currentIndex: 0,
  setCurrentIndex: () => {
    /* no-op */
  },
  plyCount: 0,
  orientation: 'white',
  setOrientation: () => {
    /* no-op */
  },
  moves: undefined,
  currentMove: null,
  setCurrentMove: () => {
    /* no-op */
  },
  currentSquare: null,
  setCurrentSquare: () => {
    /* no-op */
  },
  moveEvaluation: null,
  data: [],
  move: undefined,
  parseMove: () => undefined,
}

export const TrainingTreeControllerContext =
  createContext<TrainingTreeControllerContextType>(defaultContext)
