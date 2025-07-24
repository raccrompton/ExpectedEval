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

  it('should fallback to simulation when API call fails', async () => {
    // Mock failed API response
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const count = await getActiveUserCount()

    expect(fetch).toHaveBeenCalledWith('/api/active-users')
    // Should fallback to simulated value
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(50)
  })

  it('should fallback to simulation when API returns invalid data', async () => {
    // Mock API response with invalid data
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: 'Invalid data',
      }),
    })

    const count = await getActiveUserCount()

    expect(fetch).toHaveBeenCalledWith('/api/active-users')
    // Should fallback to simulated value
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(50)
  })

  it('should fallback to simulation when fetch throws an error', async () => {
    // Mock fetch to throw an error
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const count = await getActiveUserCount()

    expect(fetch).toHaveBeenCalledWith('/api/active-users')
    // Should fallback to simulated value
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(50)
  })

  it('should return reasonable simulated values (1-50 range)', async () => {
    // Mock failed API to trigger simulation
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    })

    const count = await getActiveUserCount()
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(50)
  })

  it('should return different simulated values on multiple calls', async () => {
    // Mock all API calls to fail to trigger simulation
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: false,
    })

    const count1 = await getActiveUserCount()
    const count2 = await getActiveUserCount()
    const count3 = await getActiveUserCount()

    // At least one should be different due to random variation
    const allSame = count1 === count2 && count2 === count3
    expect(allSame).toBe(false)
  })
})
