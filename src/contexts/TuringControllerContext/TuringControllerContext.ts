import React from 'react'

import { useTuringController } from 'src/hooks'

type ITuringControllerContext = ReturnType<typeof useTuringController>

const fn = () => {
  throw new Error('poorly provided TuringControllerContext')
}

export const TuringControllerContext =
  React.createContext<ITuringControllerContext>({
    game: undefined,
    stats: {
      lifetimeStats: undefined,
      sessionStats: { gamesWon: 0, gamesPlayed: 0 },
      lastRating: 0,
      rating: 0,
    },
    getNewGame: fn,
    loading: false,
    gameIds: [],
    setCurrentId: fn,
    submitGuess: fn,
    games: {},
    commentController: ['', fn],
  })
