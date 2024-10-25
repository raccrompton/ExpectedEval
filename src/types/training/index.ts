import { Game, Move, MoveMap } from '..'

export interface AvailableMoves {
  [fromTo: string]: Move
}

export interface TrainingGame extends Game {
  stockfishEvaluation: MoveMap
  maiaEvaluation: MoveMap
  availableMoves: AvailableMoves
  targetIndex: number
  result?: boolean
}

export type Status =
  | 'default'
  | 'loading'
  | 'forfeit'
  | 'correct'
  | 'incorrect'
  | 'archived'
