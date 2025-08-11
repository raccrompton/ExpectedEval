import { GameTree } from './tree'

export * from './tree'

export interface BaseGame {
  id: string
  tree: GameTree
}

export interface RawMove {
  board: string
  lastMove?: [string, string]
  movePlayed?: [string, string]
  check?: false | 'white' | 'black'
  san?: string
  uci?: string
}

export type Check = false | 'white' | 'black'

export type Color = 'white' | 'black'
