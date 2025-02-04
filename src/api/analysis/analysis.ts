/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Player,
  MoveMap,
  MaiaEvaluation,
  ClientAnalyzedGame,
  LegacyAnalyzedGame,
  PositionEvaluation,
  StockfishEvaluation,
  AnalysisTournamentGame,
} from 'src/types'
import { buildUrl } from '../utils'
import { AvailableMoves } from 'src/types/training'

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

        const parts = buf.split(matcher)
        buf = parts.pop() as string
        for (const i of parts.filter((p) => p)) processLine(JSON.parse(i))

        return loop()
      }
    })

  return loop()
}

export const getAnalysisList = async (): Promise<
  Map<string, AnalysisTournamentGame[]>
> => {
  const res = await fetch(buildUrl('analysis/list'))

  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  const data = await res.json()

  return data
}

export const getAnalysisGameList = async (type = 'play', page = 1) => {
  const res = await fetch(buildUrl(`analysis/user/list/${type}/${page}`))

  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  const data = await res.json()

  return data
}

export const getLichessGames = async (
  username: string,
  onMessage: (data: any) => void,
) => {
  const stream = fetch(
    `https://lichess.org/api/games/user/${username}?max=100&pgnInJson=true`,
    {
      headers: {
        Accept: 'application/x-ndjson',
      },
    },
  )
  stream.then(readStream(onMessage))
}

export const getLichessGamePGN = async (id: string) => {
  const res = await fetch(`https://lichess.org/game/export/${id}`, {
    headers: {
      Accept: 'application/x-chess-pgn',
    },
  })
  return res.text()
}

export const getLegacyAnalyzedTournamentGame = async (
  gameId = ['FkgYSri1'],
) => {
  const res = await fetch(
    buildUrl(`analysis/analysis_list/${gameId.join('/')}`),
  )

  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  const data = await res.json()
  const id = data['id']
  const termination = {
    ...data['termination'],
    condition: 'Normal',
  }

  const gameType = 'blitz'
  const blackPlayer = data['black_player']
  const whitePlayer = data['white_player']

  const maiaEvaluations: { [model: string]: MoveMap[] } = {}
  const stockfishEvaluations: MoveMap[] = data['stockfish_evals']

  const positionEvaluations: { [model: string]: PositionEvaluation[] } = {}
  const availableMoves: AvailableMoves[] = []

  for (const model of data['maia_versions']) {
    maiaEvaluations[model] = data['maia_evals'][model]
    positionEvaluations[model] = Object.keys(data['maia_evals'][model]).map(
      () => ({
        trickiness: 1,
        performance: 1,
      }),
    )
  }

  for (const position of data['move_maps']) {
    const moves: AvailableMoves = {}
    for (const move of position) {
      const fromTo = move.move.join('')
      const san = move['move_san']
      const { check, fen } = move

      moves[fromTo] = {
        board: fen,
        check,
        san,
        lastMove: move.move,
      }
    }
    availableMoves.push(moves)
  }

  const gameStates = data['game_states']

  const moves = gameStates.map((gameState: any) => {
    const {
      last_move: lastMove,
      fen,
      check,
      last_move_san: san,
      evaluations: maia_values,
    } = gameState

    return {
      board: fen,
      lastMove,
      san,
      check,
      maia_values,
    }
  })

  return {
    id,
    blackPlayer,
    whitePlayer,
    moves,
    maiaEvaluations,
    stockfishEvaluations,
    availableMoves,
    gameType,
    termination,
    positionEvaluations,
  } as any as LegacyAnalyzedGame
}

export const getLegacyAnalyzedLichessGame = async (
  id: string,
  pgn: string,
  maia_model = 'maia_kdd_1500',
) => {
  const res = await fetch(
    buildUrl(
      'analysis/analyze_user_game?' +
        new URLSearchParams({
          maia_model,
        }),
    ),
    {
      method: 'POST',
      body: pgn,
      headers: {
        'Content-Type': 'text/plain',
      },
    },
  )

  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  const data = await res.json()

  const termination = {
    ...data['termination'],
    condition: 'Normal',
  }

  const gameType = 'blitz'
  const blackPlayer = data['black_player']
  const whitePlayer = data['white_player']

  const maiaEvaluations: { [model: string]: MoveMap[] } = {}
  const positionEvaluations: { [model: string]: PositionEvaluation[] } = {}
  const availableMoves: AvailableMoves[] = []

  for (const model of data['maia_versions']) {
    maiaEvaluations[model] = data['maia_evals'][model]
    positionEvaluations[model] = Object.keys(data['maia_evals'][model]).map(
      () => ({
        trickiness: 1,
        performance: 1,
      }),
    )
  }

  for (const position of data['move_maps']) {
    const moves: AvailableMoves = {}
    for (const move of position) {
      const fromTo = move.move.join('')
      const san = move['move_san']
      const { check, fen } = move

      moves[fromTo] = {
        board: fen,
        check,
        san,
        lastMove: move.move,
      }
    }
    availableMoves.push(moves)
  }

  const gameStates = data['game_states']

  const moves = gameStates.map((gameState: any) => {
    const {
      last_move: lastMove,
      fen,
      check,
      last_move_san: san,
      evaluations: maia_values,
    } = gameState

    return {
      board: fen,
      lastMove,
      san,
      check,
      maia_values,
    }
  })

  return {
    id,
    blackPlayer,
    whitePlayer,
    moves,
    maiaEvaluations,
    availableMoves,
    gameType,
    termination,
    positionEvaluations,
    pgn,
  } as LegacyAnalyzedGame
}

