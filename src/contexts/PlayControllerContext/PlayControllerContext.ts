import React from 'react'
import { usePlayController } from 'src/hooks'

type IPlayControllerContext = ReturnType<typeof usePlayController>

const fn = () => {
  throw new Error('poorly provided PlayControllerContext')
}

export const PlayControllerContext =
  React.createContext<IPlayControllerContext>({
    game: { id: '', moves: [], turn: 'black' },
    playType: 'againstMaia',
    timeControl: 'unlimited',
    player: 'white',
    maiaVersion: 'maia_kdd_1100',
    playerActive: false,
    toPlay: 'black',
    moves: [],
    moveTimes: [],
    availableMoves: [],
    pieces: {},
    whiteClock: 0,
    blackClock: 0,
    lastMoveTime: 0,
    stats: {
      lifetimeStats: undefined,
      sessionStats: { gamesWon: 0, gamesPlayed: 0 },
      lastRating: undefined,
      rating: 0,
    },
    setMoves: fn,
    setMoveTimes: fn,
    setResigned: fn,
    reset: fn,
    makeMove: fn,
    setCurrentSquare: fn,
    updateClock: fn,
  })
