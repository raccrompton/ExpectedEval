import { Chess } from 'chess.ts'
import { createContext } from 'react'
import { GameTree, Color } from 'src/types'
import { TuringGame } from 'src/types/turing'
import { AllStats } from 'src/hooks/useStats'
import { BaseTreeControllerContext } from '../BaseTreeControllerContext'

export interface ITuringControllerContext extends BaseTreeControllerContext {
  game?: TuringGame
  games: { [id: string]: TuringGame }
  loading: boolean
  gameIds: string[]
  stats: AllStats

  getNewGame: () => Promise<void>
  setCurrentId: (id: string | null) => void
  submitGuess: (
    guess: Color,
    comment?: string,
    rating?: number,
  ) => Promise<void>
  commentController: [string, (comment: string) => void]

  controller: {
    plyCount: number
    currentIndex: number
    setCurrentIndex: (index: number) => void
    orientation: 'white' | 'black'
    setOrientation: (orientation: 'white' | 'black') => void
  }
}

const defaultContext: ITuringControllerContext = {
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

export const TuringControllerContext =
  createContext<ITuringControllerContext>(defaultContext)
