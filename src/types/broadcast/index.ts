export interface BroadcastTour {
  id: string
  name: string
  slug: string
  info: Record<string, any>
  createdAt: number
  url: string
  tier: number
  dates: number[]
}

export interface BroadcastRound {
  id: string
  name: string
  slug: string
  createdAt: number
  ongoing: boolean
  startsAt: number
  rated: boolean
  url: string
}

export interface Broadcast {
  tour: BroadcastTour
  rounds: BroadcastRound[]
  defaultRoundId: string
}

export interface BroadcastGame {
  id: string
  white: string
  black: string
  result: string
  moves: string[]
  pgn: string
  fen: string
  lastMove?: [string, string]
  event: string
  site: string
  date: string
  round: string
  eco?: string
  opening?: string
  whiteElo?: number
  blackElo?: number
  timeControl?: string
  termination?: string
  annotator?: string
  studyName?: string
  chapterName?: string
  utcDate?: string
  utcTime?: string
}

export interface BroadcastRoundData {
  roundId: string
  broadcastId: string
  games: Map<string, BroadcastGame>
  lastUpdate: number
}

export interface BroadcastState {
  isConnected: boolean
  isConnecting: boolean
  isLive: boolean
  error: string | null
  roundStarted: boolean
  roundEnded: boolean
  gameEnded: boolean
}

export interface BroadcastStreamController {
  broadcasts: Broadcast[]
  currentBroadcast: Broadcast | null
  currentRound: BroadcastRound | null
  currentGame: BroadcastGame | null
  currentLiveGame: any | null
  roundData: BroadcastRoundData | null
  broadcastState: BroadcastState
  loadBroadcasts: () => Promise<void>
  selectBroadcast: (broadcastId: string) => void
  selectRound: (roundId: string) => void
  selectGame: (gameId: string) => void
  startRoundStream: (roundId: string) => void
  stopRoundStream: () => void
  reconnect: () => void
}

export interface PGNParseResult {
  games: BroadcastGame[]
  errors: string[]
}
