import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Chess } from 'chess.ts'
import { GameTree } from 'src/types/base/tree'
import { AvailableMoves } from 'src/types/training'
import {
  Broadcast,
  BroadcastRound,
  BroadcastGame,
  BroadcastRoundData,
  BroadcastState,
  BroadcastStreamController,
  LiveGame,
} from 'src/types'
import {
  getLichessBroadcasts,
  streamBroadcastRound,
  parsePGNData,
} from 'src/api/lichess/broadcasts'

export const useBroadcastController = (): BroadcastStreamController => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [currentBroadcast, setCurrentBroadcast] = useState<Broadcast | null>(
    null,
  )
  const [currentRound, setCurrentRound] = useState<BroadcastRound | null>(null)
  const [currentGame, setCurrentGame] = useState<BroadcastGame | null>(null)
  const [roundData, setRoundData] = useState<BroadcastRoundData | null>(null)
  const [broadcastState, setBroadcastState] = useState<BroadcastState>({
    isConnected: false,
    isConnecting: false,
    isLive: false,
    error: null,
    roundStarted: false,
    roundEnded: false,
    gameEnded: false,
  })

  const abortController = useRef<AbortController | null>(null)
  const currentRoundId = useRef<string | null>(null)
  const gameStates = useRef<Map<string, LiveGame>>(new Map())
  const lastPGNData = useRef<string>('')

  const loadBroadcasts = useCallback(async () => {
    try {
      setBroadcastState((prev) => ({
        ...prev,
        isConnecting: true,
        error: null,
      }))
      const broadcastList = await getLichessBroadcasts()
      setBroadcasts(broadcastList)
      setBroadcastState((prev) => ({ ...prev, isConnecting: false }))
    } catch (error) {
      console.error('Error loading broadcasts:', error)
      setBroadcastState((prev) => ({
        ...prev,
        isConnecting: false,
        error:
          error instanceof Error ? error.message : 'Failed to load broadcasts',
      }))
    }
  }, [])

  const selectBroadcast = useCallback(
    (broadcastId: string) => {
      const broadcast = broadcasts.find((b) => b.tour.id === broadcastId)
      if (broadcast) {
        setCurrentBroadcast(broadcast)
        // Auto-select default round if available
        const defaultRound =
          broadcast.rounds.find((r) => r.id === broadcast.defaultRoundId) ||
          broadcast.rounds.find((r) => r.ongoing) ||
          broadcast.rounds[0]
        if (defaultRound) {
          setCurrentRound(defaultRound)
        }
      }
    },
    [broadcasts],
  )

  const selectRound = useCallback(
    (roundId: string) => {
      if (currentBroadcast) {
        const round = currentBroadcast.rounds.find((r) => r.id === roundId)
        if (round) {
          setCurrentRound(round)
          // Stop current stream if different round
          if (currentRoundId.current !== roundId) {
            stopRoundStream()
          }
        }
      }
    },
    [currentBroadcast],
  )

  const selectGame = useCallback(
    (gameId: string) => {
      if (roundData) {
        const game = roundData.games.get(gameId)
        if (game) {
          setCurrentGame(game)
        }
      }
    },
    [roundData],
  )

  const stopRoundStream = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort()
      abortController.current = null
    }

    setBroadcastState({
      isConnected: false,
      isConnecting: false,
      isLive: false,
      error: null,
      roundStarted: false,
      roundEnded: false,
      gameEnded: false,
    })

    currentRoundId.current = null
    gameStates.current.clear()
    lastPGNData.current = ''
  }, [])

  const createLiveGameFromBroadcastGame = useCallback(
    (broadcastGame: BroadcastGame): LiveGame => {
      const startingFen =
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

      // Build game tree from moves
      const tree = new GameTree(startingFen)
      const chess = new Chess(startingFen)
      let currentNode = tree.getRoot()

      const gameStates = [
        {
          board: startingFen,
          lastMove: undefined as [string, string] | undefined,
          san: undefined as string | undefined,
          check: false,
          maia_values: {},
        },
      ]

      // Process each move
      for (const moveStr of broadcastGame.moves) {
        try {
          const move = chess.move(moveStr)
          if (move) {
            const newFen = chess.fen()
            const uci =
              move.from + move.to + (move.promotion ? move.promotion : '')

            gameStates.push({
              board: newFen,
              lastMove: [move.from, move.to],
              san: move.san,
              check: chess.inCheck(),
              maia_values: {},
            })

            currentNode = tree.addMainMove(currentNode, newFen, uci, move.san)
          }
        } catch (error) {
          console.warn(`Error processing move ${moveStr}:`, error)
          break
        }
      }

      return {
        id: broadcastGame.id,
        blackPlayer: {
          name: broadcastGame.black,
          rating: broadcastGame.blackElo,
        },
        whitePlayer: {
          name: broadcastGame.white,
          rating: broadcastGame.whiteElo,
        },
        gameType: 'broadcast',
        type: 'stream' as const,
        moves: gameStates,
        availableMoves: new Array(gameStates.length).fill(
          {},
        ) as AvailableMoves[],
        termination:
          broadcastGame.result === '*'
            ? undefined
            : {
                result: broadcastGame.result,
                winner:
                  broadcastGame.result === '1-0'
                    ? 'white'
                    : broadcastGame.result === '0-1'
                      ? 'black'
                      : 'none',
              },
        maiaEvaluations: [],
        stockfishEvaluations: [],
        loadedFen: broadcastGame.fen,
        loaded: true,
        tree,
      } as LiveGame
    },
    [],
  )

  const handlePGNUpdate = useCallback(
    (pgnData: string) => {
      // Skip if it's the same data we already processed
      if (pgnData === lastPGNData.current) {
        return
      }

      lastPGNData.current = pgnData

      const parseResult = parsePGNData(pgnData)

      if (parseResult.errors.length > 0) {
        console.warn('PGN parsing errors:', parseResult.errors)
      }

      if (parseResult.games.length === 0) {
        return
      }

      // Update round data
      const newGames = new Map<string, BroadcastGame>()
      const updatedGameStates = new Map<string, LiveGame>()
      let hasNewMoves = false

      for (const game of parseResult.games) {
        newGames.set(game.id, game)

        // Check if this game has new moves compared to our stored state
        const existingGameState = gameStates.current.get(game.id)
        const newLiveGame = createLiveGameFromBroadcastGame(game)

        if (
          !existingGameState ||
          existingGameState.moves.length !== newLiveGame.moves.length
        ) {
          hasNewMoves = true

          // Play sound for new moves if game was already loaded
          if (
            existingGameState &&
            newLiveGame.moves.length > existingGameState.moves.length
          ) {
            try {
              const audio = new Audio('/assets/sound/move.mp3')
              audio
                .play()
                .catch((e) => console.log('Could not play move sound:', e))
            } catch (e) {}
          }
        }

        updatedGameStates.set(game.id, newLiveGame)
      }

      gameStates.current = updatedGameStates

      setRoundData((prev) => {
        const newRoundData: BroadcastRoundData = {
          roundId: currentRoundId.current || '',
          broadcastId: currentBroadcast?.tour.id || '',
          games: newGames,
          lastUpdate: Date.now(),
        }
        return newRoundData
      })

      // Update current game if it exists in the new data
      if (currentGame) {
        const updatedCurrentGame = newGames.get(currentGame.id)
        if (updatedCurrentGame) {
          setCurrentGame(updatedCurrentGame)
        }
      } else if (parseResult.games.length > 0) {
        // Auto-select first game if none selected
        setCurrentGame(parseResult.games[0])
      }

      // Update broadcast state
      setBroadcastState((prev) => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        isLive: true,
        roundStarted: true,
        error: null,
      }))
    },
    [currentBroadcast, currentGame, createLiveGameFromBroadcastGame],
  )

  const handleStreamComplete = useCallback(() => {
    setBroadcastState((prev) => ({
      ...prev,
      isConnected: false,
      isLive: false,
      roundEnded: true,
      gameEnded: true,
    }))
  }, [])

  const startRoundStream = useCallback(
    async (roundId: string) => {
      if (abortController.current) {
        abortController.current.abort()
      }

      abortController.current = new AbortController()
      currentRoundId.current = roundId

      setBroadcastState((prev) => ({
        ...prev,
        isConnecting: true,
        error: null,
      }))

      try {
        await streamBroadcastRound(
          roundId,
          handlePGNUpdate,
          handleStreamComplete,
          abortController.current.signal,
        )
      } catch (error) {
        console.error('Round stream error:', error)

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown streaming error'

        setBroadcastState({
          isConnected: false,
          isConnecting: false,
          isLive: false,
          error: errorMessage,
          roundStarted: false,
          roundEnded: false,
          gameEnded: false,
        })

        abortController.current = null
      }
    },
    [handlePGNUpdate, handleStreamComplete],
  )

  const reconnect = useCallback(() => {
    if (currentRoundId.current) {
      startRoundStream(currentRoundId.current)
    }
  }, [startRoundStream])

  // Auto-start stream when round is selected and ongoing
  useEffect(() => {
    if (
      currentRound?.ongoing &&
      !broadcastState.isConnecting &&
      !broadcastState.isConnected
    ) {
      startRoundStream(currentRound.id)
    }
  }, [
    currentRound,
    broadcastState.isConnecting,
    broadcastState.isConnected,
    startRoundStream,
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRoundStream()
    }
  }, [stopRoundStream])

  // Get current live game state for the selected game
  const currentLiveGame = useMemo(() => {
    if (currentGame && gameStates.current.has(currentGame.id)) {
      return gameStates.current.get(currentGame.id) || null
    }
    return null
  }, [currentGame, roundData?.lastUpdate])

  return {
    broadcasts,
    currentBroadcast,
    currentRound,
    currentGame,
    roundData,
    broadcastState,
    loadBroadcasts,
    selectBroadcast,
    selectRound,
    selectGame,
    startRoundStream,
    stopRoundStream,
    reconnect,
    currentLiveGame,
  } as BroadcastStreamController & { currentLiveGame: LiveGame | null }
}
