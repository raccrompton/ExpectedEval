/* eslint-disable @typescript-eslint/no-explicit-any */
import { Chess } from 'chess.ts'
import { AnalyzedGame, Player, StockfishEvaluation } from 'src/types'
import { GameTree } from 'src/types/base/tree'
import { AvailableMoves } from 'src/types/training'

// Re-use the readStream utility from analysis.ts
const readStream = (processLine: (data: any) => void) => (response: any) => {
  const stream = response.body.getReader()
  const matcher = /\r?\n/
  const decoder = new TextDecoder()
  let buf = ''

  const loop = () =>
    stream.read().then(({ done, value }: { done: boolean; value: any }) => {
      if (done) {
        if (buf.length > 0) processLine(JSON.parse(buf))
      } else {
        const chunk = decoder.decode(value, {
          stream: true,
        })
        buf += chunk

        const parts = (buf || '').split(matcher)
        buf = parts.pop() as string
        for (const i of parts.filter((p) => p)) processLine(JSON.parse(i))

        return loop()
      }
    })

  return loop()
}

// Get current Lichess TV game information
export const getLichessTVGame = async () => {
  const res = await fetch('https://lichess.org/api/tv/channels')
  if (!res.ok) {
    throw new Error('Failed to fetch Lichess TV data')
  }
  const data = await res.json()

  // Return the best game (highest rated players)
  const bestChannel = data.rapid
  if (!bestChannel?.gameId) {
    throw new Error('No TV game available')
  }

  return {
    gameId: bestChannel.gameId,
    white: bestChannel.user1,
    black: bestChannel.user2,
  }
}

// Get basic game information from Lichess API
export const getLichessGameInfo = async (gameId: string) => {
  const res = await fetch(`https://lichess.org/api/game/${gameId}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch game info for ${gameId}`)
  }
  return res.json()
}

// Stream live moves from a Lichess game
export const streamLichessGame = async (
  gameId: string,
  onGameStart: (data: any) => void,
  onMove: (data: any) => void,
  onComplete: () => void,
  abortSignal?: AbortSignal,
) => {
  console.log(`Starting stream for game ${gameId}`)

  const stream = fetch(`https://lichess.org/api/stream/game/${gameId}`, {
    signal: abortSignal,
    headers: {
      Accept: 'application/x-ndjson',
    },
  })

  let gameStarted = false

  const onMessage = (message: any) => {
    console.log('Raw message received:', message)

    if (message.id) {
      // This is the initial game state with full game info
      console.log('Game start message:', message)
      onGameStart(message)
      gameStarted = true
    } else if (message.uci || message.lm) {
      // This is a move - handle both formats: {"fen":"...", "uci":"e2e4"} or {"fen":"...", "lm":"e2e4"}
      // If we haven't received the initial game state yet, trigger game start with a minimal state
      if (!gameStarted) {
        console.log(
          'First move received without initial game state, creating minimal game',
        )
        onGameStart({
          id: gameId, // Use the gameId we're streaming
          players: {
            white: { user: { name: 'White' } },
            black: { user: { name: 'Black' } },
          },
          fen: message.fen,
        })
        gameStarted = true
      }

      onMove({
        fen: message.fen,
        uci: message.uci || message.lm,
        wc: message.wc,
        bc: message.bc,
      })
    } else if (message.fen && !message.uci && !message.lm) {
      // This is the initial position - could be the first message for a starting game
      console.log('Initial position received:', message)
      if (!gameStarted) {
        console.log('Initial position message, creating game')
        onGameStart({
          id: gameId,
          players: {
            white: { user: { name: 'White' } },
            black: { user: { name: 'Black' } },
          },
          fen: message.fen,
        })
        gameStarted = true
      }
    } else {
      console.log('Unknown message format:', message)
    }
  }

  try {
    const response = await stream

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('No response body')
    }

    await readStream(onMessage)(response).then(onComplete)
  } catch (error) {
    if (abortSignal?.aborted) {
      console.log('Stream aborted')
    } else {
      console.error('Stream error:', error)
      throw error
    }
  }
}

