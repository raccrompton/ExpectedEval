import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  activeUsers: number
  success: boolean
  error?: string
}

/**
 * API endpoint to get active user count from PostHog
 * This keeps the PostHog API key secure on the server side
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      activeUsers: 0,
      success: false,
      error: 'Method not allowed',
    })
  }

  try {
    const activeUsers = await fetchActiveUsersFromPostHog()

    if (activeUsers !== null) {
      return res.status(200).json({
        activeUsers,
        success: true,
      })
    }
  } catch (error) {
    console.error('Error in active-users API:', error)
    return res.status(500).json({
      activeUsers: 0,
      success: false,
    })
  }
}

/**
 * Fetch active users from PostHog Insights API (server-side only)
 */
async function fetchActiveUsersFromPostHog(): Promise<number | null> {
  const posthogUrl = process.env.POSTHOG_URL || 'https://us.posthog.com'
  const projectId = process.env.POSTHOG_PROJECT_ID
  const personalApiKey = process.env.POSTHOG_API_KEY

  const url = `${posthogUrl}/api/projects/${projectId}/query/`

  const now = new Date()
  const twentyFourHoursAgo = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString()

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${personalApiKey}`,
      },
      body: JSON.stringify({
        query: {
          kind: 'HogQLQuery',
          query: `
            SELECT count(DISTINCT person_id) as recent_users
            FROM events
            WHERE event = '$pageview'
              AND timestamp > toDateTime('${twentyFourHoursAgo}')
          `,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText)
    }

    const data = await response.json()
    return data.results[0][0]
  } catch (error) {
    console.error('Error fetching recent users:', error)
    return null
  }
}
