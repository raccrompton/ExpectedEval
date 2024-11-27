import { useContext } from 'react'
import { ThemeContext } from 'src/contexts'

import { SunIcon, MoonIcon } from 'src/components/Icons/icons'

export const ThemeButton = () => {
  const { theme, toggleTheme } = useContext(ThemeContext)
  return (
    <button
      className="cursor-pointer border-none bg-transparent p-0 outline-none *:h-5 *:w-5 *:fill-primary *:transition *:duration-200 hover:*:fill-human-2"
      onClick={toggleTheme}
      title={theme === 'light' ? 'Turn off the lights' : 'Turn on the lights'}
    >
      {theme === 'light' ? MoonIcon : SunIcon}
    </button>
  )
}
