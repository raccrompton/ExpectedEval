/**
 * Get the count of active users in the last 30 minutes
 * Calls our secure server-side API endpoint that handles PostHog integration
 */
export const getActiveUserCount = async (): Promise<number> => {
  try {
    const response = await fetch('/api/active-users')

    const data = await response.json()

    if (data.success && typeof data.activeUsers === 'number') {
      return data.activeUsers
    }
  } catch (error) {
    console.error('Failed to fetch active user count:', error)
  }

  return 0
}
