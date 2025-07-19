import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GameList } from 'src/components/Profile/GameList'
import { AuthContext } from 'src/contexts'
import * as api from 'src/api'

// Mock the API functions
jest.mock('src/api', () => ({
  getAnalysisGameList: jest.fn(),
  getLichessGames: jest.fn(),
}))

// Mock custom analysis utility
jest.mock('src/lib/customAnalysis', () => ({
  getCustomAnalysesAsWebGames: jest.fn(() => []),
}))

// Mock favorites utility
jest.mock('src/lib/favorites', () => ({
  getFavoritesAsWebGames: jest.fn(() => []),
  addFavoriteGame: jest.fn(),
  removeFavoriteGame: jest.fn(),
  isFavoriteGame: jest.fn(() => false),
}))

// Mock FavoriteModal component
jest.mock('src/components/Common/FavoriteModal', () => ({
  FavoriteModal: () => null,
}))

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      layoutId,
      ...props
    }: React.PropsWithChildren<{ layoutId?: string }>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

const mockGetAnalysisGameList = api.getAnalysisGameList as jest.MockedFunction<
  typeof api.getAnalysisGameList
>

const mockGetLichessGames = api.getLichessGames as jest.MockedFunction<
  typeof api.getLichessGames
>

// Mock user context
const mockUser = {
  clientId: 'client123',
  displayName: 'Test User',
  lichessId: 'testuser123',
  id: 'user123',
}

const AuthWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthContext.Provider
    value={{
      user: mockUser,
      connectLichess: jest.fn(),
      logout: jest.fn(),
    }}
  >
    {children}
  </AuthContext.Provider>
)

describe('GameList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock different responses based on game type
    mockGetAnalysisGameList.mockImplementation((gameType) => {
      if (gameType === 'hand') {
        return Promise.resolve({
          games: [
            {
              game_id: 'game1',
              maia_name: 'maia_kdd_1500',
              result: '1-0',
              player_color: 'white',
            },
          ],
          total_games: 1,
          total_pages: 1,
        })
      } else if (gameType === 'brain') {
        return Promise.resolve({
          games: [],
          total_games: 0,
          total_pages: 0,
        })
      }
      // Default for 'play' and other types
      return Promise.resolve({
        games: [
          {
            game_id: 'game1',
            maia_name: 'maia_kdd_1500',
            result: '1-0',
            player_color: 'white',
          },
        ],
        total_games: 1,
        total_pages: 1,
      })
    })
  })

  it('renders with default props (all tabs shown for current user)', async () => {
    await act(async () => {
      render(
        <AuthWrapper>
          <GameList />
        </AuthWrapper>,
      )
    })

    expect(screen.getByText('Your Games')).toBeInTheDocument()
    expect(screen.getByText('Play')).toBeInTheDocument()
    expect(screen.getByText('H&B')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(screen.getByText('Lichess')).toBeInTheDocument()
  })

  it('renders with limited tabs for other users', async () => {
    await act(async () => {
      render(
        <AuthWrapper>
          <GameList
            lichessId="otheruser"
            userName="OtherUser"
            showCustom={false}
            showLichess={false}
          />
        </AuthWrapper>,
      )
    })

    expect(screen.getByText("OtherUser's Games")).toBeInTheDocument()
    expect(screen.getByText('Play')).toBeInTheDocument()
    expect(screen.getByText('H&B')).toBeInTheDocument()
    expect(screen.queryByText('Custom')).not.toBeInTheDocument()
    expect(screen.queryByText('Lichess')).not.toBeInTheDocument()
  })

  it('fetches games with lichessId when provided', async () => {
    const user = userEvent.setup()

    await act(async () => {
      render(
        <AuthWrapper>
          <GameList
            lichessId="otheruser"
            userName="OtherUser"
            showCustom={false}
            showLichess={false}
          />
        </AuthWrapper>,
      )
    })

    // Click on Play tab to trigger API call
    await act(async () => {
      await user.click(screen.getByText('Play'))
    })

    await waitFor(() => {
      expect(mockGetAnalysisGameList).toHaveBeenCalledWith(
        'play',
        1,
        'otheruser',
      )
    })
  })

  it('displays correct game labels for other users', async () => {
    const user = userEvent.setup()

    await act(async () => {
      render(
        <AuthWrapper>
          <GameList
            lichessId="otheruser"
            userName="OtherUser"
            showCustom={false}
            showLichess={false}
          />
        </AuthWrapper>,
      )
    })

    // Click on Play tab to see games
    await act(async () => {
      await user.click(screen.getByText('Play'))
    })

    await waitFor(() => {
      expect(screen.getByText('OtherUser vs. Maia 1500')).toBeInTheDocument()
    })
  })

  it('displays correct game labels for current user', async () => {
    const user = userEvent.setup()

    await act(async () => {
      render(
        <AuthWrapper>
          <GameList />
        </AuthWrapper>,
      )
    })

    // Click on Play tab to see games
    await act(async () => {
      await user.click(screen.getByText('Play'))
    })

    await waitFor(() => {
      expect(screen.getByText('You vs. Maia 1500')).toBeInTheDocument()
    })
  })

  it('switches between H&B subsections', async () => {
    const user = userEvent.setup()

    await act(async () => {
      render(
        <AuthWrapper>
          <GameList />
        </AuthWrapper>,
      )
    })

    // Click on H&B tab
    await act(async () => {
      await user.click(screen.getByText('H&B'))
    })

    // Wait for the hand games to load and check subsection labels
    await waitFor(() => {
      expect(screen.getByText('Hand')).toBeInTheDocument()
      expect(screen.getByText('Brain')).toBeInTheDocument()
    })

    // Click on Brain subsection
    await act(async () => {
      await user.click(screen.getByText('Brain'))
    })

    // Verify API call for brain games
    await waitFor(() => {
      expect(mockGetAnalysisGameList).toHaveBeenCalledWith(
        'brain',
        1,
        undefined,
      )
    })
  })

  it('adjusts grid columns based on available tabs', async () => {
    const { rerender } = render(
      <AuthWrapper>
        <GameList />
      </AuthWrapper>,
    )

    // With all 5 tabs (favorites, play, hb, custom, lichess)
    expect(document.querySelector('.grid-cols-5')).toBeInTheDocument()

    // With only 3 tabs (favorites, play, hb)
    await act(async () => {
      rerender(
        <AuthWrapper>
          <GameList showCustom={false} showLichess={false} />
        </AuthWrapper>,
      )
    })

    expect(document.querySelector('.grid-cols-3')).toBeInTheDocument()
  })
})