export const getLegacyAnalyzedUserGame = async (
  id: string,
  game_type: 'play' | 'hand' | 'brain',
  maia_model = 'maia_kdd_1500',
) => {
  const res = await fetch(
    buildUrl(
      `analysis/user/analyze_user_maia_game/${id}?` +
        new URLSearchParams({
          game_type,
          maia_model,
        }),
    ),
    {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain',
      },
    },
  )

  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  const data = await res.json()

  const termination = {
    ...data['termination'],
    condition: 'Normal',
  }

  const gameType = 'blitz'
  const blackPlayer = data['black_player']
  const whitePlayer = data['white_player']

  const maiaPattern = /maia_kdd_1\d00/

  if (maiaPattern.test(blackPlayer.name)) {
    blackPlayer.name = blackPlayer.name.replace('maia_kdd_', 'Maia ')
  }

  if (maiaPattern.test(whitePlayer.name)) {
    whitePlayer.name = whitePlayer.name.replace('maia_kdd_', 'Maia ')
  }

  const maiaEvaluations: { [model: string]: MoveMap[] } = {}
  const positionEvaluations: { [model: string]: PositionEvaluation[] } = {}
  const availableMoves: AvailableMoves[] = []

  for (const model of data['maia_versions']) {
    maiaEvaluations[model] = data['maia_evals'][model]
    positionEvaluations[model] = Object.keys(data['maia_evals'][model]).map(
      () => ({
        trickiness: 1,
        performance: 1,
      }),
    )
  }

  for (const position of data['move_maps']) {
    const moves: AvailableMoves = {}
    for (const move of position) {
      const fromTo = move.move.join('')
      const san = move['move_san']
      const { check, fen } = move

      moves[fromTo] = {
        board: fen,
        check,
        san,
        lastMove: move.move,
      }
    }
    availableMoves.push(moves)
  }

  const gameStates = data['game_states']

  const moves = gameStates.map((gameState: any) => {
    const {
      last_move: lastMove,
      fen,
      check,
      last_move_san: san,
      evaluations: maia_values,
    } = gameState

    return {
      board: fen,
      lastMove,
      san,
      check,
      maia_values,
    }
  })

  return {
    id,
    blackPlayer,
    whitePlayer,
    moves,
    maiaEvaluations,
    availableMoves,
    gameType,
    termination,
    positionEvaluations,
  } as LegacyAnalyzedGame
}

export const getClientAnalyzedTournamentGame = async (
  gameId = ['FkgYSri1'],
) => {
  const res = await fetch(
    buildUrl(`analysis/analysis_list/${gameId.join('/')}`),
  )

  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  const data = await res.json()
  const id = data['id']
  const termination = {
    ...data['termination'],
    condition: 'Normal',
  }

  const gameType = 'blitz'
  const blackPlayer = data['black_player'] as Player
  const whitePlayer = data['white_player'] as Player

  const maiaEvals: { [model: string]: MoveMap[] } = {}
  const stockfishEvaluations: MoveMap[] = data['stockfish_evals']

  const availableMoves: AvailableMoves[] = []

  for (const model of data['maia_versions']) {
    maiaEvals[model] = data['maia_evals'][model]
  }

  for (const position of data['move_maps']) {
    const moves: AvailableMoves = {}
    for (const move of position) {
      const fromTo = move.move.join('')
      const san = move['move_san']
      const { check, fen } = move

      moves[fromTo] = {
        board: fen,
        check,
        san,
        lastMove: move.move,
      }
    }
    availableMoves.push(moves)
  }

  const gameStates = data['game_states']

  const moves = gameStates.map((gameState: any) => {
    const {
      last_move: lastMove,
      fen,
      check,
      last_move_san: san,
      evaluations: maia_values,
    } = gameState

    return {
      board: fen,
      lastMove,
      san,
      check,
      maia_values,
    }
  })

  const maiaEvaluations = [] as { [rating: number]: MaiaEvaluation }[]

  return {
    id,
    blackPlayer,
    whitePlayer,
    moves,
    maiaEvaluations,
    stockfishEvaluations,
    availableMoves,
    gameType,
    termination,
  } as any as ClientAnalyzedGame
}

