const BASE_PATH = '/api/v1/'

export const buildUrl = (path: string) => `${BASE_PATH}${path}`

export const connectLichessUrl = buildUrl('auth/lichess_login')
