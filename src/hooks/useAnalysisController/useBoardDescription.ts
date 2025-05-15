import { useMemo } from 'react'
import {
  BlunderMeterResult,
  GameNode,
  MaiaEvaluation,
  StockfishEvaluation,
} from 'src/types'
import { MAIA_MODELS } from './constants'

type ColorSanMapping = {
  [move: string]: {
    san: string
    color: string
  }
}

export const useBoardDescription = (
  currentNode: GameNode | null,
  moveEvaluation: {
    maia?: MaiaEvaluation
    stockfish?: StockfishEvaluation
  } | null,
  blunderMeter: BlunderMeterResult,
  colorSanMapping: ColorSanMapping,
) => {
  return useMemo(() => {
    if (
      !currentNode ||
      !moveEvaluation?.stockfish ||
      !moveEvaluation?.maia ||
      moveEvaluation.stockfish.depth < 12
    ) {
      return ''
    }

    const isBlackTurn = currentNode.turn === 'b'
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

    // Calculate winrate for more nuanced description (using centipawn to approximate winrate)
    // Formula approximates winrate from CP value: 1/(1+10^(-cp/400))
    const rawWinrate = 1 / (1 + Math.pow(10, -cp / 400))
    const winrate = Math.max(0.01, Math.min(0.99, rawWinrate)) // Clamp between 1% and 99%
    const toMoveWinrate = isBlackTurn ? 1 - winrate : winrate
    const toMoveAdvantage = toMoveWinrate > 0.5

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
    const maiaModelsAgree = Object.entries(currentNode.analysis.maia || {})
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

    // Evaluation description that considers whose turn it is
    if (isOverwhelming) {
      if (cpAdvantage === playerColor) {
        evaluation = `${playerColor} has a completely winning position with a ${Math.round(toMoveWinrate * 100)}% win probability.`
      } else {
        evaluation = `${playerColor} faces a nearly lost position with only a ${Math.round(toMoveWinrate * 100)}% win probability.`
      }
    } else if (cp === 0) {
      evaluation = isBalancedButComplex
        ? 'The position is balanced but filled with complications.'
        : 'The position is completely equal.'
    } else if (absCP < 30) {
      evaluation = `The evaluation is almost perfectly balanced with only the slightest edge ${cpAdvantage === playerColor ? 'for' : 'against'} ${playerColor}.`
    } else if (absCP < 80) {
      if (cpAdvantage === playerColor) {
        evaluation = `${playerColor} has a slight but tangible advantage with a win probability of ${Math.round(toMoveWinrate * 100)}%.`
      } else {
        evaluation = `${playerColor} faces a slight disadvantage with a win probability of ${Math.round(toMoveWinrate * 100)}%.`
      }
    } else if (absCP < 150) {
      if (cpAdvantage === playerColor) {
        evaluation = `${playerColor} has a clear positional advantage that could be decisive with careful play.`
      } else {
        evaluation = `${playerColor} must play accurately as ${opponent} holds a clear positional advantage.`
      }
    } else if (absCP < 300) {
      if (cpAdvantage === playerColor) {
        evaluation = `${playerColor} has a significant advantage (${Math.round(toMoveWinrate * 100)}% win rate) that should be convertible with proper technique.`
      } else {
        evaluation = `${playerColor} faces a difficult position as ${opponent} has a significant advantage (${Math.round((1 - toMoveWinrate) * 100)}% win rate).`
      }
    } else if (absCP < 500) {
      if (cpAdvantage === playerColor) {
        evaluation = `${playerColor} is winning and only needs to avoid major blunders to convert.`
      } else {
        evaluation = `${playerColor} is in serious trouble and needs to find resilient defensive moves.`
      }
    } else {
      if (cpAdvantage === playerColor) {
        evaluation = `${playerColor} has a completely winning position with a ${Math.round(toMoveWinrate * 100)}% win probability.`
      } else {
        evaluation = `${playerColor} faces a nearly lost position with only a ${Math.round(toMoveWinrate * 100)}% win probability.`
      }
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
  }, [currentNode, moveEvaluation, blunderMeter, colorSanMapping])
}
