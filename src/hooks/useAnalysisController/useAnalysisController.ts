import { Chess } from 'chess.ts'
import React, { useEffect, useMemo, useState, useCallback } from 'react'

import {
  GameTree,
  AnalyzedGame,
  MaiaEvaluation,
  StockfishEvaluation,
} from 'src/types'
import {
  useStockfishEngine,
  useMaiaEngine,
  useAnalysisGameController,
} from '..'

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

export const useAnalysisController = (game: AnalyzedGame) => {
  const controller = useAnalysisGameController(
    game.tree as GameTree,
    game.tree?.getRoot(),
  )

  const [analysisState, setAnalysisState] = useState(0)

  const {
    maia,
    error: maiaError,
    status: maiaStatus,
    progress: maiaProgress,
    downloadModel: downloadMaia,
  } = useMaiaEngine()

  const { streamEvaluations, stopEvaluation } = useStockfishEngine()
  const [currentMove, setCurrentMove] = useState<[string, string] | null>()
  const [currentMaiaModel, setCurrentMaiaModel] = useState(MAIA_MODELS[0])

  useEffect(() => {
    if (!controller.currentNode) return

    const board = new Chess(controller.currentNode.fen)
    ;(async () => {
      if (
        maiaStatus !== 'ready' ||
        !controller.currentNode ||
        controller.currentNode.analysis.maia
      )
        return

      const { result } = await maia.batchEvaluate(
        Array(9).fill(board.fen()),
        [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900],
        [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900],
      )

      const maiaEval: { [key: string]: MaiaEvaluation } = {}
      MAIA_MODELS.forEach((model, index) => {
        maiaEval[model] = result[index]
      })

      controller.currentNode.addMaiaAnalysis(maiaEval)
      setAnalysisState((state) => state + 1)
    })()
  }, [maiaStatus, controller.currentNode, analysisState])

  useEffect(() => {
    if (!controller.currentNode) return
    const board = new Chess(controller.currentNode.fen)
    if (
      controller.currentNode.analysis.stockfish &&
      controller.currentNode.analysis.stockfish?.depth >= 18
    )
      return

    const evaluationStream = streamEvaluations(
      board.fen(),
      board.moves().length,
    )

    if (evaluationStream) {
      ;(async () => {
        for await (const evaluation of evaluationStream) {
          if (!controller.currentNode) {
            stopEvaluation()
            break
          }
          controller.currentNode.addStockfishAnalysis(evaluation)
          setAnalysisState((state) => state + 1)
        }
      })()
    }

    return () => {
      stopEvaluation()
    }
  }, [controller.currentNode, game.type, streamEvaluations, stopEvaluation])

  const moves = useMemo(() => {
    if (!controller.currentNode) return new Map<string, string[]>()

    const moveMap = new Map<string, string[]>()
    const chess = new Chess(controller.currentNode.fen)
    const moves = chess.moves({ verbose: true })

    moves.forEach((key) => {
      const { from, to } = key
      moveMap.set(from, (moveMap.get(from) ?? []).concat([to]))
    })

    return moveMap
  }, [controller.currentNode])

  const colorSanMapping = useMemo(() => {
    if (!controller.currentNode) return {}

    const mapping: {
      [move: string]: {
        san: string
        color: string
      }
    } = {}

    const chess = new Chess(controller.currentNode.fen)
    const moves = chess.moves({ verbose: true })

    for (const move of moves) {
      let color, maiaRank, stockfishRank
      const lan = move.from + move.to + (move.promotion || '')
      const maia = controller.currentNode.analysis.maia?.[currentMaiaModel]
      const stockfish = controller.currentNode.analysis.stockfish

      if (stockfish) {
        stockfishRank = Object.keys(stockfish.cp_vec).indexOf(lan) + 1

        if (stockfishRank <= 4) {
          color = STOCKFISH_COLORS[stockfishRank]
        }
      }

      if (maia) {
        maiaRank = Object.keys(maia.policy).indexOf(lan) + 1

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
  }, [currentMaiaModel, controller.currentNode, analysisState])

  const moveEvaluation = useMemo(() => {
    if (!controller.currentNode) return null

    const stockfish = controller.currentNode.analysis
      .stockfish as StockfishEvaluation
    const maia = controller.currentNode.analysis.maia?.[
      currentMaiaModel
    ] as MaiaEvaluation

    return {
      maia,
      stockfish,
    }
  }, [currentMaiaModel, controller.currentNode, analysisState])

  const blunderMeter = useMemo(() => {
    if (!moveEvaluation || !moveEvaluation.maia || !moveEvaluation.stockfish) {
      return { blunderMoveChance: 0, okMoveChance: 0, goodMoveChance: 0 }
    }

    let blunderMoveChance = 0
    let okMoveChance = 0
    let goodMoveChance = 0

    const { maia, stockfish } = moveEvaluation

    if (game.type === 'tournament') {
      return { blunderMoveChance, okMoveChance, goodMoveChance }
    } else {
      if (!maia || !stockfish)
        return { blunderMoveChance, okMoveChance, goodMoveChance }
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
    if (!controller.currentNode) return
    const maia = controller.currentNode.analysis.maia
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
  }, [currentMaiaModel, moveEvaluation, controller.currentNode, analysisState])

  const moveRecommendations = useMemo(() => {
    if (!moveEvaluation) return {}
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
  }, [moveEvaluation])

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
  }, [moveEvaluation])

  const move = useMemo(() => {
    if (!currentMove) return undefined

    const chess = new Chess(controller.currentNode?.fen)
    const san = chess.move({ from: currentMove[0], to: currentMove[1] })?.san

    if (san) {
      return {
        move: currentMove,
        fen: chess.fen(),
        check: chess.inCheck(),
        san,
      }
    }

    return undefined
  }, [currentMove, controller.currentNode])

  return {
    maiaStatus,
    controller,
    downloadMaia,
    maiaProgress,
    move,
    moves,
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
  }
}
