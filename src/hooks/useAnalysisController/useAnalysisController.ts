import { Chess } from 'chess.ts'
import React, { useEffect, useMemo, useState, useCallback } from 'react'

import {
  GameTree,
  AnalyzedGame,
  MaiaEvaluation,
  StockfishEvaluation,
  BlunderMeterResult,
  BlunderInfo,
} from 'src/types'
import {
  useStockfishEngine,
  useMaiaEngine,
  useAnalysisGameController,
  useLocalStorage,
} from '..'

const COLORS = {
  good: ['#238b45', '#41ab5d', '#74c476', '#a1d99b', '#c7e9c0'],
  ok: ['#ec7014', '#feb24c', '#fed976', '#ffeda0', '#ffffcc'].reverse(),
  blunder: ['#cb181d', '#ef3b2c', '#fb6a4a', '#fc9272', '#fcbba1'].reverse(),
}

// Constants for move classification based on winrate
const BLUNDER_THRESHOLD = 0.1 // 10% winrate drop
const INACCURACY_THRESHOLD = 0.05 // 5% winrate drop
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
  const [currentMaiaModel, setCurrentMaiaModel] = useLocalStorage(
    'currentMaiaModel',
    MAIA_MODELS[0],
  )

  useEffect(() => {
    if (!MAIA_MODELS.includes(currentMaiaModel)) {
      setCurrentMaiaModel(MAIA_MODELS[0])
    }
  }, [currentMaiaModel, MAIA_MODELS, setCurrentMaiaModel])

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
    const stockfish = controller.currentNode.analysis.stockfish

    // Define thresholds for winrate loss
    const GOOD_THRESHOLD = -INACCURACY_THRESHOLD // -0.05 (less than 5% winrate loss)
    const OK_THRESHOLD = -BLUNDER_THRESHOLD // -0.1 (between 5% and 10% winrate loss)
    // Anything worse than -0.1 is a blunder

    moves.forEach((m) => {
      const moveKey = `${m.from}${m.to}`
      // Use winrate_loss_vec if available, otherwise fall back to cp_relative_vec
      const winrateLoss = stockfish?.winrate_loss_vec?.[moveKey]
      const relativeEval = stockfish?.cp_relative_vec[moveKey]

      let color = '#FFF'

      if (winrateLoss !== undefined) {
        // Use winrate loss for coloring
        if (winrateLoss >= GOOD_THRESHOLD) {
          color = COLORS.good[0]
        } else if (winrateLoss >= OK_THRESHOLD) {
          color = COLORS.ok[0]
        } else {
          color = COLORS.blunder[0]
        }
      } else if (relativeEval !== undefined) {
        // Fall back to CP-based coloring if winrate is not available
        if (relativeEval >= -50) {
          color = COLORS.good[0]
        } else if (relativeEval >= -150) {
          color = COLORS.ok[0]
        } else {
          color = COLORS.blunder[0]
        }
      }

      mapping[moveKey] = {
        san: m.san,
        color,
      }
    })

    if (stockfish) {
      if (
        stockfish.winrate_loss_vec &&
        Object.keys(stockfish.winrate_loss_vec).length > 0
      ) {
        const goodMoves = moves
          .map((m) => `${m.from}${m.to}${m.promotion || ''}`)
          .filter((move) => {
            const winrateLoss = stockfish.winrate_loss_vec?.[move]
            return winrateLoss !== undefined && winrateLoss >= GOOD_THRESHOLD
          })
          .sort((a, b) => {
            const aLoss = stockfish.winrate_loss_vec?.[a] || 0
            const bLoss = stockfish.winrate_loss_vec?.[b] || 0
            return bLoss - aLoss
          })

        const okMoves = moves
          .map((m) => `${m.from}${m.to}${m.promotion || ''}`)
          .filter((move) => {
            const winrateLoss = stockfish.winrate_loss_vec?.[move]
            return (
              winrateLoss !== undefined &&
              winrateLoss >= OK_THRESHOLD &&
              winrateLoss < GOOD_THRESHOLD
            )
          })
          .sort((a, b) => {
            const aLoss = stockfish.winrate_loss_vec?.[a] || 0
            const bLoss = stockfish.winrate_loss_vec?.[b] || 0
            return bLoss - aLoss
          })

        const blunderMoves = moves
          .map((m) => `${m.from}${m.to}${m.promotion || ''}`)
          .filter((move) => {
            const winrateLoss = stockfish.winrate_loss_vec?.[move]
            return winrateLoss !== undefined && winrateLoss < OK_THRESHOLD
          })
          .sort((a, b) => {
            const aLoss = stockfish.winrate_loss_vec?.[a] || 0
            const bLoss = stockfish.winrate_loss_vec?.[b] || 0
            return bLoss - aLoss
          })

        goodMoves.forEach((move, i) => {
          mapping[move].color = COLORS.good[Math.min(i, COLORS.good.length - 1)]
        })

        okMoves.forEach((move, i) => {
          mapping[move].color = COLORS.ok[Math.min(i, COLORS.ok.length - 1)]
        })

        blunderMoves.forEach((move, i) => {
          mapping[move].color =
            COLORS.blunder[Math.min(i, COLORS.blunder.length - 1)]
        })
      } else {
        // Fall back to CP-based coloring if winrate is not available
        const goodMoves = moves
          .map((m) => `${m.from}${m.to}${m.promotion || ''}`)
          .filter((move) => stockfish.cp_relative_vec[move] >= -50)
          .sort(
            (a, b) =>
              stockfish.cp_relative_vec[b] - stockfish.cp_relative_vec[a],
          )

        const okMoves = moves
          .map((m) => `${m.from}${m.to}${m.promotion || ''}`)
          .filter(
            (move) =>
              stockfish.cp_relative_vec[move] >= -150 &&
              stockfish.cp_relative_vec[move] < -50,
          )
          .sort(
            (a, b) =>
              stockfish.cp_relative_vec[b] - stockfish.cp_relative_vec[a],
          )

        const blunderMoves = moves
          .map((m) => `${m.from}${m.to}${m.promotion || ''}`)
          .filter((move) => stockfish.cp_relative_vec[move] < -150)
          .sort(
            (a, b) =>
              stockfish.cp_relative_vec[b] - stockfish.cp_relative_vec[a],
          )

        goodMoves.forEach((move, i) => {
          mapping[move].color = COLORS.good[Math.min(i, COLORS.good.length - 1)]
        })

        okMoves.forEach((move, i) => {
          mapping[move].color = COLORS.ok[Math.min(i, COLORS.ok.length - 1)]
        })

        blunderMoves.forEach((move, i) => {
          mapping[move].color =
            COLORS.blunder[Math.min(i, COLORS.blunder.length - 1)]
        })
      }
    }

    return mapping
  }, [controller.currentNode, analysisState])

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

  const blunderMeter = useMemo<BlunderMeterResult>(() => {
    if (!moveEvaluation || !moveEvaluation.maia || !moveEvaluation.stockfish) {
      return {
        blunderMoves: { probability: 0, moves: [] },
        okMoves: { probability: 0, moves: [] },
        goodMoves: { probability: 0, moves: [] },
      }
    }

    const blunderMoveChanceInfo: BlunderInfo[] = []
    const okMoveChanceInfo: BlunderInfo[] = []
    const goodMoveChanceInfo: BlunderInfo[] = []

    let blunderMoveProbability = 0
    let okMoveProbability = 0
    let goodMoveProbability = 0

    const { maia, stockfish } = moveEvaluation

    if (!maia || !stockfish)
      return {
        blunderMoves: { probability: 0, moves: [] },
        okMoves: { probability: 0, moves: [] },
        goodMoves: { probability: 0, moves: [] },
      }

    if (stockfish.winrate_loss_vec) {
      for (const [move, prob] of Object.entries(maia.policy)) {
        const winrate_loss = stockfish.winrate_loss_vec[move]
        if (winrate_loss === undefined) continue
        const probability = prob * 100

        if (winrate_loss >= -INACCURACY_THRESHOLD) {
          goodMoveProbability += probability
          goodMoveChanceInfo.push({ move, probability })
        } else if (winrate_loss >= -BLUNDER_THRESHOLD) {
          okMoveProbability += probability
          okMoveChanceInfo.push({ move, probability })
        } else {
          blunderMoveProbability += probability
          blunderMoveChanceInfo.push({ move, probability })
        }
      }
    } else {
      for (const [move, prob] of Object.entries(maia.policy)) {
        const loss = stockfish.cp_relative_vec[move]
        if (loss === undefined) continue
        const probability = prob * 100

        if (loss >= -50) {
          goodMoveProbability += probability
          goodMoveChanceInfo.push({ move, probability })
        } else if (loss >= -150) {
          okMoveProbability += probability
          okMoveChanceInfo.push({ move, probability })
        } else {
          blunderMoveProbability += probability
          blunderMoveChanceInfo.push({ move, probability })
        }
      }
    }

    return {
      blunderMoves: {
        probability: blunderMoveProbability,
        moves: blunderMoveChanceInfo,
      },
      okMoves: {
        probability: okMoveProbability,
        moves: okMoveChanceInfo,
      },
      goodMoves: {
        probability: goodMoveProbability,
        moves: goodMoveChanceInfo,
      },
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

    const isBlackTurn = controller.currentNode?.turn === 'b'

    const recommendations: {
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

      recommendations.maia = maia
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

      recommendations.stockfish = stockfish
    }

    return recommendations
  }, [moveEvaluation, controller.currentNode])

  const moveMap = useMemo(() => {
    if (!moveEvaluation?.maia || !moveEvaluation?.stockfish) {
      return
    }

    // Get the 3 best moves from Maia
    const maia = Object.fromEntries(
      Object.entries(moveEvaluation.maia.policy).slice(0, 3),
    )

    // Get the Stockfish moves in their sorted order (best to worst for the current player)
    const stockfishMoves = Object.entries(moveEvaluation.stockfish.cp_vec)

    // Top moves are the first 3 in the sorted order
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

  const boardDescription = useMemo(() => {
    if (
      !controller.currentNode ||
      !moveEvaluation?.stockfish ||
      !moveEvaluation?.maia ||
      moveEvaluation.stockfish.depth < 12
    ) {
      return ''
    }

    const isBlackTurn = controller.currentNode.turn === 'b'
    const playerColor = isBlackTurn ? 'Black' : 'White'
    const opponent = isBlackTurn ? 'White' : 'Black'
    const stockfish = moveEvaluation.stockfish
    const maia = moveEvaluation.maia
    const topMaiaMove = Object.entries(maia.policy).sort(
      (a, b) => b[1] - a[1],
    )[0]
    const topStockfishMoves = Object.entries(stockfish.cp_vec)
      .sort((a, b) => (isBlackTurn ? a[1] - b[1] : b[1] - a[1]))
      .slice(0, 3)

    const cp = stockfish.model_optimal_cp
    const absCP = Math.abs(cp)
    const cpAdvantage = cp > 0 ? 'White' : cp < 0 ? 'Black' : 'Neither player'
    const topStockfishMove = topStockfishMoves[0]

    // Check if top Maia move matches top Stockfish move
    const maiaMatchesStockfish = topMaiaMove[0] === topStockfishMove[0]

    // Get top few Maia moves and their cumulative probability
    const top3MaiaMoves = Object.entries(maia.policy)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
    const top3MaiaProbability =
      top3MaiaMoves.reduce((sum, [_, prob]) => sum + prob, 0) * 100

    // Get second best moves to analyze move clarity
    const secondBestMaiaMove = top3MaiaMoves[1]
    const secondBestMaiaProbability = secondBestMaiaMove
      ? secondBestMaiaMove[1] * 100
      : 0

    // Calculate spread between first and second-best moves
    const probabilitySpread = topMaiaMove[1] * 100 - secondBestMaiaProbability

    // Get move classifications
    const blunderProbability = blunderMeter.blunderMoves.probability
    const okProbability = blunderMeter.okMoves.probability
    const goodProbability = blunderMeter.goodMoves.probability

    // Check for patterns in stockfish evaluation
    const stockfishTop3Spread =
      topStockfishMoves.length > 2
        ? Math.abs(topStockfishMoves[0][1] - topStockfishMoves[2][1])
        : 0

    // Get move spreads to detect sharp positions
    const moveCpSpread = Object.values(stockfish.cp_relative_vec).reduce(
      (maxDiff, cp, _, arr) => {
        const min = Math.min(...arr)
        const max = Math.max(...arr)
        return Math.max(maxDiff, max - min)
      },
      0,
    )

    // Calculate position complexity based on distribution of move quality
    const isPositionComplicated =
      (blunderProbability > 30 && okProbability > 20 && goodProbability < 50) ||
      moveCpSpread > 300 ||
      stockfishTop3Spread > 100

    // Check for tactical position
    const isTacticalPosition = moveCpSpread > 500 || stockfishTop3Spread > 150

    // Check if there's a clear best move
    const topMaiaProbability = topMaiaMove[1] * 100
    const isClearBestMove = topMaiaProbability > 70 || probabilitySpread > 40

    // Check if there are multiple equally good moves
    const hasMultipleGoodMoves =
      top3MaiaProbability > 75 && topMaiaProbability < 50

    // Calculate agreement between Maia rating levels
    const maiaModelsAgree = Object.entries(
      controller.currentNode.analysis.maia || {},
    )
      .filter(([key]) => MAIA_MODELS.includes(key))
      .every(([_, evaluation]) => {
        const topMove = Object.entries(evaluation.policy).sort(
          (a, b) => b[1] - a[1],
        )[0]
        return topMove && topMove[0] === topMaiaMove[0]
      })

    // Check if evaluation is decisive
    const isDecisiveAdvantage = absCP > 300
    const isOverwhelming = absCP > 800

    // Check for high blunder probability
    const isBlunderProne = blunderProbability > 50
    const isVeryBlunderProne = blunderProbability > 70

    // Check if there's forced play
    const isForcedPlay = topMaiaProbability > 85 && maiaMatchesStockfish

    // Check if position is balanced but with complexity
    const isBalancedButComplex = absCP < 50 && isPositionComplicated

    // Generate descriptions
    let evaluation = ''
    let suggestion = ''

    // Evaluation description
    if (isOverwhelming) {
      evaluation = `${cpAdvantage} is completely winning and should convert without difficulty.`
    } else if (cp === 0) {
      evaluation = isBalancedButComplex
        ? 'The position is balanced but filled with complications.'
        : 'The position is completely equal.'
    } else if (absCP < 30) {
      evaluation = `The evaluation is almost perfectly balanced with only the slightest edge for ${cpAdvantage}.`
    } else if (absCP < 80) {
      evaluation = `${cpAdvantage} has a slight but tangible advantage in this position.`
    } else if (absCP < 150) {
      evaluation = `${cpAdvantage} has a clear positional advantage that could be decisive with careful play.`
    } else if (absCP < 300) {
      evaluation = `${cpAdvantage} has a significant advantage that should be convertible with proper technique.`
    } else if (absCP < 500) {
      evaluation = `${cpAdvantage} has a winning position that only requires avoiding major blunders.`
    } else {
      evaluation = `${cpAdvantage} has a completely winning position that should be straightforward to convert.`
    }

    // Suggestion/description of move quality
    if (isVeryBlunderProne) {
      suggestion = `This critical position is extremely treacherous with a ${blunderProbability.toFixed(0)}% chance of ${playerColor} making a significant error.`
    } else if (isBlunderProne && isTacticalPosition) {
      suggestion = `The sharp tactical nature of this position creates many opportunities for mistakes (${blunderProbability.toFixed(0)}% blunder chance).`
    } else if (isBlunderProne) {
      suggestion = `This position is quite treacherous with ${blunderProbability.toFixed(0)}% chance of ${playerColor} making a significant mistake.`
    } else if (isForcedPlay) {
      const moveSan = colorSanMapping[topMaiaMove[0]]?.san || topMaiaMove[0]
      suggestion = `${playerColor} must play ${moveSan}, as all other moves lead to a significantly worse position.`
    } else if (isTacticalPosition && maiaMatchesStockfish) {
      const moveSan = colorSanMapping[topMaiaMove[0]]?.san || topMaiaMove[0]
      suggestion = `The tactical complexity demands precision, with ${moveSan} being the only move that maintains the balance.`
    } else if (isPositionComplicated && hasMultipleGoodMoves) {
      suggestion = `This complex position offers several equally promising continuations for ${playerColor}.`
    } else if (isPositionComplicated) {
      suggestion = `This is a complex position requiring careful calculation of the many reasonable options.`
    } else if (isClearBestMove && maiaMatchesStockfish && maiaModelsAgree) {
      const moveSan = colorSanMapping[topMaiaMove[0]]?.san || topMaiaMove[0]
      suggestion = `Players of all levels agree ${moveSan} stands out as clearly best in this position.`
    } else if (isClearBestMove && maiaMatchesStockfish) {
      const moveSan = colorSanMapping[topMaiaMove[0]]?.san || topMaiaMove[0]
      suggestion = `${playerColor} should play ${moveSan}, which both human intuition and concrete calculation confirm as best.`
    } else if (isClearBestMove && maiaModelsAgree) {
      const moveSan = colorSanMapping[topMaiaMove[0]]?.san || topMaiaMove[0]
      suggestion = `Human players at all levels strongly prefer ${moveSan} (${topMaiaProbability.toFixed(0)}%), though the engine suggests otherwise.`
    } else if (isClearBestMove) {
      const moveSan = colorSanMapping[topMaiaMove[0]]?.san || topMaiaMove[0]
      suggestion = `Maia strongly suggests ${moveSan} (${topMaiaProbability.toFixed(0)}% likely), though Stockfish calculates a different approach.`
    } else if (goodProbability > 80) {
      suggestion = `This is a forgiving position where almost any reasonable move by ${playerColor} maintains the evaluation.`
    } else if (goodProbability > 60) {
      suggestion = `Most moves ${playerColor} is likely to consider will maintain the current position assessment.`
    } else if (maiaMatchesStockfish) {
      const moveSan = colorSanMapping[topMaiaMove[0]]?.san || topMaiaMove[0]
      suggestion = `Both human intuition and engine calculation agree that ${moveSan} is the best continuation here.`
    } else if (hasMultipleGoodMoves) {
      suggestion = `${playerColor} has several equally strong options, suggesting flexibility in planning.`
    } else if (top3MaiaProbability < 50) {
      suggestion = `This unusual position creates difficulties for human calculation, with no clearly favored continuation.`
    } else {
      suggestion = `There are several reasonable options for ${playerColor} to consider in this position.`
    }

    return `${evaluation} ${suggestion}`
  }, [
    controller.currentNode,
    moveEvaluation,
    blunderMeter,
    colorSanMapping,
    MAIA_MODELS,
  ])

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
    boardDescription,
  }
}
