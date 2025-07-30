import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { AnalyzedGame } from 'src/types'
import {
  streamLichessGame,
  createAnalyzedGameFromLichessStream,
  parseLichessStreamMove,
} from 'src/api/lichess/streaming'

export interface StreamState {
  isConnected: boolean
  isConnecting: boolean
  isLive: boolean
  error: string | null
  gameStarted: boolean
}

export interface ClockState {
  whiteTime: number // seconds
  blackTime: number // seconds
  activeColor: 'white' | 'black' | null
  lastUpdateTime: number // timestamp when clocks were last updated
}

export interface LichessStreamController {
  game: AnalyzedGame | null
  streamState: StreamState
  clockState: ClockState
  startStream: (gameId: string) => void
  stopStream: () => void
  reconnect: () => void
}

export const useLichessStreamController = (): LichessStreamController => {
  const [game, setGame] = useState<AnalyzedGame | null>(null)
  const [streamState, setStreamState] = useState<StreamState>({
    isConnected: false,
    isConnecting: false,
    isLive: false,
    error: null,
    gameStarted: false,
  })
  const [clockState, setClockState] = useState<ClockState>({
    whiteTime: 0,
    blackTime: 0,
    activeColor: null,
    lastUpdateTime: Date.now(),
  })

  const abortController = useRef<AbortController | null>(null)
  const currentGameId = useRef<string | null>(null)
  const streamMoves = useRef<any[]>([])
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 3
  const startStreamInternalRef = useRef<
    ((gameId: string) => Promise<void>) | null
  >(null)

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  const stopStream = useCallback(() => {
    clearReconnectTimeout()

    if (abortController.current) {
      abortController.current.abort()
      abortController.current = null
    }

    setStreamState({
      isConnected: false,
      isConnecting: false,
      isLive: false,
      error: null,
      gameStarted: false,
    })

    currentGameId.current = null
    streamMoves.current = []
    reconnectAttempts.current = 0

    // Reset clock state
    setClockState({
      whiteTime: 0,
      blackTime: 0,
      activeColor: null,
      lastUpdateTime: Date.now(),
    })
  }, [clearReconnectTimeout])

  const handleGameStart = useCallback((gameData: any) => {
    console.log('Game started:', gameData)

    // Create initial analyzed game from stream data
    const initialGame = createAnalyzedGameFromLichessStream(gameData)
    setGame(initialGame)

    setStreamState((prev) => ({
      ...prev,
      gameStarted: true,
      isLive: true,
      isConnected: true, // Set connected as soon as we receive game data
      isConnecting: false,
      error: null,
    }))

    // Reset reconnect attempts on successful connection
    reconnectAttempts.current = 0
  }, [])

  const handleMove = useCallback((moveData: any) => {
    console.log('New move:', moveData)

    // Add move to our tracking array
    streamMoves.current.push(moveData)

    // Update clock state if clock data is available
    if (moveData.wc !== undefined && moveData.bc !== undefined) {
      const currentFen = moveData.fen
      // Determine whose turn it is from the FEN (w = white, b = black)
      const activeColor = currentFen?.includes(' w ') ? 'white' : 'black'

      setClockState({
        whiteTime: moveData.wc,
        blackTime: moveData.bc,
        activeColor,
        lastUpdateTime: Date.now(),
      })
    }

    // Update the game state with the new move
    setGame((currentGame) => {
      // If we don't have a game yet, we need to wait for the initial game state
      // But sometimes Lichess doesn't send the initial state for ongoing games
      // So let's try to create a minimal game state if we have enough data
      if (!currentGame && moveData.fen) {
        console.log(
          'Creating minimal game from move data since no initial game received',
        )

        // Create a minimal game object to process moves
        const minimalGameData = {
          id: `live-${Date.now()}`,
          players: {
            white: { user: { name: 'White' } },
            black: { user: { name: 'Black' } },
          },
          fen: moveData.fen,
        }

        const newGame = createAnalyzedGameFromLichessStream(minimalGameData)

        // Set stream as connected since we're receiving data
        setStreamState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          gameStarted: true,
          isLive: true,
          error: null,
        }))

        // Try to parse the current move
        try {
          return parseLichessStreamMove(moveData, newGame)
        } catch (error) {
          console.error('Error parsing move on minimal game:', error)
          return newGame
        }
      }

      if (!currentGame) return currentGame

      try {
        return parseLichessStreamMove(moveData, currentGame)
      } catch (error) {
        console.error('Error parsing move:', error)
        setStreamState((prev) => ({
          ...prev,
          error: `Failed to parse move: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }))
        return currentGame
      }
    })

    // Play move sound (reuse existing audio)
    try {
      const audio = new Audio('/assets/sound/move.mp3')
      audio.play().catch((e) => console.log('Could not play move sound:', e))
    } catch (e) {
      // Ignore audio errors
    }
  }, [])

  const handleStreamComplete = useCallback(() => {
    console.log('Stream completed')

    setStreamState((prev) => ({
      ...prev,
      isConnected: false,
      isLive: false,
    }))

    // DO NOT automatically reconnect when stream completes
    // Stream completion is normal for finished games
    // Reconnection should only happen on explicit user action or network errors
  }, [])

  const startStreamInternal = useCallback(
    async (gameId: string) => {
      if (abortController.current) {
        abortController.current.abort()
      }

      abortController.current = new AbortController()
      currentGameId.current = gameId

      setStreamState((prev) => ({
        ...prev,
        isConnecting: true,
        error: null,
      }))

      try {
        // Start streaming directly - the stream API will handle invalid game IDs
        // Note: isConnected will be set when we receive the first data (in handleGameStart or handleMove)
        await streamLichessGame(
          gameId,
          handleGameStart,
          handleMove,
          handleStreamComplete,
          abortController.current.signal,
        )

        // Stream completed normally - this happens when the game ends or connection closes
        console.log('Stream completed')
      } catch (error) {
        console.error('Stream error:', error)

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown streaming error'

        setStreamState({
          isConnected: false,
          isConnecting: false,
          isLive: false,
          error: errorMessage,
          gameStarted: false,
        })

        abortController.current = null
      }
    },
    [handleGameStart, handleMove, handleStreamComplete],
  )

  // Update the ref whenever the function changes
  useEffect(() => {
    startStreamInternalRef.current = startStreamInternal
  }, [startStreamInternal])

  const startStream = useCallback(
    (gameId: string) => {
      // Reset state when starting a new stream
      streamMoves.current = []
      reconnectAttempts.current = 0
      clearReconnectTimeout()

      if (startStreamInternalRef.current) {
        startStreamInternalRef.current(gameId)
      }
    },
    [clearReconnectTimeout],
  )

  const reconnect = useCallback(() => {
    if (currentGameId.current && startStreamInternalRef.current) {
      // Check connecting state at call time instead of dependency
      setStreamState((prevState) => {
        if (!prevState.isConnecting) {
          reconnectAttempts.current = 0
          startStreamInternalRef.current!(currentGameId.current!)
        }
        return prevState
      })
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [stopStream])

  return useMemo(
    () => ({
      game,
      streamState,
      clockState,
      startStream,
      stopStream,
      reconnect,
    }),
    [game, streamState, clockState], // Only depend on actual state, not functions
  )
}
