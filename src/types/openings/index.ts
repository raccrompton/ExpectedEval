import { GameTree, GameNode } from '../base'

export interface Opening {
  id: string
  name: string
  description: string
  fen: string
  pgn: string
  variations: OpeningVariation[]
}

export interface OpeningVariation {
  id: string
  name: string
  fen: string
  pgn: string
}

export interface OpeningSelection {
  opening: Opening
  variation: OpeningVariation | null
  playerColor: 'white' | 'black'
  maiaVersion: string
  id: string // unique identifier for the selection
}

export interface OpeningDrillState {
  selections: OpeningSelection[]
  currentSelectionIndex: number
  analysisEnabled: boolean
}

export interface OpeningDrillGame {
  id: string
  selection: OpeningSelection
  moves: string[] // UCI moves
  tree: GameTree
  currentFen: string
  toPlay: 'white' | 'black'
  openingEndNode?: GameNode | null // Store where the opening ends
}
