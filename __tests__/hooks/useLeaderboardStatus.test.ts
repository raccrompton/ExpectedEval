import { renderHook, waitFor } from '@testing-library/react'
import { useLeaderboardStatus } from 'src/hooks/useLeaderboardStatus'
import * as api from 'src/api'

// Mock the API
jest.mock('src/api', () => ({
  getLeaderboard: jest.fn(),
}))

const mockLeaderboardData = {
  play_leaders: [
    { display_name: 'TestPlayer1', elo: 1800 },
    { display_name: 'TestPlayer2', elo: 1750 },
  ],
  puzzles_leaders: [
    { display_name: 'TestPlayer1', elo: 1600 },
    { display_name: 'TestPlayer3', elo: 1550 },
  ],
  turing_leaders: [
    { display_name: 'TestPlayer4', elo: 1400 },
  ],
  hand_leaders: [
    { display_name: 'TestPlayer1', elo: 1500 },
  ],
  brain_leaders: [
    { display_name: 'TestPlayer5', elo: 1300 },
  ],
  last_updated: '2024-01-01T00:00:00',
}

describe('useLeaderboardStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(api.getLeaderboard as jest.Mock).mockResolvedValue(mockLeaderboardData)
  })

  it('should return correct status for player on multiple leaderboards', async () => {
    const { result } = renderHook(() =>
      useLeaderboardStatus('TestPlayer1'),
    )

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.status.isOnLeaderboard).toBe(true)
    expect(result.current.status.totalLeaderboards).toBe(3)
    expect(result.current.status.positions).toHaveLength(3)
    
    // Check specific positions
    const regularPosition = result.current.status.positions.find(p => p.gameType === 'regular')
    expect(regularPosition?.position).toBe(1)
    expect(regularPosition?.elo).toBe(1800)

    const trainPosition = result.current.status.positions.find(p => p.gameType === 'train')
    expect(trainPosition?.position).toBe(1)
    expect(trainPosition?.elo).toBe(1600)

    const handPosition = result.current.status.positions.find(p => p.gameType === 'hand')
    expect(handPosition?.position).toBe(1)
    expect(handPosition?.elo).toBe(1500)
  })

  it('should return correct status for player not on leaderboard', async () => {
    const { result } = renderHook(() =>
      useLeaderboardStatus('NonExistentPlayer'),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.status.isOnLeaderboard).toBe(false)
    expect(result.current.status.totalLeaderboards).toBe(0)
    expect(result.current.status.positions).toHaveLength(0)
  })

  it('should return empty status when no displayName provided', async () => {
    const { result } = renderHook(() =>
      useLeaderboardStatus(undefined),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.status.isOnLeaderboard).toBe(false)
    expect(result.current.status.totalLeaderboards).toBe(0)
    expect(result.current.status.positions).toHaveLength(0)
    expect(api.getLeaderboard).not.toHaveBeenCalled()
  })

  it('should handle API errors gracefully', async () => {
    ;(api.getLeaderboard as jest.Mock).mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(() =>
      useLeaderboardStatus('TestPlayer1'),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.status.isOnLeaderboard).toBe(false)
    expect(result.current.error).toBe('Failed to fetch leaderboard data')
  })
})