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
  BroadcastSection,
  LiveGame,
} from 'src/types'
import {
  getLichessBroadcasts,
  getLichessTopBroadcasts,
  convertTopBroadcastToBroadcast,
  getBroadcastRoundPGN,
  streamBroadcastRound,
  parsePGNData,
} from 'src/api/lichess/broadcasts'

export const useBroadcastController = (): BroadcastStreamController => {
  const [broadcastSections, setBroadcastSections] = useState<
    BroadcastSection[]
  >([])
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

      // Load both official and top broadcasts concurrently
      const [officialBroadcasts, topBroadcasts] = await Promise.all([
        getLichessBroadcasts(),
        getLichessTopBroadcasts(),
      ])

      // Organize broadcasts into sections
      const sections: BroadcastSection[] = []

      // Official active broadcasts
      const officialActive = officialBroadcasts.filter((b) =>
        b.rounds.some((r) => r.ongoing),
      )
      if (officialActive.length > 0) {
        sections.push({
          title: 'Official Live Tournaments',
          broadcasts: officialActive,
          type: 'official-active',
        })
      }

      // Top active broadcasts (unofficial)
      const unofficialActive = topBroadcasts.active
        .map(convertTopBroadcastToBroadcast)
        .filter(
          (b) =>
            !officialActive.some((official) => official.tour.id === b.tour.id),
        )
      if (unofficialActive.length > 0) {
        sections.push({
          title: 'Community Live Broadcasts',
          broadcasts: unofficialActive,
          type: 'unofficial-active',
        })
      }

      // Official upcoming broadcasts
      const officialUpcoming = officialBroadcasts.filter(
        (b) =>
          b.rounds.every((r) => !r.ongoing) &&
          b.rounds.some((r) => r.startsAt > Date.now()),
      )
      if (officialUpcoming.length > 0) {
        sections.push({
          title: 'Upcoming Official Tournaments',
          broadcasts: officialUpcoming,
          type: 'official-upcoming',
        })
      }

      // Top upcoming broadcasts (unofficial)
      const unofficialUpcoming = topBroadcasts.upcoming.map(
        convertTopBroadcastToBroadcast,
      )
      if (unofficialUpcoming.length > 0) {
        sections.push({
          title: 'Upcoming Community Broadcasts',
          broadcasts: unofficialUpcoming,
          type: 'unofficial-upcoming',
        })
      }

      // Past broadcasts (mix of official and top)
      const officialPast = officialBroadcasts.filter(
        (b) =>
          b.rounds.every((r) => !r.ongoing) &&
          b.rounds.every((r) => r.startsAt <= Date.now()),
      )
      const pastBroadcasts = [
        ...officialPast,
        ...topBroadcasts.past.currentPageResults.map(
          convertTopBroadcastToBroadcast,
        ),
      ]
      if (pastBroadcasts.length > 0) {
        sections.push({
          title: 'Recent Tournaments',
          broadcasts: pastBroadcasts,
          type: 'past',
        })
      }

      setBroadcastSections(sections)
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
      // Find broadcast across all sections
      let broadcast: Broadcast | undefined
      for (const section of broadcastSections) {
        broadcast = section.broadcasts.find((b) => b.tour.id === broadcastId)
        if (broadcast) break
      }
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
    [broadcastSections],
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
      console.log('Processing PGN update with length:', pgnData.length)

      const parseResult = parsePGNData(pgnData)
      console.log('Parsed games count:', parseResult.games.length)
      console.log(
        'Game IDs:',
        parseResult.games.map((g) => `${g.white} vs ${g.black}`),
      )

      if (parseResult.errors.length > 0) {
        console.warn('PGN parsing errors:', parseResult.errors)
      }

      if (parseResult.games.length === 0) {
        console.warn('No games found in PGN data')
        return
      }

      // Determine if this is initial load (multiple games) or update (single game)
      const isInitialLoad = parseResult.games.length > 1
      console.log('Is initial load:', isInitialLoad)

      setRoundData((prevRoundData) => {
        // Start with existing games
        const existingGames =
          prevRoundData?.games || new Map<string, BroadcastGame>()
        const updatedGames = new Map(existingGames)

        // Process new/updated games
        for (const game of parseResult.games) {
          updatedGames.set(game.id, game)

          // Update game states
          const existingGameState = gameStates.current.get(game.id)
          const newLiveGame = createLiveGameFromBroadcastGame(game)

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

          gameStates.current.set(game.id, newLiveGame)
        }

        console.log('Updated games map, now has', updatedGames.size, 'games')

        const newRoundData: BroadcastRoundData = {
          roundId: currentRoundId.current || '',
          broadcastId: currentBroadcast?.tour.id || '',
          games: updatedGames,
          lastUpdate: Date.now(),
        }
        return newRoundData
      })

      // Update current game if it exists in the new data
      if (currentGame) {
        const updatedGame = parseResult.games.find(
          (g) => g.id === currentGame.id,
        )
        if (updatedGame) {
          setCurrentGame(updatedGame)
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
        // Start streaming - this will send all games initially, then updates
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
    broadcastSections,
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
