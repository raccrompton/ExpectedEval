import { AnalysisWebGame } from 'src/types'

export interface FavoriteGame {
  id: string
  type: AnalysisWebGame['type']
  originalLabel: string
  customName: string
  result: string
  addedAt: string
  pgn?: string
}

const STORAGE_KEY = 'maia_favorite_games'

export const addFavoriteGame = (
  game: AnalysisWebGame,
  customName?: string,
): FavoriteGame => {
  const favorites = getFavoriteGames()

  // Check if already favorited
  const existingIndex = favorites.findIndex((fav) => fav.id === game.id)
  if (existingIndex !== -1) {
    // Update existing favorite
    favorites[existingIndex] = {
      ...favorites[existingIndex],
      customName: customName || favorites[existingIndex].customName,
    }
  } else {
    // Add new favorite
    const favorite: FavoriteGame = {
      id: game.id,
      type: game.type,
      originalLabel: game.label,
      customName: customName || game.label,
      result: game.result,
      addedAt: new Date().toISOString(),
      pgn: game.pgn,
    }
    favorites.unshift(favorite)
  }

  // Limit to 100 favorites
  const trimmedFavorites = favorites.slice(0, 100)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedFavorites))

  return favorites[existingIndex] || favorites[0]
}

export const removeFavoriteGame = (gameId: string): void => {
  const favorites = getFavoriteGames()
  const filtered = favorites.filter((favorite) => favorite.id !== gameId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

export const updateFavoriteName = (
  gameId: string,
  customName: string,
): void => {
  const favorites = getFavoriteGames()
  const favoriteIndex = favorites.findIndex((fav) => fav.id === gameId)

  if (favoriteIndex !== -1) {
    favorites[favoriteIndex].customName = customName
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
  }
}

export const getFavoriteGames = (): FavoriteGame[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.warn('Failed to parse stored favorite games:', error)
    return []
  }
}

export const isFavoriteGame = (gameId: string): boolean => {
  const favorites = getFavoriteGames()
  return favorites.some((favorite) => favorite.id === gameId)
}

export const getFavoriteGame = (gameId: string): FavoriteGame | undefined => {
  const favorites = getFavoriteGames()
  return favorites.find((favorite) => favorite.id === gameId)
}

export const convertFavoriteToWebGame = (
  favorite: FavoriteGame,
): AnalysisWebGame => {
  return {
    id: favorite.id,
    type: favorite.type,
    label: favorite.customName,
    result: favorite.result,
    pgn: favorite.pgn,
  }
}

export const getFavoritesAsWebGames = (): AnalysisWebGame[] => {
  const favorites = getFavoriteGames()
  return favorites.map(convertFavoriteToWebGame)
}
