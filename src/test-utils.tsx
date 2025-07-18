import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { AuthContextProvider } from 'src/providers/AuthContextProvider'
import { ModalContextProvider } from 'src/providers/ModalContextProvider'
import { WindowSizeContextProvider } from 'src/providers/WindowSizeContextProvider'

// Mock user for testing
export const mockUser = {
  id: 'test-user-123',
  username: 'testuser',
  email: 'test@example.com',
  displayName: 'Test User',
  avatar: null,
  isVerified: true,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
}

// Mock authentication context
export const mockAuthContext = {
  user: mockUser,
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
  refreshUser: jest.fn(),
}

// Mock modal context
export const mockModalContext = {
  openModal: jest.fn(),
  closeModal: jest.fn(),
  modalState: {
    isOpen: false,
    type: null,
    props: {},
  },
}

// Mock window size context
export const mockWindowSizeContext = {
  windowSize: {
    width: 1024,
    height: 768,
  },
  isMobile: false,
  isTablet: false,
  isDesktop: true,
}

// Custom render function that includes providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <WindowSizeContextProvider>
      <AuthContextProvider>
        <ModalContextProvider>{children}</ModalContextProvider>
      </AuthContextProvider>
    </WindowSizeContextProvider>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything except render to avoid conflicts
export {
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
  within,
  getByText,
  getByRole,
  getByLabelText,
  getByPlaceholderText,
  getByDisplayValue,
  getByAltText,
  getByTitle,
  getByTestId,
  queryByText,
  queryByRole,
  queryByLabelText,
  queryByPlaceholderText,
  queryByDisplayValue,
  queryByAltText,
  queryByTitle,
  queryByTestId,
  findByText,
  findByRole,
  findByLabelText,
  findByPlaceholderText,
  findByDisplayValue,
  findByAltText,
  findByTitle,
  findByTestId,
  getAllByText,
  getAllByRole,
  getAllByLabelText,
  getAllByPlaceholderText,
  getAllByDisplayValue,
  getAllByAltText,
  getAllByTitle,
  getAllByTestId,
  queryAllByText,
  queryAllByRole,
  queryAllByLabelText,
  queryAllByPlaceholderText,
  queryAllByDisplayValue,
  queryAllByAltText,
  queryAllByTitle,
  queryAllByTestId,
  findAllByText,
  findAllByRole,
  findAllByLabelText,
  findAllByPlaceholderText,
  findAllByDisplayValue,
  findAllByAltText,
  findAllByTitle,
  findAllByTestId,
} from '@testing-library/react'
export { customRender as render }

// Test utilities for mocking chess engines
export const mockStockfishEngine = {
  isReady: true,
  isAnalyzing: false,
  bestMove: null,
  evaluation: 0,
  pvLine: [],
  startAnalysis: jest.fn(),
  stopAnalysis: jest.fn(),
  makeMove: jest.fn(),
  setPosition: jest.fn(),
  setDepth: jest.fn(),
}

export const mockMaiaEngine = {
  isReady: true,
  isLoading: false,
  currentModel: 'maia-1500',
  availableModels: ['maia-1100', 'maia-1500', 'maia-1900'],
  loadModel: jest.fn(),
  predict: jest.fn().mockResolvedValue({
    bestMove: 'e2e4',
    confidence: 0.85,
    moveDistribution: [
      { move: 'e2e4', probability: 0.85 },
      { move: 'd2d4', probability: 0.1 },
      { move: 'g1f3', probability: 0.05 },
    ],
  }),
  setPosition: jest.fn(),
}

// Helper function to create mock chess positions
export const createMockPosition = (
  fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
) => ({
  fen,
  moves: [],
  isGameOver: false,
  isCheck: false,
  isCheckmate: false,
  isStalemate: false,
  turn: 'w',
  legalMoves: ['e2e4', 'd2d4', 'g1f3', 'b1c3'],
})

// Helper function to create mock analysis data
export const createMockAnalysis = () => ({
  id: 'test-analysis-123',
  moves: [
    {
      move: 'e2e4',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      stockfishEval: 0.2,
      maiaEval: 0.15,
      isBlunder: false,
      isGoodMove: true,
      annotations: [],
    },
  ],
  result: '1-0',
  date: '2023-01-01',
  white: 'White Player',
  black: 'Black Player',
  rating: { white: 1500, black: 1400 },
})
