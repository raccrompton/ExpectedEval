type SoundType = 'move' | 'capture'

interface AudioPool {
  move: HTMLAudioElement[]
  capture: HTMLAudioElement[]
}

class ChessSoundManager {
  private audioPool: AudioPool
  private readonly POOL_SIZE = 3
  private lastPlayTime = 0
  private readonly DEBOUNCE_MS = 100
  private isInitialized = false

  constructor() {
    this.audioPool = {
      move: [],
      capture: [],
    }
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      for (let i = 0; i < this.POOL_SIZE; i++) {
        const moveAudio = new Audio('/assets/sound/move.mp3')
        const captureAudio = new Audio('/assets/sound/capture.mp3')

        moveAudio.preload = 'auto'
        captureAudio.preload = 'auto'

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

  public playMoveSound(isCapture = false): void {
    if (typeof window !== 'undefined') {
      try {
        const settings = localStorage.getItem('maia-user-settings')
        if (settings) {
          const userSettings = JSON.parse(settings)
          if (!userSettings.soundEnabled) {
            return
          }
        }
      } catch (error) {
        console.warn('Failed to read sound settings:', error)
      }
    }

    const now = Date.now()

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

    let audioToPlay = audioPool.find((audio) => audio.paused || audio.ended)

    if (!audioToPlay) {
      audioToPlay = audioPool[0]
    }

    try {
      audioToPlay.currentTime = 0

      const playPromise = audioToPlay.play()

      if (playPromise !== undefined) {
        playPromise.catch((error) => {
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

  public get ready(): boolean {
    return this.isInitialized
  }
}

export const chessSoundManager = new ChessSoundManager()

export const useChessSoundManager = () => {
  return {
    playMoveSound: chessSoundManager.playMoveSound.bind(chessSoundManager),
    ready: chessSoundManager.ready,
  }
}
