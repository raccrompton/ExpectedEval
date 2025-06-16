import React from 'react'
import { Chess } from 'chess.ts'
import { GameTree } from 'src/types'
import { usePlayTreeController } from 'src/hooks/usePlayTreeController'
import { BaseTreeControllerContext } from '../BaseTreeControllerContext'

export interface IPlayTreeControllerContext extends BaseTreeControllerContext {
  // All the specific play controller properties
  game: ReturnType<typeof usePlayTreeController>['game']
  playType: ReturnType<typeof usePlayTreeController>['playType']
  timeControl: ReturnType<typeof usePlayTreeController>['timeControl']
  player: ReturnType<typeof usePlayTreeController>['player']
  maiaVersion: ReturnType<typeof usePlayTreeController>['maiaVersion']
  playerActive: ReturnType<typeof usePlayTreeController>['playerActive']
  toPlay: ReturnType<typeof usePlayTreeController>['toPlay']
  moves: ReturnType<typeof usePlayTreeController>['moves']
  moveTimes: ReturnType<typeof usePlayTreeController>['moveTimes']
  availableMoves: ReturnType<typeof usePlayTreeController>['availableMoves']
  pieces: ReturnType<typeof usePlayTreeController>['pieces']
  moveList: ReturnType<typeof usePlayTreeController>['moveList']
  whiteClock: ReturnType<typeof usePlayTreeController>['whiteClock']
  blackClock: ReturnType<typeof usePlayTreeController>['blackClock']
  lastMoveTime: ReturnType<typeof usePlayTreeController>['lastMoveTime']
  stats: ReturnType<typeof usePlayTreeController>['stats']
  setMoves: ReturnType<typeof usePlayTreeController>['setMoves']
  setMoveTimes: ReturnType<typeof usePlayTreeController>['setMoveTimes']
  setResigned: ReturnType<typeof usePlayTreeController>['setResigned']
  reset: ReturnType<typeof usePlayTreeController>['reset']
  makeMove: ReturnType<typeof usePlayTreeController>['makeMove']
  updateClock: ReturnType<typeof usePlayTreeController>['updateClock']
  setCurrentNode: ReturnType<typeof usePlayTreeController>['setCurrentNode']
  addMove: ReturnType<typeof usePlayTreeController>['addMove']
  addMoveWithTime: ReturnType<typeof usePlayTreeController>['addMoveWithTime']
}

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
    currentIndex: 0,
    setCurrentIndex: fn,
    addMove: fn,
    addMoveWithTime: fn,
  })
