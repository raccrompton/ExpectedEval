import { useContext } from 'react'
import { ThemeContext } from 'src/contexts'

import styles from './ThemeButton.module.scss'
import { SunIcon, MoonIcon } from 'src/components/Icons/icons'

export const ThemeButton = () => {
  const { theme, toggleTheme } = useContext(ThemeContext)
  return (
    <button
      className={styles.button}
      onClick={toggleTheme}
      title={theme === 'light' ? 'Turn off the lights' : 'Turn on the lights'}
    >
      {theme === 'light' ? MoonIcon : SunIcon}
    </button>
  )
}
