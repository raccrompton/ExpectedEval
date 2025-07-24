import { createMocks } from 'node-mocks-http'
import handler from 'src/pages/api/active-users'

// Mock fetch for PostHog API calls
global.fetch = jest.fn()

describe('/api/active-users', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear environment variables
    delete process.env.POSTHOG_PROJECT_ID
    delete process.env.POSTHOG_API_KEY
  })

  it('should return 405 for non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(false)
    expect(data.error).toBe('Method not allowed')
  })

  it('should return simulated count when PostHog credentials are not configured', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
    expect(data.activeUsers).toBeGreaterThanOrEqual(1)
    expect(data.activeUsers).toBeLessThanOrEqual(50)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('should use PostHog API when credentials are configured', async () => {
    // Mock environment variables
    process.env.POSTHOG_PROJECT_ID = 'test-project-id'
    process.env.POSTHOG_API_KEY = 'test-api-key'

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

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
    expect(data.activeUsers).toBe(19) // Sum of data points (5+8+3+2+1)

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
  })

  it('should fallback to simulation when PostHog API fails', async () => {
    // Mock environment variables
    process.env.POSTHOG_PROJECT_ID = 'test-project-id'
    process.env.POSTHOG_API_KEY = 'test-api-key'

    // Mock failed PostHog API response
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    })

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
    expect(data.activeUsers).toBeGreaterThanOrEqual(1)
    expect(data.activeUsers).toBeLessThanOrEqual(50)

    expect(fetch).toHaveBeenCalled()
  })

  it('should fallback to simulation when PostHog API throws an error', async () => {
    // Mock environment variables
    process.env.POSTHOG_PROJECT_ID = 'test-project-id'
    process.env.POSTHOG_API_KEY = 'test-api-key'

    // Mock fetch to throw an error
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
    expect(data.activeUsers).toBeGreaterThanOrEqual(1)
    expect(data.activeUsers).toBeLessThanOrEqual(50)

    expect(fetch).toHaveBeenCalled()
  })

  it('should use custom PostHog host when configured', async () => {
    // Mock environment variables
    process.env.POSTHOG_PROJECT_ID = 'test-project-id'
    process.env.POSTHOG_API_KEY = 'test-api-key'
    process.env.POSTHOG_HOST = 'https://custom.posthog.com'

    // Mock successful PostHog API response
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: [{ data: [10] }],
      }),
    })

    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(fetch).toHaveBeenCalledWith(
      'https://custom.posthog.com/api/projects/test-project-id/insights/',
      expect.any(Object),
    )
  })
})
