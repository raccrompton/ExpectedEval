import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { UserGameList } from 'src/components/Profile/UserGameList'
import * as api from 'src/api'

// Mock the API function
jest.mock('src/api', () => ({
  getAnalysisGameList: jest.fn(),
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

describe('UserGameList', () => {
  const mockProps = {
    lichessId: 'testuser',
    userName: 'TestUser',
  }

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

  it('renders the component with user name in title', () => {
    render(<UserGameList {...mockProps} />)

    expect(screen.getByText("TestUser's Games")).toBeInTheDocument()
  })

  it('shows only Play and H&B tabs (no Custom or Lichess)', () => {
    render(<UserGameList {...mockProps} />)

    expect(screen.getByText('Play')).toBeInTheDocument()
    expect(screen.getByText('H&B')).toBeInTheDocument()
    expect(screen.queryByText('Custom')).not.toBeInTheDocument()
    expect(screen.queryByText('Lichess')).not.toBeInTheDocument()
  })

  it('calls API with correct parameters', async () => {
    render(<UserGameList {...mockProps} />)

    await waitFor(() => {
      expect(mockGetAnalysisGameList).toHaveBeenCalledWith(
        'play',
        1,
        'testuser',
      )
    })
  })

  it('displays games with proper labels showing user name', async () => {
    render(<UserGameList {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByText('TestUser vs. Maia 1500')).toBeInTheDocument()
    })
  })

  it('shows loading spinner initially', () => {
    render(<UserGameList {...mockProps} />)

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })
})
