/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Player,
  MoveMap,
  GameTree,
  GameNode,
  AnalyzedGame,
  MaiaEvaluation,
  LegacyAnalyzedGame,
  PositionEvaluation,
  StockfishEvaluation,
  AnalysisTournamentGame,
} from 'src/types'
import { buildUrl } from '../utils'

import { AvailableMoves } from 'src/types/training'

function buildGameTree(moves: any[], initialFen: string) {
  const tree = new GameTree(initialFen)
  let currentNode = tree.getRoot()

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i]

    if (move.lastMove) {
      const [from, to] = move.lastMove
      currentNode = tree.addMainMove(
        currentNode,
        move.board,
        from + to,
        move.san || '',
      )
    }
  }

  return tree
}

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

  if (blackPlayer.name && maiaPattern.test(blackPlayer.name)) {
    blackPlayer.name = blackPlayer.name.replace('maia_kdd_', 'Maia ')
  }

  if (whitePlayer.name && maiaPattern.test(whitePlayer.name)) {
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

function convertMoveMapToStockfishEval(
  moveMap: MoveMap,
  turn: 'w' | 'b',
): StockfishEvaluation {
  const cp_vec: { [key: string]: number } = {}
  const cp_relative_vec: { [key: string]: number } = {}
  let model_optimal_cp = -Infinity
  let model_move = ''

  for (const move in moveMap) {
    const cp = moveMap[move]
    cp_vec[move] = cp
    if (cp > model_optimal_cp) {
      model_optimal_cp = cp
      model_move = move
    }
  }

  for (const move in cp_vec) {
    const cp = moveMap[move]
    cp_relative_vec[move] = cp - model_optimal_cp
  }

  const cp_vec_sorted = Object.fromEntries(
    Object.entries(cp_vec).sort(([, a], [, b]) => b - a),
  )

  const cp_relative_vec_sorted = Object.fromEntries(
    Object.entries(cp_relative_vec).sort(([, a], [, b]) => b - a),
  )

  if (turn === 'b') {
    model_optimal_cp *= -1
    for (const move in cp_vec_sorted) {
      cp_vec_sorted[move] *= -1
    }
  }

  return {
    sent: true,
    depth: 20,
    model_move: model_move,
    model_optimal_cp: model_optimal_cp,
    cp_vec: cp_vec_sorted,
    cp_relative_vec: cp_relative_vec_sorted,
  }
}

export const getAnalyzedTournamentGame = async (gameId = ['FkgYSri1']) => {
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

  const tree = buildGameTree(moves, moves[0].board)

  let currentNode: GameNode | null = tree.getRoot()

  for (let i = 0; i < moves.length; i++) {
    if (!currentNode) {
      break
    }

    const stockfishEval = stockfishEvaluations[i]
      ? convertMoveMapToStockfishEval(
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

export const getAnalyzedLichessGame = async (id: string, pgn: string) => {
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
  const tree = buildGameTree(moves, moves[0].board)

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

export const getAnalyzedUserGame = async (
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
  const tree = buildGameTree(moves, moves[0].board)

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
