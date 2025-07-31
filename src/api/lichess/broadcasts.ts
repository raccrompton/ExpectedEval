import {
  Broadcast,
  BroadcastGame,
  PGNParseResult,
  TopBroadcastsResponse,
  TopBroadcastItem,
} from 'src/types'

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

export const getLichessBroadcasts = async (): Promise<Broadcast[]> => {
  const response = await fetch('https://lichess.org/api/broadcast', {
    headers: {
      Accept: 'application/x-ndjson',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  if (!response.body) {
    throw new Error('No response body')
  }

  const broadcasts: Broadcast[] = []

  return new Promise((resolve, reject) => {
    const onMessage = (message: any) => {
      try {
        broadcasts.push(message as Broadcast)
      } catch (error) {
        console.error('Error parsing broadcast message:', error)
      }
    }

    const onComplete = () => {
      resolve(broadcasts)
    }

    readStream(onMessage)(response).then(onComplete).catch(reject)
  })
}

export const getLichessTopBroadcasts =
  async (): Promise<TopBroadcastsResponse> => {
    const response = await fetch('https://lichess.org/api/broadcast/top', {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

export const convertTopBroadcastToBroadcast = (
  item: TopBroadcastItem,
): Broadcast => {
  return {
    tour: item.tour,
    rounds: [item.round],
    defaultRoundId: item.round.id,
  }
}

export const streamBroadcastRound = async (
  roundId: string,
  onPGNUpdate: (pgn: string) => void,
  onComplete: () => void,
  abortSignal?: AbortSignal,
) => {
  const stream = fetch(
    `https://lichess.org/api/stream/broadcast/round/${roundId}.pgn`,
    {
      signal: abortSignal,
      headers: {
        Accept: 'application/x-chess-pgn',
      },
    },
  )

  const onMessage = (data: string) => {
    if (data.trim()) {
      onPGNUpdate(data)
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

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        if (buffer.trim()) {
          onMessage(buffer)
        }
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk

      // Split on double newlines to separate PGN games
      const parts = buffer.split('\n\n\n')
      buffer = parts.pop() || ''

      for (const part of parts) {
        if (part.trim()) {
          onMessage(part)
        }
      }
    }

    onComplete()
  } catch (error) {
    if (abortSignal?.aborted) {
      console.log('Broadcast stream aborted')
    } else {
      console.error('Broadcast stream error:', error)
      throw error
    }
  }
}

export const parsePGNData = (pgnData: string): PGNParseResult => {
  const games: BroadcastGame[] = []
  const errors: string[] = []

  try {
    // Split the PGN data into individual games
    const gameStrings = pgnData
      .split(/\n\n\[Event/)
      .filter((game) => game.trim())

    for (let i = 0; i < gameStrings.length; i++) {
      let gameString = gameStrings[i]

      // Add back the [Event header if it was removed by split
      if (i > 0 && !gameString.startsWith('[Event')) {
        gameString = '[Event' + gameString
      }

      try {
        const game = parseSinglePGN(gameString)
        if (game) {
          games.push(game)
        }
      } catch (error) {
        errors.push(`Error parsing game ${i + 1}: ${error}`)
      }
    }
  } catch (error) {
    errors.push(`Error splitting PGN data: ${error}`)
  }

  return { games, errors }
}

const parseSinglePGN = (pgnString: string): BroadcastGame | null => {
  const lines = pgnString.trim().split('\n')
  const headers: Record<string, string> = {}
  let movesSection = ''
  let inMoves = false

  // Parse headers and moves
  for (const line of lines) {
    const trimmedLine = line.trim()

    if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
      // Parse header
      const match = trimmedLine.match(/^\[(\w+)\s+"([^"]*)"\]$/)
      if (match) {
        headers[match[1]] = match[2]
      }
    } else if (trimmedLine && !inMoves) {
      inMoves = true
      movesSection = trimmedLine
    } else if (inMoves && trimmedLine) {
      movesSection += ' ' + trimmedLine
    }
  }

  // Extract essential data
  const white = headers.White || 'Unknown'
  const black = headers.Black || 'Unknown'
  const result = headers.Result || '*'
  const event = headers.Event || ''
  const site = headers.Site || ''
  const date = headers.Date || headers.UTCDate || ''
  const round = headers.Round || ''

  // Parse moves from moves section
  const moves = parseMovesFromPGN(movesSection)
  const fen = extractFENFromMoves()

  const game: BroadcastGame = {
    id: generateGameId(white, black, event, site),
    white,
    black,
    result,
    moves,
    pgn: pgnString,
    fen: fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    event,
    site,
    date,
    round,
    eco: headers.ECO,
    opening: headers.Opening,
    whiteElo: headers.WhiteElo ? parseInt(headers.WhiteElo) : undefined,
    blackElo: headers.BlackElo ? parseInt(headers.BlackElo) : undefined,
    timeControl: headers.TimeControl,
    termination: headers.Termination,
    annotator: headers.Annotator,
    studyName: headers.StudyName,
    chapterName: headers.ChapterName,
    utcDate: headers.UTCDate,
    utcTime: headers.UTCTime,
  }

  // Note: Last move extraction would need proper move parsing to convert SAN to UCI
  // For now, we'll leave it undefined and handle in the controller

  return game
}

const parseMovesFromPGN = (movesSection: string): string[] => {
  const moves: string[] = []

  // Remove comments, variations, and result
  const cleanMoves = movesSection
    .replace(/\{[^}]*\}/g, '') // Remove comments
    .replace(/\([^)]*\)/g, '') // Remove variations
    .replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '') // Remove result
    .trim()

  // Split by move numbers and extract moves
  const tokens = cleanMoves.split(/\s+/)

  for (const token of tokens) {
    // Skip move numbers (e.g., "1.", "2.", etc.)
    if (/^\d+\.+$/.test(token)) {
      continue
    }

    // Skip empty tokens
    if (!token.trim()) {
      continue
    }

    // Add valid moves
    if (
      /^[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](\=[NBRQ])?[\+\#]?$/.test(token) ||
      token === 'O-O' ||
      token === 'O-O-O'
    ) {
      moves.push(token)
    }
  }

  return moves
}

const extractFENFromMoves = (): string | null => {
  // This would require a full chess engine to calculate the FEN from moves
  // For now, return null and handle in the controller with chess.js
  return null
}

const generateGameId = (
  white: string,
  black: string,
  event: string,
  site: string,
): string => {
  const baseString = `${white}-${black}-${event}-${site}`
  // Use a simple hash instead of deprecated btoa for better compatibility
  let hash = 0
  for (let i = 0; i < baseString.length; i++) {
    const char = baseString.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 12)
}
