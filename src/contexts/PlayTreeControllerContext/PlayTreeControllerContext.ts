import React from 'react'
import { Chess } from 'chess.ts'
import { GameTree } from 'src/types'
import { usePlayTreeController } from 'src/hooks/usePlayTreeController'

export type IPlayTreeControllerContext = ReturnType<
  typeof usePlayTreeController
>

const fn = () => {
  throw new Error('PlayTreeControllerContext not provided')
}

const defaultGameTree = new GameTree(new Chess().fen())

export const PlayTreeControllerContext =
  React.createContext<IPlayTreeControllerContext>({
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
    moveList: [],
    whiteClock: 0,
    blackClock: 0,
    lastMoveTime: 0,
    plyCount: 0,
    orientation: 'white',
    setOrientation: fn,
    stats: {
      lifetime: undefined,
      session: { gamesWon: 0, gamesPlayed: 0 },
      lastRating: undefined,
      rating: 0,
    },
    setMoves: fn,
    setMoveTimes: fn,
    setResigned: fn,
    reset: fn,
    makeMove: fn,
    updateClock: fn,
    gameTree: defaultGameTree,
    currentNode: defaultGameTree.getRoot(),
    setCurrentNode: fn,
    goToNode: fn,
    goToNextNode: fn,
    goToPreviousNode: fn,
    goToRootNode: fn,
    addMove: fn,
    addMoveWithTime: fn,
  })
