import {
  addFavoriteGame,
  removeFavoriteGame,
  updateFavoriteName,
  getFavoriteGames,
  isFavoriteGame,
  getFavoriteGame,
  getFavoritesAsWebGames,
} from 'src/lib/favorites'
import { AnalysisWebGame } from 'src/types'

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('favorites', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  const mockGame: AnalysisWebGame = {
    id: 'test-game-1',
    type: 'play',
    label: 'You vs. Maia 1600',
    result: '1-0',
  }

  describe('addFavoriteGame', () => {
    it('should add a game to favorites with default name', () => {
      const favorite = addFavoriteGame(mockGame)

      expect(favorite.id).toBe(mockGame.id)
      expect(favorite.customName).toBe(mockGame.label)
      expect(favorite.originalLabel).toBe(mockGame.label)
      expect(isFavoriteGame(mockGame.id)).toBe(true)
    })

    it('should add a game to favorites with custom name', () => {
      const customName = 'My Best Game'
      const favorite = addFavoriteGame(mockGame, customName)

      expect(favorite.customName).toBe(customName)
      expect(favorite.originalLabel).toBe(mockGame.label)
    })

    it('should update existing favorite when added again', () => {
      addFavoriteGame(mockGame, 'First Name')
      addFavoriteGame(mockGame, 'Updated Name')

      const favorites = getFavoriteGames()
      expect(favorites).toHaveLength(1)
      expect(favorites[0].customName).toBe('Updated Name')
    })
  })

  describe('removeFavoriteGame', () => {
    it('should remove a game from favorites', () => {
      addFavoriteGame(mockGame)
      expect(isFavoriteGame(mockGame.id)).toBe(true)

      removeFavoriteGame(mockGame.id)
      expect(isFavoriteGame(mockGame.id)).toBe(false)
    })
  })

  describe('updateFavoriteName', () => {
    it('should update favorite name', () => {
      addFavoriteGame(mockGame, 'Original Name')
      updateFavoriteName(mockGame.id, 'New Name')

      const favorite = getFavoriteGame(mockGame.id)
      expect(favorite?.customName).toBe('New Name')
    })

    it('should do nothing if favorite does not exist', () => {
      const initialFavorites = getFavoriteGames()
      updateFavoriteName('non-existent', 'New Name')

      expect(getFavoriteGames()).toEqual(initialFavorites)
    })
  })

  describe('getFavoritesAsWebGames', () => {
    it('should convert favorites to web games', () => {
      const customName = 'Custom Game Name'
      addFavoriteGame(mockGame, customName)

      const webGames = getFavoritesAsWebGames()
      expect(webGames).toHaveLength(1)
      expect(webGames[0].label).toBe(customName)
      expect(webGames[0].id).toBe(mockGame.id)
    })
  })

  describe('storage limits', () => {
    it('should limit favorites to 100 entries', () => {
      // Add 101 favorites
      for (let i = 0; i < 101; i++) {
        const game: AnalysisWebGame = {
          id: `game-${i}`,
          type: 'play',
          label: `Game ${i}`,
          result: '1-0',
        }
        addFavoriteGame(game)
      }

      const favorites = getFavoriteGames()
      expect(favorites).toHaveLength(100)
      // Latest should be at the top
      expect(favorites[0].id).toBe('game-100')
    })
  })
})