// Convert Lichess game data to our AnalyzedGame format for live streaming
export const createAnalyzedGameFromLichessStream = (
  gameData: any,
): AnalyzedGame => {
  const { players, id } = gameData

  const whitePlayer: Player = {
    name: players?.white?.user?.name || 'White',
    rating: players?.white?.rating,
  }

  const blackPlayer: Player = {
    name: players?.black?.user?.name || 'Black',
    rating: players?.black?.rating,
  }

  // Use the starting position as our tree root - we'll build moves incrementally
  const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  // Build moves array with just the initial position for now
  // Moves will be added as they come in via the stream
  const gameStates = [
    {
      board: startingFen,
      lastMove: undefined as [string, string] | undefined,
      san: undefined as string | undefined,
      check: false as const,
      maia_values: {},
    },
  ]

  // Create game tree starting from the beginning
  const tree = new GameTree(startingFen)

  return {
    id: `stream-${id}`,
    blackPlayer,
    whitePlayer,
    moves: gameStates,
    availableMoves: new Array(gameStates.length).fill({}) as AvailableMoves[],
    gameType: 'blitz', // Default to blitz, could be detected from game data
    termination: {
      result: '*', // Live game in progress
      winner: undefined,
      condition: 'Live',
    },
    maiaEvaluations: new Array(gameStates.length).fill({}),
    stockfishEvaluations: new Array(gameStates.length).fill(undefined) as (
      | StockfishEvaluation
      | undefined
    )[],
    tree,
    type: 'stream' as const, // Use stream type for live streams
  } as AnalyzedGame
}

// Parse a move from the Lichess stream format and update game state
export const parseLichessStreamMove = (
  moveData: any,
  currentGame: AnalyzedGame,
) => {
  const { uci, fen } = moveData

  if (!uci || !fen || !currentGame.tree) {
    return currentGame
  }

  // Convert UCI to SAN notation using chess.js
  let san = uci // Fallback to UCI
  try {
    // Get the position before this move by finding the last node in the tree
    let beforeMoveNode = currentGame.tree.getRoot()
    while (beforeMoveNode.mainChild) {
      beforeMoveNode = beforeMoveNode.mainChild
    }

    const chess = new Chess(beforeMoveNode.fen)
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4] ? (uci[4] as any) : undefined,
    })

    if (move) {
      san = move.san
    }
  } catch (error) {
    console.warn('Could not convert UCI to SAN:', error)
    // Keep UCI as fallback
  }

  // Create new move object
  const newMove = {
    board: fen,
    lastMove: [uci.slice(0, 2), uci.slice(2, 4)] as [string, string],
    san: san,
    check: false as const, // We'd need to calculate this from the FEN
    maia_values: {},
  }

  // Add to moves array
  const updatedMoves = [...currentGame.moves, newMove]

  // Add to tree mainline - find the last node in the main line
  let currentNode = currentGame.tree.getRoot()
  while (currentNode.mainChild) {
    currentNode = currentNode.mainChild
  }

  try {
    currentGame.tree.addMainMove(currentNode, fen, uci, san)
  } catch (error) {
    console.error('Error adding move to tree:', error)
    // Return current game if tree update fails
    return currentGame
  }

  // Update available moves and evaluations arrays
  const updatedAvailableMoves = [...currentGame.availableMoves, {}]
  const updatedMaiaEvaluations = [...currentGame.maiaEvaluations, {}]
  const updatedStockfishEvaluations = [
    ...currentGame.stockfishEvaluations,
    undefined,
  ] as (StockfishEvaluation | undefined)[]

  return {
    ...currentGame,
    moves: updatedMoves,
    availableMoves: updatedAvailableMoves,
    maiaEvaluations: updatedMaiaEvaluations,
    stockfishEvaluations: updatedStockfishEvaluations,
  }
}
