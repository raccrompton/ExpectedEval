import { useMemo } from 'react'
import { GameNode, MaiaEvaluation, StockfishEvaluation } from 'src/types'
import { MAIA_MODELS } from './constants'

export const useMoveRecommendations = (
  currentNode: GameNode | null,
  moveEvaluation: {
    maia?: MaiaEvaluation
    stockfish?: StockfishEvaluation
  } | null,
  currentMaiaModel: string,
) => {
  const recommendations = useMemo(() => {
    if (!moveEvaluation) return {}

    const isBlackTurn = currentNode?.turn === 'b'

    const result: {
      maia?: { move: string; prob: number }[]
      stockfish?: {
        move: string
        cp: number
        winrate?: number
        winrate_loss?: number
      }[]
      isBlackTurn?: boolean
    } = {
      isBlackTurn,
    }

    if (moveEvaluation?.maia) {
      const policy = moveEvaluation.maia.policy
      const maia = Object.entries(policy).map(([move, prob]) => ({
        move,
        prob,
      }))

      result.maia = maia
    }

    if (moveEvaluation?.stockfish) {
      const cp_vec = moveEvaluation.stockfish.cp_vec
      const winrate_vec = moveEvaluation.stockfish.winrate_vec || {}
      const winrate_loss_vec = moveEvaluation.stockfish.winrate_loss_vec || {}

      const stockfish = Object.entries(cp_vec).map(([move, cp]) => ({
        move,
        cp,
        winrate: winrate_vec[move] || 0,
        winrate_loss: winrate_loss_vec[move] || 0,
      }))

      result.stockfish = stockfish
    }

    return result
  }, [moveEvaluation, currentNode])

  const movesByRating = useMemo(() => {
    if (!currentNode) return
    const maia = currentNode.analysis.maia
    const stockfish = moveEvaluation?.stockfish
    const candidates: string[][] = []

    if (!maia) return

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
  }, [currentMaiaModel, moveEvaluation, currentNode])

  const moveMap = useMemo(() => {
    if (!moveEvaluation?.maia || !moveEvaluation?.stockfish) {
      return
    }

    const maia = Object.fromEntries(
      Object.entries(moveEvaluation.maia.policy).slice(0, 3),
    )

    const stockfishMoves = Object.entries(moveEvaluation.stockfish.cp_vec)

    const topStockfish = Object.fromEntries(stockfishMoves.slice(0, 3))

    const moves = Array.from(
      new Set([...Object.keys(maia), ...Object.keys(topStockfish)]),
    )

    const data = []

    for (const move of moves) {
      const cp = Math.max(
        -4,
        moveEvaluation.stockfish.cp_relative_vec[move] / 100,
      )
      const prob = moveEvaluation?.maia.policy[move] * 100

      data.push({
        move,
        x: cp,
        y: prob,
      })
    }

    return data
  }, [moveEvaluation])

  return {
    recommendations,
    movesByRating,
    moveMap,
  }
}
