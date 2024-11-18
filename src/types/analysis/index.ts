import { Game } from '../base'
import { AvailableMoves } from '../training'

type EvaluationType = 'tournament' | 'pgn'

type StockfishEvaluations<T extends EvaluationType> = T extends 'tournament'
  ? MoveMap[]
  : (StockfishEvaluation | undefined)[]

export interface AnalysisTournamentGame {
  game_index: number
  event: string
  site: string
  date: string
  round: number
  white: string
  black: string
  result?: string
}

export interface AnalysisLichessGame {
  id: string
  white: string
  black: string
  pgn: string
  result?: string
}

export interface AnalyzedGame extends Game {
  maiaEvaluations: { [model: string]: MoveMap[] }
  stockfishEvaluations: StockfishEvaluations<EvaluationType>
  positionEvaluations: { [model: string]: PositionEvaluation[] }
  availableMoves: AvailableMoves[]
  type: EvaluationType
  pgn?: string
}

export interface Termination {
  result: string
  winner: 'white' | 'black' | 'none' | undefined
  type?: 'rules' | 'resign' | 'time' | undefined
  condition?: string
}

export interface MoveMap {
  [move: string]: number
}

export interface PositionEvaluation {
  trickiness: number
  performance: number
}

export interface StockfishEvaluation {
  sent: boolean
  depth: number
  model_move: string
  model_optimal_cp: number
  cp_vec: { [key: string]: number }
  cp_relative_vec: { [key: string]: number }
}