export const getClientAnalyzedLichessGame = async (id: string, pgn: string) => {
  const res = await fetch(buildUrl('analysis/analyze_user_game'), {
    method: 'POST',
    body: pgn,
    headers: {
      'Content-Type': 'text/plain',
    },
  })

  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  const data = await res.json()

  const termination = {
    ...data['termination'],
    condition: 'Normal',
  }

  const gameType = 'blitz'
  const blackPlayer = data['black_player'] as Player
  const whitePlayer = data['white_player'] as Player

  const maiaEvals: { [model: string]: MoveMap[] } = {}
  const positionEvaluations: { [model: string]: PositionEvaluation[] } = {}
  const availableMoves: AvailableMoves[] = []

  for (const model of data['maia_versions']) {
    maiaEvals[model] = data['maia_evals'][model]
    positionEvaluations[model] = Object.keys(data['maia_evals'][model]).map(
      () => ({
        trickiness: 1,
        performance: 1,
      }),
    )
  }

  for (const position of data['move_maps']) {
    const moves: AvailableMoves = {}
    for (const move of position) {
      const fromTo = move.move.join('')
      const san = move['move_san']
      const { check, fen } = move

      moves[fromTo] = {
        board: fen,
        check,
        san,
        lastMove: move.move,
      }
    }
    availableMoves.push(moves)
  }

  const gameStates = data['game_states']

  const moves = gameStates.map((gameState: any) => {
    const {
      last_move: lastMove,
      fen,
      check,
      last_move_san: san,
      evaluations: maia_values,
    } = gameState

    return {
      board: fen,
      lastMove,
      san,
      check,
      maia_values,
    }
  })

  const maiaEvaluations = [] as { [rating: number]: MaiaEvaluation }[]
  const stockfishEvaluations: StockfishEvaluation[] = []

  return {
    id,
    blackPlayer,
    whitePlayer,
    moves,
    availableMoves,
    gameType,
    termination,
    maiaEvaluations,
    stockfishEvaluations,
    type: 'brain',
    pgn,
  } as ClientAnalyzedGame
}

export const getClientAnalyzedUserGame = async (
  id: string,
  game_type: 'play' | 'hand' | 'brain',
) => {
  const res = await fetch(
    buildUrl(
      `analysis/user/analyze_user_maia_game/${id}?` +
        new URLSearchParams({
          game_type,
        }),
    ),
    {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain',
      },
    },
  )

  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  const data = await res.json()

  const termination = {
    ...data['termination'],
    condition: 'Normal',
  }

  const gameType = 'blitz'
  const blackPlayer = data['black_player'] as Player
  const whitePlayer = data['white_player'] as Player

  const maiaPattern = /maia_kdd_1\d00/

  if (maiaPattern.test(blackPlayer.name)) {
    blackPlayer.name = blackPlayer.name.replace('maia_kdd_', 'Maia ')
  }

  if (maiaPattern.test(whitePlayer.name)) {
    whitePlayer.name = whitePlayer.name.replace('maia_kdd_', 'Maia ')
  }

  const maiaEvals: { [model: string]: MoveMap[] } = {}

  const availableMoves: AvailableMoves[] = []

  for (const model of data['maia_versions']) {
    maiaEvals[model] = data['maia_evals'][model]
  }

  for (const position of data['move_maps']) {
    const moves: AvailableMoves = {}
    for (const move of position) {
      const fromTo = move.move.join('')
      const san = move['move_san']
      const { check, fen } = move

      moves[fromTo] = {
        board: fen,
        check,
        san,
        lastMove: move.move,
      }
    }
    availableMoves.push(moves)
  }

  const gameStates = data['game_states']

  const moves = gameStates.map((gameState: any) => {
    const {
      last_move: lastMove,
      fen,
      check,
      last_move_san: san,
      evaluations: maia_values,
    } = gameState

    return {
      board: fen,
      lastMove,
      san,
      check,
      maia_values,
    }
  })

  const maiaEvaluations = [] as { [rating: number]: MaiaEvaluation }[]
  const stockfishEvaluations: StockfishEvaluation[] = []

  return {
    id,
    blackPlayer,
    whitePlayer,
    moves,
    availableMoves,
    gameType,
    termination,
    maiaEvaluations,
    stockfishEvaluations,
    type: 'brain',
  } as ClientAnalyzedGame
}
