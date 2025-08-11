import {
  addFavoriteGame,
  removeFavoriteGame,
  updateFavoriteName,
  getFavoriteGames,
  isFavoriteGame,
  getFavoriteGame,
  getFavoritesAsWebGames,
} from 'src/lib/favorites'
import { MaiaGameEntry } from 'src/types'

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

// Mock the API functions to test fallback to localStorage
jest.mock('src/api/analysis/analysis', () => ({
  updateGameMetadata: jest
    .fn()
    .mockRejectedValue(new Error('API not available')),
  getAnalysisGameList: jest
    .fn()
    .mockRejectedValue(new Error('API not available')),
}))

describe('favorites', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  const mockGame: MaiaGameEntry = {
    id: 'test-game-1',
    type: 'play',
    label: 'You vs. Maia 1600',
    result: '1-0',
  }

  describe('addFavoriteGame', () => {
    it('should add a game to favorites with default name', async () => {
      const favorite = await addFavoriteGame(mockGame)

      expect(favorite.id).toBe(mockGame.id)
      expect(favorite.customName).toBe(mockGame.label)
      expect(favorite.originalLabel).toBe(mockGame.label)
      expect(await isFavoriteGame(mockGame.id)).toBe(true)
    })

    it('should add a game to favorites with custom name', async () => {
      const customName = 'My Best Game'
      const favorite = await addFavoriteGame(mockGame, customName)

      expect(favorite.customName).toBe(customName)
      expect(favorite.originalLabel).toBe(mockGame.label)
    })

    it('should update existing favorite when added again', async () => {
      await addFavoriteGame(mockGame, 'First Name')
      await addFavoriteGame(mockGame, 'Updated Name')

      const favorites = await getFavoriteGames()
      expect(favorites).toHaveLength(1)
      expect(favorites[0].customName).toBe('Updated Name')
    })
  })

  describe('removeFavoriteGame', () => {
    it('should remove a game from favorites', async () => {
      await addFavoriteGame(mockGame)
      expect(await isFavoriteGame(mockGame.id)).toBe(true)

      await removeFavoriteGame(mockGame.id, mockGame.type)
      expect(await isFavoriteGame(mockGame.id)).toBe(false)
    })
  })

  describe('updateFavoriteName', () => {
    it('should update favorite name', async () => {
      await addFavoriteGame(mockGame, 'Original Name')
      await updateFavoriteName(mockGame.id, 'New Name', mockGame.type)

      const favorite = await getFavoriteGame(mockGame.id)
      expect(favorite?.customName).toBe('New Name')
    })

    it('should do nothing if favorite does not exist', async () => {
      const initialFavorites = await getFavoriteGames()
      await updateFavoriteName('non-existent', 'New Name')

      expect(await getFavoriteGames()).toEqual(initialFavorites)
    })
  })

  describe('getFavoritesAsWebGames', () => {
    it('should convert favorites to web games', async () => {
      const customName = 'Custom Game Name'
      await addFavoriteGame(mockGame, customName)

      const webGames = await getFavoritesAsWebGames()
      expect(webGames).toHaveLength(1)
      expect(webGames[0].label).toBe(customName)
      expect(webGames[0].id).toBe(mockGame.id)
    })
  })

  describe('storage limits', () => {
    it('should limit favorites to 100 entries', async () => {
      // Add 101 favorites
      for (let i = 0; i < 101; i++) {
        const game: MaiaGameEntry = {
          id: `game-${i}`,
          type: 'play',
          label: `Game ${i}`,
          result: '1-0',
        }
        await addFavoriteGame(game)
      }

      const favorites = await getFavoriteGames()
      expect(favorites).toHaveLength(100)
      // Latest should be at the top
      expect(favorites[0].id).toBe('game-100')
    })
  })
})
