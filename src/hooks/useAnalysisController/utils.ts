import { Chess } from 'chess.ts'
import { COLORS, MOVE_CLASSIFICATION_THRESHOLDS } from 'src/constants/analysis'
import {
  BlunderInfo,
  BlunderMeterResult,
  MaiaEvaluation,
  StockfishEvaluation,
  GameNode,
} from 'src/types'

type ColorSanMappingResult = {
  [move: string]: {
    san: string
    color: string
  }
}

// Unified function to calculate color for a single move
export const calculateMoveColor = (
  stockfish: StockfishEvaluation | undefined,
  moveKey: string,
): string => {
  if (!stockfish) return '#FFF'

  // Use winrate_loss_vec if available, otherwise fall back to cp_relative_vec
  const winrateLoss = stockfish?.winrate_loss_vec?.[moveKey]
  const relativeEval = stockfish?.cp_relative_vec[moveKey]

  if (winrateLoss !== undefined) {
    if (winrateLoss >= -MOVE_CLASSIFICATION_THRESHOLDS.INACCURACY_THRESHOLD) {
      return COLORS.good[0]
    } else if (
      winrateLoss >= -MOVE_CLASSIFICATION_THRESHOLDS.BLUNDER_THRESHOLD
    ) {
      return COLORS.ok[0]
    } else {
      return COLORS.blunder[0]
    }
  } else if (relativeEval !== undefined) {
    if (relativeEval >= -50) {
      return COLORS.good[0]
    } else if (relativeEval >= -150) {
      return COLORS.ok[0]
    } else {
      return COLORS.blunder[0]
    }
  }

  return '#FFF'
}

