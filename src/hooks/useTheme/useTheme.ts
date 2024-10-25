import { useCallback } from 'react'
import { useLocalStorage } from 'src/hooks'
import { Theme } from 'src/types'

const THEME = 'client:theme'

export const useTheme = (): [Theme, VoidFunction] => {
  const [theme, setTheme] = useLocalStorage<Theme>(THEME, 'dark')

  const toggleTheme = useCallback(
    () => setTheme(theme === 'light' ? 'dark' : 'light'),
    [setTheme, theme],
  )

  return [theme, toggleTheme]
}
