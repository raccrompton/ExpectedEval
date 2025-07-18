import { renderHook, act, waitFor } from '@testing-library/react'
import { useStats, ApiResult } from '../../src/hooks/useStats'

// Mock API call
const createMockApiCall = (result: ApiResult) => {
  return jest.fn().mockResolvedValue(result)
}

const mockApiResult: ApiResult = {
  rating: 1500,
  gamesPlayed: 50,
  gamesWon: 30,
}

describe('useStats Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress React act() warnings for async state updates in useEffect
    const originalError = console.error
    jest.spyOn(console, 'error').mockImplementation((message) => {
      if (
        typeof message === 'string' &&
        message.includes('was not wrapped in act')
      ) {
        return
      }
      originalError(message)
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should initialize with default stats', () => {
    const mockApiCall = createMockApiCall(mockApiResult)
    const { result } = renderHook(() => useStats(mockApiCall))

    const [stats] = result.current

    expect(stats.rating).toBeUndefined()
    expect(stats.lastRating).toBeUndefined()
    expect(stats.session.gamesPlayed).toBe(0)
    expect(stats.session.gamesWon).toBe(0)
    expect(stats.lifetime).toBeUndefined()
  })

  it('should load stats from API on mount', async () => {
    const mockApiCall = createMockApiCall(mockApiResult)
    const { result } = renderHook(() => useStats(mockApiCall))

    await waitFor(() => {
      expect(result.current[0].rating).toBe(1500)
    })

    const [stats] = result.current

    expect(mockApiCall).toHaveBeenCalledTimes(1)
    expect(stats.lifetime?.gamesPlayed).toBe(50)
    expect(stats.lifetime?.gamesWon).toBe(30)
  })

  it('should set lastRating correctly when stats are loaded', async () => {
    const mockApiCall = createMockApiCall(mockApiResult)
    const { result } = renderHook(() => useStats(mockApiCall))

    // Initially no rating
    expect(result.current[0].rating).toBeUndefined()

    await waitFor(() => {
      expect(result.current[0].rating).toBe(1500)
    })

    const [stats] = result.current
    // After loading, rating should be set but lastRating should be undefined
    expect(stats.lastRating).toBeUndefined()
  })

  it('should increment session stats correctly', async () => {
    const mockApiCall = createMockApiCall(mockApiResult)
    const { result } = renderHook(() => useStats(mockApiCall))

    await waitFor(() => {
      expect(result.current[0].rating).toBe(1500)
    })

    const [, incrementStats] = result.current

    act(() => {
      incrementStats(2, 1) // 2 games played, 1 game won
    })

    const [stats] = result.current

    expect(stats.session.gamesPlayed).toBe(2)
    expect(stats.session.gamesWon).toBe(1)
  })

  it('should increment lifetime stats correctly', async () => {
    const mockApiCall = createMockApiCall(mockApiResult)
    const { result } = renderHook(() => useStats(mockApiCall))

    await waitFor(() => {
      expect(result.current[0].rating).toBe(1500)
    })

    const [, incrementStats] = result.current

    act(() => {
      incrementStats(5, 3) // 5 games played, 3 games won
    })

    const [stats] = result.current

    expect(stats.lifetime?.gamesPlayed).toBe(55) // 50 + 5
    expect(stats.lifetime?.gamesWon).toBe(33) // 30 + 3
  })

  it('should handle incrementing stats when no lifetime stats exist', () => {
    const mockApiCall = jest.fn().mockResolvedValue({
      rating: 1200,
      gamesPlayed: 0,
      gamesWon: 0,
    })

    const { result } = renderHook(() => useStats(mockApiCall))

    const [, incrementStats] = result.current

    act(() => {
      incrementStats(3, 2)
    })

    const [stats] = result.current

    expect(stats.session.gamesPlayed).toBe(3)
    expect(stats.session.gamesWon).toBe(2)
    expect(stats.lifetime?.gamesPlayed).toBe(3)
    expect(stats.lifetime?.gamesWon).toBe(2)
  })

  it('should update rating correctly', async () => {
    const mockApiCall = createMockApiCall(mockApiResult)
    const { result } = renderHook(() => useStats(mockApiCall))

    await waitFor(() => {
      expect(result.current[0].rating).toBe(1500)
    })

    const [, , updateRating] = result.current

    act(() => {
      updateRating(1600)
    })

    const [stats] = result.current

    expect(stats.rating).toBe(1600)
    expect(stats.lastRating).toBe(1500) // Previous rating
  })

  it('should maintain session stats across rating updates', async () => {
    const mockApiCall = createMockApiCall(mockApiResult)
    const { result } = renderHook(() => useStats(mockApiCall))

    await waitFor(() => {
      expect(result.current[0].rating).toBe(1500)
    })

    const [, incrementStats, updateRating] = result.current

    // Add some session stats
    act(() => {
      incrementStats(3, 2)
    })

    // Update rating
    act(() => {
      updateRating(1600)
    })

    const [stats] = result.current

    // Session stats should be preserved
    expect(stats.session.gamesPlayed).toBe(3)
    expect(stats.session.gamesWon).toBe(2)
    expect(stats.rating).toBe(1600)
    expect(stats.lastRating).toBe(1500)
  })

  it('should handle multiple increments correctly', async () => {
    const mockApiCall = createMockApiCall(mockApiResult)
    const { result } = renderHook(() => useStats(mockApiCall))

    await waitFor(() => {
      expect(result.current[0].rating).toBe(1500)
    })

    const [, incrementStats] = result.current

    // First increment
    act(() => {
      incrementStats(2, 1)
    })

    // Second increment
    act(() => {
      incrementStats(3, 2)
    })

    const [stats] = result.current

    expect(stats.session.gamesPlayed).toBe(5) // 2 + 3
    expect(stats.session.gamesWon).toBe(3) // 1 + 2
    expect(stats.lifetime?.gamesPlayed).toBe(55) // 50 + 2 + 3
    expect(stats.lifetime?.gamesWon).toBe(33) // 30 + 1 + 2
  })
})
