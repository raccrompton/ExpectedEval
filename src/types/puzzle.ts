import { Game, RawMove, MoveValueMapping, GameTree } from '.'

export interface AvailableMoves {
  [uci: string]: RawMove
}

export interface PuzzleGame extends Game {
  puzzle_elo: number
  stockfishEvaluation: MoveValueMapping
  maiaEvaluation: MoveValueMapping
  availableMoves: AvailableMoves
  targetIndex: number
  result?: boolean
  tree: GameTree
}

export type Status =
  | 'default'
  | 'loading'
  | 'forfeit'
  | 'correct'
  | 'incorrect'
  | 'archived'
