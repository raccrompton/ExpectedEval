export * from './theme'
export * from './play'
export * from './player'
export * from './analysis'
export * from './base'
export * from './auth'
export * from './turing'
export * from './modal'
export * from './blog'

interface GameState {
  fen: string
  lastMove: string | undefined
  check: false | 'black' | 'white'
  san: string | undefined
  evaluations: { [key: string]: number } | undefined
  clock: number | undefined
}

interface Termination {
  result: string
  winner: 'white' | 'black' | undefined
  type: string
}

interface Player {
  id: string
  name: string
  rating: number
  title: string | undefined
}

interface StockfishAnalysisMap {
  [move: string]: {
    evaluation: number | undefined
    whiteMate: number | undefined
    blackMate: number | undefined
    winrate: number
  }
}

interface MaiaAnalysisMap {
  [move: string]: number
}

interface AvailableMoves {
  [move: string]: GameState
}

interface Game {
  id: string
  termination: Termination
  gameStates: GameState[]
  whitePlayer: Player | undefined
  blackPlayer: Player | undefined
}

interface AnalysisGame extends Game {
  stockfishAnalyses: { [model: string]: StockfishAnalysisMap[] }[]
  maiaAnalyses: { [model: string]: MaiaAnalysisMap[] }[]
  availableMoves: AvailableMoves[]
}

interface TrainingGame extends Game {
  targetIndex: number
  stockfishAnalyses: { [model: string]: StockfishAnalysisMap[] }
  maiaAnalyses: { [model: string]: MaiaAnalysisMap[] }
  availableMoves: AvailableMoves
}
