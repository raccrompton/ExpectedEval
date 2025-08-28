export type ConfidenceBucket = 'high' | 'medium' | 'low'

export interface ExpectedWinrateParams {
  probThreshold: number
  depth: number
  minWin: number
  maiaModel: string
}

export interface ExpectedWinrateLeaf {
  winrate: number
  depth: number
}

export interface ExpectedWinrateNode {
  fen: string
  path: string[]
  cumulativeProb: number
  turn: 'w' | 'b'
  pruned: boolean
  leaf?: ExpectedWinrateLeaf
  children?: ExpectedWinrateNode[]
}

export interface ExpectedWinrateMoveResult {
  move: string
  san: string
  expectedWinrate: number
  coverage: number
  confidence: ConfidenceBucket
  avgDepth: number
  tree: ExpectedWinrateNode
  elapsedMs: number
}

export interface ExpectedWinrateResult {
  baseFen: string
  baseWinrate: number
  params: ExpectedWinrateParams
  moves: ExpectedWinrateMoveResult[]
  coverage: number
  elapsedMs: number
  cacheHit: boolean
}
