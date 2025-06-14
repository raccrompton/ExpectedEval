import { createContext } from 'react'
import { Chess } from 'chess.ts'
import { GameTree, GameNode, Color } from 'src/types'
import { TuringGame } from 'src/types/turing'
import { AllStats } from 'src/hooks/useStats'

export interface TuringTreeControllerContextType {
  // Game data
  game?: TuringGame
  games: { [id: string]: TuringGame }
  loading: boolean
  gameIds: string[]
  stats: AllStats

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

  // Actions
  getNewGame: () => Promise<void>
  setCurrentId: (id: string | null) => void
  submitGuess: (
    guess: Color,
    comment?: string,
    rating?: number,
  ) => Promise<void>
  commentController: [string, (comment: string) => void]

  // Legacy compatibility
  controller: {
    plyCount: number
    currentIndex: number
    setCurrentIndex: (index: number) => void
    orientation: 'white' | 'black'
    setOrientation: (orientation: 'white' | 'black') => void
  }
}

const defaultContext: TuringTreeControllerContextType = {
  game: undefined,
  games: {},
  loading: false,
  gameIds: [],
  stats: {
    lifetime: undefined,
    session: { gamesWon: 0, gamesPlayed: 0 },
    lastRating: undefined,
    rating: 0,
  },
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
  getNewGame: async () => {
    /* no-op */
  },
  setCurrentId: () => {
    /* no-op */
  },
  submitGuess: async () => {
    /* no-op */
  },
  commentController: [
    '',
    () => {
      /* no-op */
    },
  ],
  controller: {
    plyCount: 0,
    currentIndex: 0,
    setCurrentIndex: () => {
      /* no-op */
    },
    orientation: 'white',
    setOrientation: () => {
      /* no-op */
    },
  },
}

export const TuringTreeControllerContext =
  createContext<TuringTreeControllerContextType>(defaultContext)
