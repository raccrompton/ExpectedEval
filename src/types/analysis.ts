import Maia from 'src/lib/engine/maia'
import { AvailableMoves } from './training'
import { Game, GameNode, GameTree } from './common'

export interface BaseTreeControllerContext {
  gameTree: GameTree
  currentNode: GameNode
  goToNode: (node: GameNode) => void
  goToNextNode: () => void
  goToPreviousNode: () => void
  goToRootNode: () => void
  plyCount: number
  orientation: 'white' | 'black'
  setOrientation: (orientation: 'white' | 'black') => void
}

export interface MaiaEngine {
  maia?: Maia
  status: MaiaStatus
  progress: number
  downloadModel: () => void
}

export interface StockfishEngine {
  error: string | null
  status: StockfishStatus
  isReady: () => boolean
  stopEvaluation: () => void
  streamEvaluations: (
    fen: string,
    moveCount: number,
    depth?: number,
  ) => AsyncIterable<StockfishEvaluation> | null
}

export interface MaiaEvaluation {
  policy: { [key: string]: number }
  value: number
}

export interface StockfishEvaluation {
  sent: boolean
  depth: number
  model_move: string
  model_optimal_cp: number
  cp_vec: { [key: string]: number }
  cp_relative_vec: { [key: string]: number }
  winrate_vec?: { [key: string]: number }
  winrate_loss_vec?: { [key: string]: number }
}

type EvaluationType =
  | 'tournament'
  | 'pgn'
  | 'play'
  | 'hand'
  | 'brain'
  | 'custom-pgn'
  | 'custom-fen'
  | 'stream'

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

export interface AnalysisWebGame {
  id: string
  type:
    | 'tournament'
    | 'pgn'
    | 'play'
    | 'hand'
    | 'brain'
    | 'custom-pgn'
    | 'custom-fen'
    | 'stream'
  label: string
  result: string
  pgn?: string
}

export interface AnalyzedGame extends Game {
  maiaEvaluations: { [rating: string]: MaiaEvaluation }[]
  stockfishEvaluations: StockfishEvaluations<EvaluationType>
  availableMoves: AvailableMoves[]
  type: EvaluationType
  pgn?: string
}

export interface LiveGame extends AnalyzedGame {
  loadedFen: string
  loaded: boolean
}

export interface CustomAnalysisInput {
  type: 'custom-pgn' | 'custom-fen'
  data: string // PGN string or FEN string
  name?: string
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

export interface ColorSanMapping {
  [move: string]: {
    san: string
    color: string
  }
}

export interface BlunderInfo {
  move: string
  probability: number
}

export interface BlunderMeterResult {
  blunderMoves: {
    probability: number
    moves: BlunderInfo[]
  }
  okMoves: {
    probability: number
    moves: BlunderInfo[]
  }
  goodMoves: {
    probability: number
    moves: BlunderInfo[]
  }
}

export type MaiaStatus =
  | 'loading'
  | 'no-cache'
  | 'downloading'
  | 'ready'
  | 'error'

export type StockfishStatus = 'loading' | 'ready' | 'error'

export interface MistakePosition {
  nodeId: string
  moveIndex: number
  fen: string
  playedMove: string
  san: string
  type: 'blunder' | 'inaccuracy'
  bestMove: string
  bestMoveSan: string
  playerColor: 'white' | 'black'
}

export interface LearnFromMistakesState {
  isActive: boolean
  showPlayerSelection: boolean
  selectedPlayerColor: 'white' | 'black' | null
  currentMistakeIndex: number
  mistakes: MistakePosition[]
  hasCompletedAnalysis: boolean
  showSolution: boolean
  currentAttempt: number
  maxAttempts: number
  originalPosition: string | null // FEN of the position where the player should make a move
}

// Streaming-related types
export interface LiveGameData {
  gameId: string
  white: {
    name: string
    rating?: number
  }
  black: {
    name: string
    rating?: number
  }
  lastMoveFen?: string
  isLive: boolean
}
