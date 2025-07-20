/**
 * Settings Management Utilities
 *
 * Utilities for managing user preferences stored in localStorage
 */

export interface UserSettings {
  soundEnabled: boolean
  chessboardTheme: 'brown' | 'cburnett'
}

const SETTINGS_KEY = 'maia-user-settings'

const DEFAULT_SETTINGS: UserSettings = {
  soundEnabled: true,
  chessboardTheme: 'brown',
}

/**
 * Get user settings from localStorage with defaults
 */
export const getUserSettings = (): UserSettings => {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS
  }

  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (!stored) {
      return DEFAULT_SETTINGS
    }

    const parsed = JSON.parse(stored) as Partial<UserSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    }
  } catch (error) {
    console.warn('Failed to parse user settings from localStorage:', error)
    return DEFAULT_SETTINGS
  }
}

/**
 * Save user settings to localStorage
 */
export const saveUserSettings = (settings: UserSettings): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (error) {
    console.warn('Failed to save user settings to localStorage:', error)
  }
}

/**
 * Update a specific setting
 */
export const updateUserSetting = <K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K],
): void => {
  const currentSettings = getUserSettings()
  const newSettings = {
    ...currentSettings,
    [key]: value,
  }
  saveUserSettings(newSettings)
}
