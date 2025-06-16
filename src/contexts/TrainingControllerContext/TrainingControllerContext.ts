import { createContext } from 'react'
import { Chess } from 'chess.ts'
import type { Key } from 'chessground/types'
import { GameTree, GameNode } from 'src/types'
import { BaseTreeControllerContext } from '../BaseTreeControllerContext'

export interface ITrainingControllerContext extends BaseTreeControllerContext {
  currentNode: GameNode
  setCurrentIndex: (indexOrUpdater: number | ((prev: number) => number)) => void

  moves?: Map<string, string[]>
  currentMove: [string, string] | null
  setCurrentMove: (move: [string, string] | null) => void
  currentSquare: Key | null
  setCurrentSquare: (square: Key | null) => void
  moveEvaluation: { maia: number; stockfish: number } | null
  data: any[]
  move?: any
  parseMove: (move: string[]) => any
}

const defaultContext: ITrainingControllerContext = {
  gameTree: new GameTree(new Chess().fen()),
  currentNode: new GameTree(new Chess().fen()).getRoot(),
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

export const TrainingControllerContext =
  createContext<ITrainingControllerContext>(defaultContext)
