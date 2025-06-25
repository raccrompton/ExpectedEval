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
  targetMoveNumber: number
  id: string
}

export interface DrillConfiguration {
  selections: OpeningSelection[]
  drillCount: number
  drillSequence: OpeningSelection[]
}

export interface OpeningDrillState {
  configuration: DrillConfiguration
  completedDrills: CompletedDrill[]
  currentDrill: OpeningSelection | null
  remainingDrills: OpeningSelection[]
  currentDrillIndex: number
  totalDrills: number
  analysisEnabled: boolean
}

export interface OpeningDrillGame {
  id: string
  selection: OpeningSelection
  moves: string[]
  tree: GameTree
  currentFen: string
  toPlay: 'white' | 'black'
  openingEndNode?: GameNode | null
  playerMoveCount: number
}

export interface CompletedDrill {
  selection: OpeningSelection
  finalNode: GameNode
  playerMoves: string[]
  totalMoves: number
  blunders: string[]
  goodMoves: string[]
  finalEvaluation: number
  completedAt: Date
}

export interface DrillPerformanceData {
  drill: CompletedDrill
  evaluationChart: Array<{ move: number; evaluation: number }>
  accuracy: number
  blunderCount: number
  goodMoveCount: number
  feedback: string[]
}

export interface OverallPerformanceData {
  totalDrills: number
  completedDrills: CompletedDrill[]
  overallAccuracy: number
  totalBlunders: number
  totalGoodMoves: number
  bestPerformance: CompletedDrill | null
  worstPerformance: CompletedDrill | null
  averageEvaluation: number
}
