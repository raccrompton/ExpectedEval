import React from 'react'
import { useSettings } from 'src/contexts/SettingsContext'
import { chessboardThemeManager } from 'src/lib/chessboardThemeManager'

type ChessboardTheme = 'brown' | 'cburnett'

interface ThemeOption {
  id: ChessboardTheme
  name: string
  description: string
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'brown',
    name: 'Brown',
    description: 'Classic brown wooden chess board',
  },
  {
    id: 'cburnett',
    name: 'Blue',
    description: 'Modern blue chess board with cburnett pieces',
  },
]

export const ChessboardSettings: React.FC = () => {
  const { settings, updateSetting } = useSettings()

  const handleThemeChange = async (theme: ChessboardTheme) => {
    updateSetting('chessboardTheme', theme)

    // Apply the theme immediately
    try {
      await chessboardThemeManager.applyTheme(theme)
    } catch (error) {
      console.error('Failed to apply theme:', error)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-background-1 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Chessboard Theme</h3>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-sm text-secondary">
          Choose your preferred chessboard style. Changes will apply to all
          chess boards across the platform.
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {THEME_OPTIONS.map((theme) => (
            <label
              key={theme.id}
              className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                settings.chessboardTheme === theme.id
                  ? 'border-primary bg-primary/10'
                  : 'border-background-3 bg-background-2 hover:border-background-3 hover:bg-background-3'
              }`}
            >
              <input
                type="radio"
                name="chessboard-theme"
                value={theme.id}
                checked={settings.chessboardTheme === theme.id}
                onChange={() => handleThemeChange(theme.id)}
                className="sr-only"
              />
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h4 className="font-medium">{theme.name}</h4>
                  <p className="text-sm text-secondary">{theme.description}</p>
                </div>
                {settings.chessboardTheme === theme.id && (
                  <span className="material-symbols-outlined text-primary">
                    check_circle
                  </span>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="rounded-lg bg-background-2 p-4">
          <p className="text-sm text-secondary">
            <span className="material-symbols-outlined mr-2 inline text-base">
              info
            </span>
            Theme changes take effect immediately and will be remembered across
            browser sessions.
          </p>
        </div>
      </div>
    </div>
  )
}
