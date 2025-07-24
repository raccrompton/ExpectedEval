export interface LeaderboardEntry {
  display_name: string
  elo: number
}

export interface LeaderboardData {
  play_leaders: LeaderboardEntry[]
  puzzles_leaders: LeaderboardEntry[]
  turing_leaders: LeaderboardEntry[]
  hand_leaders: LeaderboardEntry[]
  brain_leaders: LeaderboardEntry[]
  last_updated: string
}

export type GameType = 'regular' | 'train' | 'turing' | 'hand' | 'brain'

export interface LeaderboardPosition {
  gameType: GameType
  gameName: string
  position: number
  elo: number
}

export interface LeaderboardStatus {
  isOnLeaderboard: boolean
  positions: LeaderboardPosition[]
  totalLeaderboards: number
}
