import { getActiveUserCount } from 'src/api/home/activeUsers'

// Mock fetch for PostHog API calls
global.fetch = jest.fn()

describe('getActiveUserCount', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear environment variables
    delete process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID
    delete process.env.NEXT_PUBLIC_POSTHOG_API_KEY
  })

  it('should return a positive number', async () => {
    const count = await getActiveUserCount()
    expect(count).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(count)).toBe(true)
  })

  it('should return different values on multiple calls (simulated variation)', async () => {
    const count1 = await getActiveUserCount()
    const count2 = await getActiveUserCount()
    const count3 = await getActiveUserCount()

    // At least one should be different due to random variation
    const allSame = count1 === count2 && count2 === count3
    expect(allSame).toBe(false)
  })

  it('should return reasonable values (1-50 range)', async () => {
    const count = await getActiveUserCount()
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(50)
  })

  it('should use PostHog API when credentials are configured', async () => {
    // Mock environment variables
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID = 'test-project-id'
    process.env.NEXT_PUBLIC_POSTHOG_API_KEY = 'test-api-key'

    // Mock successful PostHog API response
    const mockResponse = {
      result: [
        {
          data: [5, 8, 3, 2, 1], // 5 different time intervals with user counts
        },
      ],
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const count = await getActiveUserCount()

    expect(fetch).toHaveBeenCalledWith(
      'https://us.posthog.com/api/projects/test-project-id/insights/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-api-key',
        }),
        body: expect.stringContaining('"date_from":"-30m"'),
      }),
    )

    // Should return sum of data points (5+8+3+2+1 = 19)
    expect(count).toBe(19)
  })

  it('should fallback to simulation when PostHog API fails', async () => {
    // Mock environment variables
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID = 'test-project-id'
    process.env.NEXT_PUBLIC_POSTHOG_API_KEY = 'test-api-key'

    // Mock failed PostHog API response
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    })

    const count = await getActiveUserCount()

    expect(fetch).toHaveBeenCalled()
    // Should still return a reasonable simulated value
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(50)
  })

  it('should use simulation when PostHog credentials are not configured', async () => {
    // Environment variables are already cleared in beforeEach

    const count = await getActiveUserCount()

    // Should not call fetch
    expect(fetch).not.toHaveBeenCalled()

    // Should return simulated value
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(50)
  })
})
