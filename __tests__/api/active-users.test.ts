import { createMocks } from 'node-mocks-http'
import handler from 'src/pages/api/active-users'

global.fetch = jest.fn()

describe('/api/active-users', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
})
