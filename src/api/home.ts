import { buildUrl } from 'src/api'

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
