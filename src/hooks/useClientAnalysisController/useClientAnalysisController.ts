import { Chess } from 'chess.ts'
import { useEffect, useMemo, useState } from 'react'

import { normalize, normalizeEvaluation, pseudoNL } from 'src/utils'
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

function parseMaiaWinRate(
  turnPlayed: string,
  currentMaiaModel: string,
  maiaValues?: { [key: string]: number },
) {
  if (maiaValues === undefined) return -1

  let maiaWr = maiaValues ? maiaValues[currentMaiaModel] : -1
  if (maiaWr !== -1 && turnPlayed === 'white') {
    maiaWr = 1 - maiaWr
  }

  return maiaWr
}

export const useClientAnalysisController = (
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

  const maia = useMaiaEngine()
  const engine = useStockfishEngine(parseStockfishEvaluation)
  const [currentMove, setCurrentMove] = useState<null | [string, string]>(null)
  const [stockfishEvaluations, setStockfishEvaluations] = useState<
    StockfishEvaluation[]
  >([])
  const [maiaEvaluations, setMaiaEvaluations] = useState<
    { [rating: string]: MaiaEvaluation }[]
  >([])
  const [currentMaiaModel, setCurrentMaiaModel] = useState(MAIA_MODELS[0])

  useEffect(() => {
    if (game.type === 'tournament') return
    const board = new Chess(game.moves[controller.currentIndex].board)

    ;(async () => {
      if (!maia.ready) return

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

      setMaiaEvaluations((prev) => {
        const newEvaluations = [...prev]
        newEvaluations[controller.currentIndex] = output

        return newEvaluations
      })
    })()
  }, [controller.currentIndex, game.type, maia.ready])

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

  const moveEvaluation = useMemo(() => {
    let stockfish

    if (game.type !== 'tournament') {
      stockfish = stockfishEvaluations[controller.currentIndex]
    } else {
      const lastMove = game.moves[controller.currentIndex].lastMove?.join('')
      if (!lastMove) return null

      const cp_vec = game.stockfishEvaluations[
        controller.currentIndex
      ] as MoveMap
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
    if (
      !maiaEvaluations[controller.currentIndex] ||
      !stockfishEvaluations[controller.currentIndex]
    )
      return

    const maia = maiaEvaluations[controller.currentIndex]
    const stockfish = stockfishEvaluations[controller.currentIndex]

    const candidates: string[][] = []

    // Get top 3 Maia moves from selected rating level
    for (const move of Object.keys(maia[currentMaiaModel].policy).slice(0, 3)) {
      if (candidates.find((c) => c[0] === move)) continue
      candidates.push([move, move])
    }

    // Get top 3 Stockfish moves
    for (const move of Object.keys(stockfish.cp_vec).slice(0, 3)) {
      if (candidates.find((c) => c[0] === move)) continue
      candidates.push([move, move])
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
    currentMaiaModel,
  ])

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
    move,
    data: {},
    moves,
    controller,
    currentMaiaModel,
    setCurrentMaiaModel,
    currentMove,
    setCurrentMove,
    moveEvaluation,
    movesByRating,
    blunderMeter,
    stockfishEvaluations,
    maiaEvaluations,
  }
}
