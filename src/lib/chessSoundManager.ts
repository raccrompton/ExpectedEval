/**
 * Global Chess Sound Manager
 *
 * Centralized audio management for chess moves with efficient resource pooling
 * and mobile-optimized performance.
 */

type SoundType = 'move' | 'capture'

interface AudioPool {
  move: HTMLAudioElement[]
  capture: HTMLAudioElement[]
}

class ChessSoundManager {
  private audioPool: AudioPool
  private readonly POOL_SIZE = 3 // Multiple instances for overlapping sounds
  private lastPlayTime = 0
  private readonly DEBOUNCE_MS = 100
  private isInitialized = false

  constructor() {
    this.audioPool = {
      move: [],
      capture: [],
    }
  }

  /**
   * Initialize audio pool - call this once when app starts
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Create audio pools
      for (let i = 0; i < this.POOL_SIZE; i++) {
        const moveAudio = new Audio('/assets/sound/move.mp3')
        const captureAudio = new Audio('/assets/sound/capture.mp3')

        // Preload audio
        moveAudio.preload = 'auto'
        captureAudio.preload = 'auto'

        // Add error handling
        moveAudio.addEventListener('error', (e) =>
          console.warn('Failed to load move sound:', e),
        )
        captureAudio.addEventListener('error', (e) =>
          console.warn('Failed to load capture sound:', e),
        )

        this.audioPool.move.push(moveAudio)
        this.audioPool.capture.push(captureAudio)
      }

      this.isInitialized = true
    } catch (error) {
      console.warn('Failed to initialize chess sound manager:', error)
    }
  }

  /**
   * Play chess move sound with debouncing and capture detection
   */
  public playMoveSound(isCapture = false): void {
    // Check if sounds are enabled in user settings
    if (typeof window !== 'undefined') {
      try {
        const settings = localStorage.getItem('maia-user-settings')
        if (settings) {
          const userSettings = JSON.parse(settings)
          if (!userSettings.soundEnabled) {
            return // Sound disabled in settings
          }
        }
      } catch (error) {
        // If settings parsing fails, continue with default behavior
        console.warn('Failed to read sound settings:', error)
      }
    }

    const now = Date.now()

    // Debounce rapid sounds
    if (now - this.lastPlayTime < this.DEBOUNCE_MS) {
      return
    }

    if (!this.isInitialized) {
      console.warn('ChessSoundManager not initialized')
      return
    }

    const soundType: SoundType = isCapture ? 'capture' : 'move'
    const audioPool = this.audioPool[soundType]

    if (audioPool.length === 0) {
      console.warn(`No ${soundType} audio available`)
      return
    }

    // Find available audio instance (not currently playing)
    let audioToPlay = audioPool.find((audio) => audio.paused || audio.ended)

    // If all are playing, use the first one (interrupt)
    if (!audioToPlay) {
      audioToPlay = audioPool[0]
    }

    try {
      // Reset audio to beginning
      audioToPlay.currentTime = 0

      // Play sound
      const playPromise = audioToPlay.play()

      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Handle autoplay restrictions (common on mobile)
          if (error.name !== 'AbortError') {
            console.warn(`Failed to play ${soundType} sound:`, error)
          }
        })
      }

      this.lastPlayTime = now
    } catch (error) {
      console.warn(`Error playing ${soundType} sound:`, error)
    }
  }

  /**
   * Cleanup resources when app shuts down
   */
  public cleanup(): void {
    Object.values(this.audioPool)
      .flat()
      .forEach((audio) => {
        audio.pause()
        audio.src = ''
        audio.load()
      })

    this.audioPool = { move: [], capture: [] }
    this.isInitialized = false
  }

  /**
   * Check if sound manager is ready
   */
  public get ready(): boolean {
    return this.isInitialized
  }
}

// Global singleton instance
export const chessSoundManager = new ChessSoundManager()

/**
 * React hook for chess sound management
 */
export const useChessSoundManager = () => {
  return {
    playMoveSound: chessSoundManager.playMoveSound.bind(chessSoundManager),
    ready: chessSoundManager.ready,
  }
}
