import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
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

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<object>) => (
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
  lichessId: 'testuser123',
  id: 'user123',
}

const AuthWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthContext.Provider
    value={{
      user: mockUser,
      signIn: jest.fn(),
      signOut: jest.fn(),
      loading: false,
    }}
  >
    {children}
  </AuthContext.Provider>
)

describe('GameList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAnalysisGameList.mockResolvedValue({
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

  it('renders with default props (all tabs shown for current user)', () => {
    render(
      <AuthWrapper>
        <GameList />
      </AuthWrapper>
    )

    expect(screen.getByText('Your Games')).toBeInTheDocument()
    expect(screen.getByText('Play')).toBeInTheDocument()
    expect(screen.getByText('H&B')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(screen.getByText('Lichess')).toBeInTheDocument()
  })

  it('renders with limited tabs for other users', () => {
    render(
      <AuthWrapper>
        <GameList
          lichessId="otheruser"
          userName="OtherUser"
          showCustom={false}
          showLichess={false}
        />
      </AuthWrapper>
    )

    expect(screen.getByText("OtherUser's Games")).toBeInTheDocument()
    expect(screen.getByText('Play')).toBeInTheDocument()
    expect(screen.getByText('H&B')).toBeInTheDocument()
    expect(screen.queryByText('Custom')).not.toBeInTheDocument()
    expect(screen.queryByText('Lichess')).not.toBeInTheDocument()
  })

  it('fetches games with lichessId when provided', async () => {
    render(
      <AuthWrapper>
        <GameList
          lichessId="otheruser"
          userName="OtherUser"
          showCustom={false}
          showLichess={false}
        />
      </AuthWrapper>
    )

    await waitFor(() => {
      expect(mockGetAnalysisGameList).toHaveBeenCalledWith('play', 1, 'otheruser')
    })
  })

  it('displays correct game labels for other users', async () => {
    render(
      <AuthWrapper>
        <GameList
          lichessId="otheruser"
          userName="OtherUser"
          showCustom={false}
          showLichess={false}
        />
      </AuthWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('OtherUser vs. Maia 1500')).toBeInTheDocument()
    })
  })

  it('displays correct game labels for current user', async () => {
    render(
      <AuthWrapper>
        <GameList />
      </AuthWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('You vs. Maia 1500')).toBeInTheDocument()
    })
  })

  it('switches between H&B subsections', async () => {
    const user = userEvent.setup()
    render(
      <AuthWrapper>
        <GameList />
      </AuthWrapper>
    )

    // Click on H&B tab
    await user.click(screen.getByText('H&B'))

    // Check that Hand subsection is visible
    expect(screen.getByText('Hand (0)')).toBeInTheDocument()
    expect(screen.getByText('Brain (0)')).toBeInTheDocument()

    // Click on Brain subsection
    await user.click(screen.getByText('Brain (0)'))

    // Verify API call for brain games
    await waitFor(() => {
      expect(mockGetAnalysisGameList).toHaveBeenCalledWith('brain', 1, undefined)
    })
  })

  it('adjusts grid columns based on available tabs', () => {
    const { rerender } = render(
      <AuthWrapper>
        <GameList />
      </AuthWrapper>
    )

    // With all 4 tabs
    expect(document.querySelector('.grid-cols-4')).toBeInTheDocument()

    // With only 2 tabs
    rerender(
      <AuthWrapper>
        <GameList showCustom={false} showLichess={false} />
      </AuthWrapper>
    )

    expect(document.querySelector('.grid-cols-2')).toBeInTheDocument()
  })
})