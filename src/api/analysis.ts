/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Player,
  MoveMap,
  GameTree,
  GameNode,
  AnalyzedGame,
  MaiaEvaluation,
  PositionEvaluation,
  StockfishEvaluation,
  AnalysisTournamentGame,
} from 'src/types'
import {
  buildGameTreeFromMoveList,
  convertBackendEvalToStockfishEval,
} from 'src/lib'
import { buildUrl } from './utils'
import { Chess } from 'chess.ts'
import { AvailableMoves } from 'src/types/training'

import {
  saveCustomAnalysis,
  getCustomAnalysisById,
} from 'src/lib/customAnalysis'

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

export const fetchWorldChampionshipGameList = async (): Promise<
  Map<string, AnalysisTournamentGame[]>
> => {
  const res = await fetch(buildUrl('analysis/list'))

  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  const data = await res.json()

  return data
}

export const fetchMaiaGameList = async (
  type = 'play',
  page = 1,
  lichessId?: string,
) => {
  const url = buildUrl(`analysis/user/list/${type}/${page}`)
  const searchParams = new URLSearchParams()

  if (lichessId) {
    searchParams.append('lichess_id', lichessId)
  }

  const fullUrl = searchParams.toString()
    ? `${url}?${searchParams.toString()}`
    : url
  const res = await fetch(fullUrl)

  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  const data = await res.json()

  return data
}

export const streamLichessGames = async (
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

export const fetchPgnOfLichessGame = async (id: string) => {
  const res = await fetch(`https://lichess.org/game/export/${id}`, {
    headers: {
      Accept: 'application/x-chess-pgn',
    },
  })
  return res.text()
}

export const fetchAnalyzedTournamentGame = async (gameId = ['FkgYSri1']) => {
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

  const tree = buildGameTreeFromMoveList(moves, moves[0].board)

  let currentNode: GameNode | null = tree.getRoot()

  for (let i = 0; i < moves.length; i++) {
    if (!currentNode) {
      break
    }

    const stockfishEval = stockfishEvaluations[i]
      ? convertBackendEvalToStockfishEval(
          stockfishEvaluations[i],
          moves[i].board.split(' ')[1],
        )
      : undefined

    if (stockfishEval) {
      currentNode.addStockfishAnalysis(stockfishEval)
    }
    currentNode = currentNode?.mainChild
  }

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
    tree,
  } as any as AnalyzedGame
}

export const fetchAnalyzedPgnGame = async (id: string, pgn: string) => {
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
  const tree = buildGameTreeFromMoveList(moves, moves[0].board)

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
    tree,
    type: 'brain',
    pgn,
  } as AnalyzedGame
}

export const fetchAnalyzedMaiaGame = async (
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

  if (blackPlayer.name && maiaPattern.test(blackPlayer.name)) {
    blackPlayer.name = blackPlayer.name.replace('maia_kdd_', 'Maia ')
  }

  if (whitePlayer.name && maiaPattern.test(whitePlayer.name)) {
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
  const tree = buildGameTreeFromMoveList(moves, moves[0].board)

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
    tree,
    type: 'brain',
  } as AnalyzedGame
}

const createAnalyzedGameFromPGN = async (
  pgn: string,
  id?: string,
): Promise<AnalyzedGame> => {
  const chess = new Chess()

  try {
    chess.loadPgn(pgn)
  } catch (error) {
    throw new Error('Invalid PGN format')
  }

  const history = chess.history({ verbose: true })
  const headers = chess.header()

  const moves = []
  const tempChess = new Chess()

  const startingFen =
    headers.FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  if (headers.FEN) {
    tempChess.load(headers.FEN)
  }

  moves.push({
    board: tempChess.fen(),
    lastMove: undefined,
    san: undefined,
    check: tempChess.inCheck(),
    maia_values: {},
  })

  for (const move of history) {
    tempChess.move(move)
    moves.push({
      board: tempChess.fen(),
      lastMove: [move.from, move.to] as [string, string],
      san: move.san,
      check: tempChess.inCheck(),
      maia_values: {},
    })
  }

  const tree = buildGameTreeFromMoveList(moves, startingFen)

  return {
    id: id || `pgn-${Date.now()}`,
    blackPlayer: { name: headers.Black || 'Black', rating: undefined },
    whitePlayer: { name: headers.White || 'White', rating: undefined },
    moves,
    availableMoves: new Array(moves.length).fill({}),
    gameType: 'custom',
    termination: {
      result: headers.Result || '*',
      winner:
        headers.Result === '1-0'
          ? 'white'
          : headers.Result === '0-1'
            ? 'black'
            : 'none',
      condition: 'Normal',
    },
    maiaEvaluations: new Array(moves.length).fill({}),
    stockfishEvaluations: new Array(moves.length).fill(undefined),
    tree,
    type: 'custom-pgn' as const,
    pgn,
  } as AnalyzedGame
}

