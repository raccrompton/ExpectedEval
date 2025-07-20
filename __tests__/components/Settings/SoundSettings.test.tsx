import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { SoundSettings } from 'src/components/Settings/SoundSettings'
import { SettingsProvider } from 'src/contexts/SettingsContext'
import { chessSoundManager } from 'src/lib/chessSoundManager'

// Mock the chess sound manager
jest.mock('src/lib/chessSoundManager', () => ({
  chessSoundManager: {
    playMoveSound: jest.fn(),
  },
  useChessSoundManager: () => ({
    playMoveSound: jest.fn(),
    ready: true,
  }),
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('SoundSettings Component', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({ soundEnabled: true, chessboardTheme: 'brown' }),
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders sound settings with toggle enabled by default', () => {
    render(
      <SettingsProvider>
        <SoundSettings />
      </SettingsProvider>,
    )

    expect(screen.getByText('Sound Settings')).toBeInTheDocument()
    expect(screen.getByText('Enable Move Sounds')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('shows test buttons when sound is enabled', () => {
    render(
      <SettingsProvider>
        <SoundSettings />
      </SettingsProvider>,
    )

    expect(screen.getByText('Move Sound')).toBeInTheDocument()
    expect(screen.getByText('Capture Sound')).toBeInTheDocument()
  })

  it('saves settings to localStorage when toggle is changed', () => {
    render(
      <SettingsProvider>
        <SoundSettings />
      </SettingsProvider>,
    )

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'maia-user-settings',
      JSON.stringify({ soundEnabled: false, chessboardTheme: 'brown' }),
    )
  })
})
