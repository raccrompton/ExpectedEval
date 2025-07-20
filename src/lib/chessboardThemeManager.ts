/**
 * Chessboard Theme Manager
 *
 * Manages dynamic loading of chessground themes based on user preferences
 */

export type ChessboardTheme = 'brown' | 'cburnett'

interface ThemeStylesheets {
  [key: string]: HTMLLinkElement
}

class ChessboardThemeManager {
  private loadedThemes: ThemeStylesheets = {}
  private currentTheme: ChessboardTheme | null = null

  /**
   * Initialize the theme manager and load the user's preferred theme
   */
  public async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      return
    }

    // Preload base chessground styles
    await this.loadTheme(
      'base',
      '/node_modules/chessground/assets/chessground.base.css',
    )

    // Load user's preferred theme
    const userTheme = this.getUserTheme()
    await this.applyTheme(userTheme)
  }

  /**
   * Get the user's preferred theme from settings
   */
  private getUserTheme(): ChessboardTheme {
    if (typeof window === 'undefined') {
      return 'brown'
    }

    try {
      const settings = localStorage.getItem('maia-user-settings')
      if (settings) {
        const userSettings = JSON.parse(settings)
        return userSettings.chessboardTheme || 'brown'
      }
    } catch (error) {
      console.warn('Failed to read theme settings:', error)
    }

    return 'brown'
  }

  /**
   * Load a specific theme stylesheet
   */
  private async loadTheme(theme: string, href: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (this.loadedThemes[theme]) {
        resolve()
        return
      }

      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.onload = () => {
        this.loadedThemes[theme] = link
        resolve()
      }
      link.onerror = reject

      document.head.appendChild(link)
    })
  }

  /**
   * Apply a theme by loading it and disabling others
   */
  public async applyTheme(theme: ChessboardTheme): Promise<void> {
    if (typeof window === 'undefined') {
      return
    }

    // Define theme mappings
    const themeMap: Record<ChessboardTheme, string> = {
      brown: '/node_modules/chessground/assets/chessground.brown.css',
      cburnett: '/node_modules/chessground/assets/chessground.cburnett.css',
    }

    try {
      // Load the new theme
      await this.loadTheme(theme, themeMap[theme])

      // Disable all other theme stylesheets
      Object.entries(this.loadedThemes).forEach(([themeName, stylesheet]) => {
        if (themeName !== 'base' && themeName !== theme) {
          stylesheet.disabled = true
        } else {
          stylesheet.disabled = false
        }
      })

      this.currentTheme = theme
      console.log(`Applied chessboard theme: ${theme}`)
    } catch (error) {
      console.error(`Failed to apply theme ${theme}:`, error)
    }
  }

  /**
   * Get the currently active theme
   */
  public getCurrentTheme(): ChessboardTheme | null {
    return this.currentTheme
  }

  /**
   * Clean up loaded themes
   */
  public cleanup(): void {
    Object.values(this.loadedThemes).forEach((stylesheet) => {
      if (stylesheet.parentNode) {
        stylesheet.parentNode.removeChild(stylesheet)
      }
    })
    this.loadedThemes = {}
    this.currentTheme = null
  }
}

// Global singleton instance
export const chessboardThemeManager = new ChessboardThemeManager()

/**
 * React hook for theme management
 */
export const useChessboardTheme = () => {
  return {
    applyTheme: chessboardThemeManager.applyTheme.bind(chessboardThemeManager),
    getCurrentTheme: chessboardThemeManager.getCurrentTheme.bind(
      chessboardThemeManager,
    ),
  }
}
