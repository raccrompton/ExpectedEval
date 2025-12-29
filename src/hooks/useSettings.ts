/**
 * useSettings Hook
 *
 * Manages application settings with localStorage persistence.
 * Settings are stored under the key 'expectedeval-settings'.
 */

import { useState, useEffect, useCallback } from 'react'
import type { EWConfig } from '@/core/analysis'
import { DEFAULT_EW_CONFIG } from '@/core/analysis'

const STORAGE_KEY = 'expectedeval-settings'

export interface SettingsState {
  probabilityThreshold: number
  winrateLossThreshold: number
  maiaLevel: number
  stockfishDepth: number
}

export interface UseSettingsReturn {
  settings: SettingsState
  updateSetting: <K extends keyof SettingsState>(_key: K, _value: SettingsState[K]) => void
  updateSettings: (_partial: Partial<SettingsState>) => void
  resetSettings: () => void
  getEWConfig: () => EWConfig
}

const DEFAULT_SETTINGS: SettingsState = {
  probabilityThreshold: DEFAULT_EW_CONFIG.probabilityThreshold,
  winrateLossThreshold: DEFAULT_EW_CONFIG.winrateLossThreshold,
  maiaLevel: DEFAULT_EW_CONFIG.maiaLevel,
  stockfishDepth: DEFAULT_EW_CONFIG.stockfishDepth,
}

function loadSettingsFromStorage(): SettingsState {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return DEFAULT_SETTINGS
    }

    const parsed = JSON.parse(stored)

    return {
      probabilityThreshold:
        typeof parsed.probabilityThreshold === 'number'
          ? parsed.probabilityThreshold
          : DEFAULT_SETTINGS.probabilityThreshold,
      winrateLossThreshold:
        typeof parsed.winrateLossThreshold === 'number'
          ? parsed.winrateLossThreshold
          : DEFAULT_SETTINGS.winrateLossThreshold,
      maiaLevel:
        typeof parsed.maiaLevel === 'number'
          ? parsed.maiaLevel
          : DEFAULT_SETTINGS.maiaLevel,
      stockfishDepth:
        typeof parsed.stockfishDepth === 'number'
          ? parsed.stockfishDepth
          : DEFAULT_SETTINGS.stockfishDepth,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettingsToStorage(settings: SettingsState): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Hook for managing application settings.
 *
 * Settings are automatically persisted to localStorage.
 *
 * @example
 * function SettingsPanel() {
 *   const { settings, updateSetting } = useSettings()
 *
 *   return (
 *     <select
 *       value={settings.maiaLevel}
 *       onChange={(e) => updateSetting('maiaLevel', Number(e.target.value))}
 *     >
 *       <option value="1100">1100</option>
 *       <option value="1500">1500</option>
 *       <option value="1900">1900</option>
 *     </select>
 *   )
 * }
 */
export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const loaded = loadSettingsFromStorage()
    setSettings(loaded)
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated) {
      saveSettingsToStorage(settings)
    }
  }, [settings, isHydrated])

  const updateSetting = useCallback(
    <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
      setSettings((prev) => ({
        ...prev,
        [key]: value,
      }))
    },
    []
  )

  const updateSettings = useCallback((partial: Partial<SettingsState>) => {
    setSettings((prev) => ({
      ...prev,
      ...partial,
    }))
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const getEWConfig = useCallback((): EWConfig => {
    return {
      ...DEFAULT_EW_CONFIG,
      probabilityThreshold: settings.probabilityThreshold,
      winrateLossThreshold: settings.winrateLossThreshold,
      maiaLevel: settings.maiaLevel,
      stockfishDepth: settings.stockfishDepth,
    }
  }, [settings])

  return {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    getEWConfig,
  }
}
