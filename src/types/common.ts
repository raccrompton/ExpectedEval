import { Player } from '.'
import { GameTree } from './tree'
import { Termination } from './analysis'

export * from './tree'

export type Check = false | 'white' | 'black'

export interface RawMove {
  board: string
  lastMove?: [string, string]
  movePlayed?: [string, string]
  check?: false | 'white' | 'black'
  san?: string
  uci?: string
}

export interface BaseGame {
  id: string
  tree: GameTree
}

export interface Game extends BaseGame {
  gameType: string
  blackPlayer: Player
  whitePlayer: Player
  termination?: Termination
}

export type Color = 'white' | 'black'
