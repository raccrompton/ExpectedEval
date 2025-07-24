import { getActiveUserCount } from 'src/api/home/activeUsers'

// Mock fetch for API calls
global.fetch = jest.fn()

describe('getActiveUserCount', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return a positive number', async () => {
    // Mock successful API response
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        activeUsers: 15,
        success: true,
      }),
    })

    const count = await getActiveUserCount()
    expect(count).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(count)).toBe(true)
  })

  it('should call the internal API endpoint', async () => {
    // Mock successful API response
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        activeUsers: 10,
        success: true,
      }),
    })

    const count = await getActiveUserCount()

    expect(fetch).toHaveBeenCalledWith('/api/active-users')
    expect(count).toBe(10)
  })
})
