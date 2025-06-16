import React from 'react'
import { Chess } from 'chess.ts'
import { GameTree } from 'src/types'
import { usePlayMaiaController } from 'src/hooks/usePlayController'
import { BaseTreeControllerContext } from '../BaseTreeControllerContext'

export interface IPlayControllerContext extends BaseTreeControllerContext {
  game: ReturnType<typeof usePlayMaiaController>['game']
  playType: ReturnType<typeof usePlayMaiaController>['playType']
  timeControl: ReturnType<typeof usePlayMaiaController>['timeControl']
  player: ReturnType<typeof usePlayMaiaController>['player']
  maiaVersion: ReturnType<typeof usePlayMaiaController>['maiaVersion']
  playerActive: ReturnType<typeof usePlayMaiaController>['playerActive']
  toPlay: ReturnType<typeof usePlayMaiaController>['toPlay']
  moves: ReturnType<typeof usePlayMaiaController>['moves']
  moveTimes: ReturnType<typeof usePlayMaiaController>['moveTimes']
  availableMoves: ReturnType<typeof usePlayMaiaController>['availableMoves']
  pieces: ReturnType<typeof usePlayMaiaController>['pieces']
  moveList: ReturnType<typeof usePlayMaiaController>['moveList']
  whiteClock: ReturnType<typeof usePlayMaiaController>['whiteClock']
  blackClock: ReturnType<typeof usePlayMaiaController>['blackClock']
  lastMoveTime: ReturnType<typeof usePlayMaiaController>['lastMoveTime']
  stats: ReturnType<typeof usePlayMaiaController>['stats']
  setMoves: ReturnType<typeof usePlayMaiaController>['setMoves']
  setMoveTimes: ReturnType<typeof usePlayMaiaController>['setMoveTimes']
  setResigned: ReturnType<typeof usePlayMaiaController>['setResigned']
  reset: ReturnType<typeof usePlayMaiaController>['reset']
  makeMove: ReturnType<typeof usePlayMaiaController>['makeMove']
  updateClock: ReturnType<typeof usePlayMaiaController>['updateClock']
  setCurrentNode: ReturnType<typeof usePlayMaiaController>['setCurrentNode']
  addMove: ReturnType<typeof usePlayMaiaController>['addMove']
  addMoveWithTime: ReturnType<typeof usePlayMaiaController>['addMoveWithTime']
}

const fn = () => {
  throw new Error('PlayTreeControllerContext not provided')
}

const defaultGameTree = new GameTree(new Chess().fen())

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
    currentIndex: 0,
    setCurrentIndex: fn,
    addMove: fn,
    addMoveWithTime: fn,
  })
