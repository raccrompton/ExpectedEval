/**
 * SettingsContext
 *
 * Provides application settings to all components.
 * Settings are persisted to localStorage.
 */

import { createContext, useContext, type ReactNode } from 'react'
import { useSettings, type SettingsState, type UseSettingsReturn } from '@/hooks/useSettings'

const SettingsContext = createContext<UseSettingsReturn | null>(null)

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const settings = useSettings()

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettingsContext(): UseSettingsReturn {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettingsContext must be used within a SettingsProvider')
  }
  return context
}

export type { SettingsState }