export const getAnalyzedCustomPGN = async (
  pgn: string,
  name?: string,
): Promise<AnalyzedGame> => {
  const stored = await saveCustomAnalysis('pgn', pgn, name)

  return createAnalyzedGameFromPGN(pgn, stored.id)
}

const createAnalyzedGameFromFEN = async (
  fen: string,
  id?: string,
): Promise<AnalyzedGame> => {
  const chess = new Chess()

  try {
    chess.load(fen)
  } catch (error) {
    throw new Error('Invalid FEN format')
  }

  const moves = [
    {
      board: fen,
      lastMove: undefined,
      san: undefined,
      check: chess.inCheck(),
      maia_values: {},
    },
  ]

  const tree = new GameTree(fen)

  return {
    id: id || `fen-${Date.now()}`,
    blackPlayer: { name: 'Black', rating: undefined },
    whitePlayer: { name: 'White', rating: undefined },
    moves,
    availableMoves: [{}],
    gameType: 'custom',
    termination: {
      result: '*',
      winner: 'none',
      condition: 'Normal',
    },
    maiaEvaluations: [{}],
    stockfishEvaluations: [undefined],
    tree,
    type: 'custom-fen' as const,
  } as AnalyzedGame
}

export const getAnalyzedCustomFEN = async (
  fen: string,
  name?: string,
): Promise<AnalyzedGame> => {
  const stored = await saveCustomAnalysis('fen', fen, name)

  return createAnalyzedGameFromFEN(fen, stored.id)
}

export const getAnalyzedCustomGame = async (
  id: string,
): Promise<AnalyzedGame> => {
  const stored = getCustomAnalysisById(id)
  if (!stored) {
    throw new Error('Custom analysis not found')
  }

  if (stored.type === 'custom-pgn') {
    return createAnalyzedGameFromPGN(stored.data, stored.id)
  } else {
    return createAnalyzedGameFromFEN(stored.data, stored.id)
  }
}

export interface EngineAnalysisPosition {
  ply: number
  fen: string
  maia?: { [rating: string]: MaiaEvaluation }
  stockfish?: {
    depth: number
    cp_vec: { [move: string]: number }
  }
}

export const storeGameAnalysisCache = async (
  gameId: string,
  analysisData: EngineAnalysisPosition[],
): Promise<void> => {
  const res = await fetch(
    buildUrl(`analysis/store_engine_analysis/${gameId}`),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analysisData),
    },
  )

  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    throw new Error('Failed to store engine analysis')
  }
}

export const retrieveGameAnalysisCache = async (
  gameId: string,
): Promise<{ positions: EngineAnalysisPosition[] } | null> => {
  const res = await fetch(buildUrl(`analysis/get_engine_analysis/${gameId}`))

  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  if (res.status === 404) {
    // No stored analysis found
    return null
  }

  if (!res.ok) {
    throw new Error('Failed to retrieve engine analysis')
  }

  return res.json()
}

export interface UpdateGameMetadataRequest {
  custom_name?: string
  is_favorited?: boolean
}

export const updateGameMetadata = async (
  gameType: 'custom' | 'play' | 'hand' | 'brain',
  gameId: string,
  metadata: UpdateGameMetadataRequest,
): Promise<void> => {
  const res = await fetch(
    buildUrl(`analysis/update_metadata/${gameType}/${gameId}`),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    },
  )

  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    throw new Error('Failed to update game metadata')
  }
}

export interface StoreCustomGameRequest {
  name?: string
  pgn?: string
  fen?: string
}

export interface StoredCustomGameResponse {
  id: string
  name: string
  pgn?: string
  fen?: string
  created_at: string
}

export const storeCustomGame = async (
  data: StoreCustomGameRequest,
): Promise<StoredCustomGameResponse> => {
  const res = await fetch(buildUrl('analysis/store_custom_game'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to store custom game: ${errorText}`)
  }

  return res.json() as Promise<StoredCustomGameResponse>
}
