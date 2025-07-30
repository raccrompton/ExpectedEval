import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  ClockState,
  LiveGame,
  StreamState,
  StreamedMove,
  StreamedGame,
} from 'src/types'
import {
  streamLichessGame,
  createAnalyzedGameFromLichessStream,
  parseLichessStreamMove,
} from 'src/api/lichess/streaming'

export interface LichessStreamController {
  game: LiveGame | undefined
  streamState: StreamState
  clockState: ClockState
  startStream: (gameId: string) => void
  stopStream: () => void
  reconnect: () => void
}

export const useLichessStreamController = (): LichessStreamController => {
  const [game, setGame] = useState<LiveGame>()
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
  const streamMoves = useRef<StreamedMove[]>([])
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
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

  const handleGameStart = useCallback(
    (gameData: StreamedGame) => {
      if (game?.id === gameData.id) {
        // if the game is already loaded, this is a game termination message
        setGame((prev) => {
          if (!prev) return prev

          return {
            ...prev,
            termination: {
              winner: gameData.winner ?? 'none',
              result: gameData.winner ?? 'none',
            },
          }
        })
        return
      }

      const parsedGame = createAnalyzedGameFromLichessStream(gameData)

      setGame(parsedGame)

      setStreamState((prev) => ({
        ...prev,
        gameStarted: true,
        isLive: true,
        isConnected: true,
        isConnecting: false,
        error: null,
      }))
    },
    [game],
  )

  const handleMove = useCallback(
    (moveData: StreamedMove) => {
      console.log('HANDLE MOVE:', moveData)

      streamMoves.current.push(moveData)

      if (moveData.wc !== undefined && moveData.bc !== undefined) {
        const currentFen = moveData.fen
        const activeColor = currentFen?.includes(' w ') ? 'white' : 'black'

        setClockState({
          whiteTime: moveData.wc,
          blackTime: moveData.bc,
          activeColor,
          lastUpdateTime: Date.now(),
        })
      }

      setGame((prev) => {
        if (!prev) return prev

        if (prev.loaded) {
          try {
            const audio = new Audio('/assets/sound/move.mp3')
            audio
              .play()
              .catch((e) => console.log('Could not play move sound:', e))
          } catch (e) {}
        }

        try {
          const newGame = parseLichessStreamMove(moveData, prev)

          if (!newGame.loaded) {
            if (newGame.loadedFen === moveData.fen) {
              console.log('LOADED GAME')
            }
          }

          return {
            ...newGame,
            loaded: newGame.loaded
              ? newGame.loaded
              : prev.loadedFen === moveData.fen,
          }
        } catch (e) {
          console.error('Error parsing move:', e)
          return prev
        }
      })
    },
    [game],
  )

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

  useEffect(() => {
    startStreamInternalRef.current = startStreamInternal
  }, [startStreamInternal])

  const startStream = useCallback(
    (gameId: string) => {
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
      const startRef = startStreamInternalRef.current
      const gameId = currentGameId.current

      // Check connecting state at call time instead of dependency
      setStreamState((prevState) => {
        if (!prevState.isConnecting) {
          reconnectAttempts.current = 0
          startRef(gameId)
        }
        return prevState
      })
    }
  }, [])

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
    [game, streamState, clockState],
  )
}
