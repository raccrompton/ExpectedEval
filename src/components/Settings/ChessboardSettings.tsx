import React from 'react'
import { useSettings } from 'src/contexts/SettingsContext'
import Chessground from '@react-chess/chessground'

type ChessboardTheme =
  | 'brown'
  | 'blue'
  | 'blue2'
  | 'blue3'
  | 'blue-marble'
  | 'canvas2'
  | 'wood'
  | 'wood2'
  | 'wood3'
  | 'wood4'
  | 'maple'
  | 'maple2'
  | 'leather'
  | 'green'
  | 'pink-pyramid'
  | 'marble'
  | 'green-plastic'
  | 'grey'
  | 'metal'
  | 'olive'
  | 'newspaper'
  | 'purple'
  | 'purple-diag'
  | 'ic'
  | 'horsey'
  | 'wood-worn'
  | 'putt-putt'
  | 'cocoa'
  | 'parchment'

// Flattened list of all themes
const ALL_THEMES: ChessboardTheme[] = [
  'brown',
  'blue',
  'blue2',
  'blue3',
  'blue-marble',
  'canvas2',
  'wood',
  'wood2',
  'wood3',
  'wood4',
  'maple',
  'maple2',
  'green',
  'marble',
  'green-plastic',
  'grey',
  'metal',
  'newspaper',
  'ic',
  'purple',
  'purple-diag',
  'pink-pyramid',
  'leather',
  'olive',
  'horsey',
  'wood-worn',
  'putt-putt',
  'cocoa',
  'parchment',
]

export const ChessboardSettings: React.FC = () => {
  const { settings, updateSetting } = useSettings()

  const handleThemeChange = (theme: ChessboardTheme) => {
    updateSetting('chessboardTheme', theme)
  }

  return (
    <div className="flex flex-col gap-4 rounded bg-background-1 p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Chessboard Theme</h3>
        <p className="text-sm text-secondary">
          Choose your preferred chessboard style. Changes will apply to all
          chess boards across the platform.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Theme Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {ALL_THEMES.map((theme) => (
            <label
              key={theme}
              className={`flex cursor-pointer items-center justify-center rounded border-2 p-2 transition-colors ${
                settings.chessboardTheme === theme
                  ? 'border-human-4 bg-human-3/20'
                  : 'border-background-3 bg-background-2 hover:border-background-3 hover:bg-background-3'
              }`}
            >
              <input
                type="radio"
                name="chessboard-theme"
                value={theme}
                checked={settings.chessboardTheme === theme}
                onChange={() => handleThemeChange(theme)}
                className="sr-only"
              />
              <div
                className={`theme-preview-${theme} aspect-square h-16 w-16 overflow-hidden rounded`}
              >
                <Chessground
                  contained
                  config={{
                    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                    viewOnly: true,
                    coordinates: false,
                  }}
                />
              </div>
            </label>
          ))}
        </div>

        <div className="flex items-start gap-2 rounded bg-background-2/60 px-3 py-2">
          <span className="material-symbols-outlined inline !text-base text-secondary">
            info
          </span>
          <p className="text-sm text-secondary">
            Theme changes take effect immediately and will be remembered across
            browser sessions. Preview shows how the board will appear in games.
          </p>
        </div>
      </div>
    </div>
  )
}
