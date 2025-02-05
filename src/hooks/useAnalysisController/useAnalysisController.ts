import { Chess } from 'chess.ts'
import { useEffect, useMemo, useState } from 'react'

import { useGameController, useStockfishEngine, useMaiaEngine } from '..'
import {
  Color,
  MoveMap,
  MaiaEvaluation,
  ClientAnalyzedGame,
  StockfishEvaluation,
} from 'src/types'

const MAIA_MODELS = [
  'maia_kdd_1100',
  'maia_kdd_1200',
  'maia_kdd_1300',
  'maia_kdd_1400',
  'maia_kdd_1500',
  'maia_kdd_1600',
  'maia_kdd_1700',
  'maia_kdd_1800',
  'maia_kdd_1900',
]

const MAIA_COLORS = ['#fe7f6d', '#f08a4c', '#ecaa4f', '#eccd4f']
const STOCKFISH_COLORS = ['#A3C6F8', '#8fadd9', '#7a95ba', '#667c9b']

export const useAnalysisController = (
  game: ClientAnalyzedGame,
  initialIndex: number,
  initialOrientation: Color,
) => {
  const controller = useGameController(game, initialIndex, initialOrientation)

  const parseStockfishEvaluation = (
    message: StockfishEvaluation,
    moveIndex: number,
  ) => {
    setStockfishEvaluations((prev) => {
      const newEvaluations = [...prev]
      newEvaluations[moveIndex] = message

      return newEvaluations
    })
  }

  const {
    maia,
    error: maiaError,
    status: maiaStatus,
    progress: maiaProgress,
    downloadModel: downloadMaia,
  } = useMaiaEngine()
  const engine = useStockfishEngine(parseStockfishEvaluation)
  const [currentMove, setCurrentMove] = useState<[string, string] | null>()
  const [stockfishEvaluations, setStockfishEvaluations] = useState<
    StockfishEvaluation[]
  >([])
  const [maiaEvaluations, setMaiaEvaluations] = useState<
    { [rating: string]: MaiaEvaluation }[]
  >([])
  const [currentMaiaModel, setCurrentMaiaModel] = useState(MAIA_MODELS[0])

  useEffect(() => {
    const board = new Chess(game.moves[controller.currentIndex].board)

    ;(async () => {
      if (maiaStatus !== 'ready' || maiaEvaluations[controller.currentIndex])
        return

      const { result } = await maia.batchEvaluate(
        Array(9).fill(board.fen()),
        [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900],
        [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900],
      )

      const output = {
        maia_kdd_1100: result[0],
        maia_kdd_1200: result[1],
        maia_kdd_1300: result[2],
        maia_kdd_1400: result[3],
        maia_kdd_1500: result[4],
        maia_kdd_1600: result[5],
        maia_kdd_1700: result[6],
        maia_kdd_1800: result[7],
        maia_kdd_1900: result[8],
      }

      console.log(output)
      setMaiaEvaluations((prev) => {
        const newEvaluations = [...prev]
        newEvaluations[controller.currentIndex] = output

        return newEvaluations
      })
    })()
  }, [controller.currentIndex, game.type, status])

  useEffect(() => {
    if (game.type === 'tournament') return

    const board = new Chess(game.moves[controller.currentIndex].board)
    if (stockfishEvaluations[controller.currentIndex]?.depth == 18) return

    engine.evaluatePosition(
      board.fen(),
      board.moves().length,
      controller.currentIndex,
    )
  }, [controller.currentIndex, game.moves, game.type, engine])

  const moves = useMemo(() => {
    const moveMap = new Map<string, string[]>()

    const moves = new Chess(game.moves[controller.currentIndex].board).moves({
      verbose: true,
    })

    moves.forEach((key) => {
      const { from, to } = key
      moveMap.set(from, (moveMap.get(from) ?? []).concat([to]))
    })

    return moveMap
  }, [controller.currentIndex, game.maiaEvaluations, MAIA_MODELS])

  const colorSanMapping = useMemo(() => {
    const mapping: {
      [move: string]: {
        san: string
        color: string
      }
    } = {}
    const moves = new Chess(game.moves[controller.currentIndex].board).moves({
      verbose: true,
    })

    for (const move of moves) {
      let color, maiaRank, stockfishRank
      const lan = move.from + move.to + (move.promotion || '')
      const maia = maiaEvaluations[controller.currentIndex]
      const stockfish = stockfishEvaluations[controller.currentIndex]

      if (stockfish) {
        stockfishRank = Object.keys(stockfish.cp_vec).indexOf(lan) + 1

        if (stockfishRank <= 4) {
          color = STOCKFISH_COLORS[stockfishRank]
        }
      }

      if (maia) {
        maiaRank =
          Object.keys(
            maiaEvaluations[controller.currentIndex][currentMaiaModel].policy,
          ).indexOf(lan) + 1

        if (maiaRank <= 4) {
          color = MAIA_COLORS[maiaRank]
        }
      }

      mapping[lan] = {
        san: move.san,
        color: color || '#FFFFFF',
      }
    }

    return mapping
  }, [
    maiaEvaluations,
    stockfishEvaluations,
    controller.currentIndex,
    game.moves,
  ])

  const moveEvaluation = useMemo(() => {
    let stockfish

    if (game.type !== 'tournament') {
      stockfish = stockfishEvaluations[controller.currentIndex]
    } else {
      const lastMove = game.moves[controller.currentIndex].lastMove?.join('')
      if (!lastMove) return null

      const cp_vec = Object.fromEntries(
        Object.entries(
          game.stockfishEvaluations[controller.currentIndex] as MoveMap,
        ).sort(([, a], [, b]) => b - a),
      )

      if (cp_vec) {
        const model_optimal_cp = Math.max(...Object.values(cp_vec))

        const cp_relative_vec = Object.fromEntries(
          Object.entries(cp_vec).map(([move, evaluation]) => [
            move,
            model_optimal_cp - evaluation,
          ]),
        )

        stockfish = {
          cp_vec,
          cp_relative_vec,
          model_optimal_cp,
        } as StockfishEvaluation
      }
    }

    let maia
    if (maiaEvaluations[controller.currentIndex]) {
      maia = maiaEvaluations[controller.currentIndex][currentMaiaModel]
    }

    return {
      maia,
      stockfish,
    }
  }, [
    game.id,
    game.moves,
    maiaEvaluations,
    currentMaiaModel,
    stockfishEvaluations,
    game.stockfishEvaluations,
    controller.currentIndex,
  ])

  const blunderMeter = useMemo(() => {
    let blunderMoveChance = 0
    let okMoveChance = 0
    let goodMoveChance = 0
    if (!moveEvaluation || !moveEvaluation.maia || !moveEvaluation.stockfish) {
      return { blunderMoveChance, okMoveChance, goodMoveChance }
    }

    const { maia, stockfish } = moveEvaluation

    if (game.type === 'tournament') {
      const max = Math.max(...Object.values(stockfish.cp_vec))
      const sf = Object.fromEntries(
        Object.entries(stockfish.cp_vec).map(([key, value]) => [
          key,
          max - value,
        ]),
      )

      for (const [move, prob] of Object.entries(maia.policy)) {
        const loss = sf[move]

        if (loss === undefined) continue

        if (loss <= 50) {
          goodMoveChance += prob * 100
        } else if (loss <= 150) {
          okMoveChance += prob * 100
        } else {
          blunderMoveChance += prob * 100
        }
      }

      return { blunderMoveChance, okMoveChance, goodMoveChance }
    } else {
      for (const [move, prob] of Object.entries(maia.policy)) {
        const loss = stockfish.cp_relative_vec[move]

        if (loss === undefined) continue

        if (loss <= 50) {
          goodMoveChance += prob * 100
        } else if (loss <= 150) {
          okMoveChance += prob * 100
        } else {
          blunderMoveChance += prob * 100
        }
      }

      return { blunderMoveChance, okMoveChance, goodMoveChance }
    }
  }, [moveEvaluation])

  const movesByRating = useMemo(() => {
    if (!maiaEvaluations[controller.currentIndex]) return

    const maia = maiaEvaluations[controller.currentIndex]
    const stockfish = moveEvaluation?.stockfish

    const candidates: string[][] = []

    // Get top 3 Maia moves from selected rating level
    for (const move of Object.keys(maia[currentMaiaModel].policy).slice(0, 3)) {
      if (candidates.find((c) => c[0] === move)) continue
      candidates.push([move, move])
    }

    // Get top 3 Stockfish moves
    if (stockfish) {
      for (const move of Object.keys(stockfish.cp_vec).slice(0, 3)) {
        if (candidates.find((c) => c[0] === move)) continue
        candidates.push([move, move])
      }
    }

    // Get top Maia move from each rating level
    for (const rating of MAIA_MODELS) {
      const move = Object.keys(maia[rating].policy)[0]
      if (candidates.find((c) => c[0] === move)) continue
      candidates.push([move, move])
    }

    const data = []
    for (const rating of MAIA_MODELS) {
      const entry: { [key: string]: number } = {
        rating: parseInt(rating.slice(-4)),
      }

      for (const move of candidates) {
        const probability = maia[rating].policy[move[0]] * 100
        entry[move[1]] = probability
      }

      data.push(entry)
    }

    return data
  }, [
    controller.currentIndex,
    maiaEvaluations,
    stockfishEvaluations,
    moveEvaluation,
    currentMaiaModel,
  ])

  const moveRecommendations = useMemo(() => {
    const recommendations: {
      maia?: { move: string; prob: number }[]
      stockfish?: { move: string; cp: number }[]
    } = {}

    if (moveEvaluation?.maia) {
      const policy = moveEvaluation.maia.policy
      const maia = Object.entries(policy)
        .slice(0, 5)
        .map(([move, prob]) => ({ move, prob }))

      recommendations.maia = maia
    }

    if (moveEvaluation?.stockfish) {
      const cp_vec = moveEvaluation.stockfish.cp_vec
      const stockfish = Object.entries(cp_vec)
        .slice(0, 5)
        .map(([move, cp]) => ({ move, cp }))

      recommendations.stockfish = stockfish
    }

    return recommendations
  }, [controller.currentIndex, maiaEvaluations, stockfishEvaluations])

  const moveMap = useMemo(() => {
    if (!moveEvaluation?.maia || !moveEvaluation?.stockfish) {
      return
    }

    const maia = Object.fromEntries(
      Object.entries(moveEvaluation.maia.policy).slice(0, 3),
    )
    const stockfish = Object.fromEntries(
      Object.entries(moveEvaluation.stockfish.cp_vec).slice(0, 3),
    )

    const moves = Array.from(
      new Set(Object.keys(maia).concat(Object.keys(stockfish))),
    )

    const data = []

    for (const move of moves) {
      const cp = Math.max(-4, moveEvaluation.stockfish.cp_relative_vec[move])
      const prob = moveEvaluation?.maia.policy[move] * 100

      data.push({
        move,
        x: prob,
        y: cp,
      })
    }

    return data
  }, [controller.currentIndex, moveEvaluation])

  const move = useMemo(() => {
    if (
      currentMove &&
      game.availableMoves[controller.currentIndex][currentMove.join('')]
    ) {
      const {
        board: fen,
        check,
        ...rest
      } = game.availableMoves[controller.currentIndex][currentMove.join('')]
      return { move: currentMove, fen, check, ...rest }
    }
  }, [controller.currentIndex, currentMove, game.availableMoves])

  return {
    maiaStatus,
    downloadMaia,
    maiaProgress,
    move,
    moves,
    controller,
    currentMaiaModel,
    setCurrentMaiaModel,
    currentMove,
    colorSanMapping,
    setCurrentMove,
    moveEvaluation,
    movesByRating,
    moveRecommendations,
    moveMap,
    blunderMeter,
    stockfishEvaluations,
    maiaEvaluations,
  }
}