export const generateColorSanMapping = (
  stockfish: StockfishEvaluation | undefined,
  fen: string,
): ColorSanMappingResult => {
  const mapping: ColorSanMappingResult = {}

  const chess = new Chess(fen)
  const moves = chess.moves({ verbose: true })

  if (!stockfish) return mapping

  moves.forEach((m) => {
    const moveKey = `${m.from}${m.to}${m.promotion || ''}`
    const color = calculateMoveColor(stockfish, moveKey)

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
          return (
            winrateLoss !== undefined &&
            winrateLoss >= -MOVE_CLASSIFICATION_THRESHOLDS.INACCURACY_THRESHOLD
          )
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
            winrateLoss >= -MOVE_CLASSIFICATION_THRESHOLDS.BLUNDER_THRESHOLD &&
            winrateLoss < -MOVE_CLASSIFICATION_THRESHOLDS.INACCURACY_THRESHOLD
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
          return (
            winrateLoss !== undefined &&
            winrateLoss < -MOVE_CLASSIFICATION_THRESHOLDS.BLUNDER_THRESHOLD
          )
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
      const goodMoves = moves
        .map((m) => `${m.from}${m.to}${m.promotion || ''}`)
        .filter((move) => stockfish.cp_relative_vec[move] >= -50)
        .sort(
          (a, b) => stockfish.cp_relative_vec[b] - stockfish.cp_relative_vec[a],
        )

      const okMoves = moves
        .map((m) => `${m.from}${m.to}${m.promotion || ''}`)
        .filter(
          (move) =>
            stockfish.cp_relative_vec[move] >= -150 &&
            stockfish.cp_relative_vec[move] < -50,
        )
        .sort(
          (a, b) => stockfish.cp_relative_vec[b] - stockfish.cp_relative_vec[a],
        )

      const blunderMoves = moves
        .map((m) => `${m.from}${m.to}${m.promotion || ''}`)
        .filter((move) => stockfish.cp_relative_vec[move] < -150)
        .sort(
          (a, b) => stockfish.cp_relative_vec[b] - stockfish.cp_relative_vec[a],
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
}

export const calculateBlunderMeter = (
  maia: MaiaEvaluation | undefined,
  stockfish: StockfishEvaluation | undefined,
): BlunderMeterResult => {
  if (!maia || !stockfish) {
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

  if (stockfish.winrate_loss_vec) {
    for (const [move, prob] of Object.entries(maia.policy)) {
      const winrate_loss = stockfish.winrate_loss_vec[move]
      if (winrate_loss === undefined) continue
      const probability = prob * 100

      if (
        winrate_loss >= -MOVE_CLASSIFICATION_THRESHOLDS.INACCURACY_THRESHOLD
      ) {
        goodMoveProbability += probability
        goodMoveChanceInfo.push({ move, probability })
      } else if (
        winrate_loss >= -MOVE_CLASSIFICATION_THRESHOLDS.BLUNDER_THRESHOLD
      ) {
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
  const rawPercentages = [
    { key: 'good', value: goodMoveProbability },
    { key: 'ok', value: okMoveProbability },
    { key: 'blunder', value: blunderMoveProbability },
  ]

  const flooredPercentages = rawPercentages.map((p) => ({
    ...p,
    floored: Math.floor(p.value),
    fractional: p.value - Math.floor(p.value),
  }))

  const totalFloored = flooredPercentages.reduce((sum, p) => sum + p.floored, 0)
  const remainingPoints = Math.max(0, Math.min(100 - totalFloored, 100))

  const sortedByFractional = [...flooredPercentages].sort(
    (a, b) => b.fractional - a.fractional,
  )

  for (let i = 0; i < remainingPoints && i < sortedByFractional.length; i++) {
    if (sortedByFractional[i]) {
      sortedByFractional[i].floored += 1
    }
  }

  const adjustedGood = sortedByFractional.find(
    (p) => p && p.key === 'good',
  ) || {
    floored: 0,
  }
  const adjustedOk = sortedByFractional.find((p) => p && p.key === 'ok') || {
    floored: 0,
  }
  const adjustedBlunder = sortedByFractional.find(
    (p) => p && p.key === 'blunder',
  ) || { floored: 0 }

  return {
    blunderMoves: {
      probability: adjustedBlunder.floored,
      moves: blunderMoveChanceInfo,
    },
    okMoves: {
      probability: adjustedOk.floored,
      moves: okMoveChanceInfo,
    },
    goodMoves: {
      probability: adjustedGood.floored,
      moves: goodMoveChanceInfo,
    },
  }
}

export const getBestMoves = (
  currentNode: GameNode | null,
  maiaModel = 'maia_kdd_1500',
): {
  maiaBestMove: string | null
  stockfishBestMove: string | null
} => {
  if (!currentNode) {
    return { maiaBestMove: null, stockfishBestMove: null }
  }

  const chess = new Chess(currentNode.fen)
  const isBlackTurn = chess.turn() === 'b'

  // Get Maia best move
  let maiaBestMove: string | null = null
  if (currentNode.analysis?.maia?.[maiaModel]?.policy) {
    const maiaPolicy = currentNode.analysis.maia[maiaModel].policy
    const maiaEntries = Object.entries(maiaPolicy)
    if (maiaEntries.length > 0) {
      // Maia policy is probability-based, so higher is always better regardless of turn
      const bestMove = maiaEntries.reduce((a, b) =>
        maiaPolicy[a[0]] > maiaPolicy[b[0]] ? a : b,
      )
      maiaBestMove = bestMove[0]
    }
  }

  // Get Stockfish best move
  let stockfishBestMove: string | null = null
  if (currentNode.analysis?.stockfish?.cp_vec) {
    const stockfishEntries = Object.entries(
      currentNode.analysis.stockfish.cp_vec,
    )
    if (stockfishEntries.length > 0) {
      const cpVec = currentNode.analysis.stockfish.cp_vec
      // For black turn, lower centipawn is better (since cp is from white's perspective)
      // For white turn, higher centipawn is better
      const bestMove = stockfishEntries.reduce((a, b) =>
        isBlackTurn
          ? cpVec[a[0]] < cpVec[b[0]]
            ? a
            : b
          : cpVec[a[0]] > cpVec[b[0]]
            ? a
            : b,
      )
      stockfishBestMove = bestMove[0]
    }
  }

  return { maiaBestMove, stockfishBestMove }
}
