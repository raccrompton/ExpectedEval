import { Chess } from 'chess.ts'
import { GameTree } from 'src/types'
import { EngineAnalysisPosition } from 'src/api/analysis/analysis'
import { cpToWinrate } from 'src/lib/stockfish'

/**
 * Collects analysis data from a game tree to send to the backend
 */
export const collectEngineAnalysisData = (
  gameTree: GameTree,
): EngineAnalysisPosition[] => {
  const positions: EngineAnalysisPosition[] = []
  const mainLine = gameTree.getMainLine()

  mainLine.forEach((node, index) => {
    // Only include positions that have some analysis
    if (!node.analysis.maia && !node.analysis.stockfish) {
      return
    }

    const position: EngineAnalysisPosition = {
      ply: index,
      fen: node.fen,
    }

    if (node.analysis.maia) {
      position.maia = node.analysis.maia
    }

    if (node.analysis.stockfish) {
      position.stockfish = {
        depth: node.analysis.stockfish.depth,
        cp_vec: node.analysis.stockfish.cp_vec,
      }
    }

    positions.push(position)
  })

  return positions
}

/**
 * Applies stored analysis data back to a game tree
 */
export const applyEngineAnalysisData = (
  gameTree: GameTree,
  analysisData: EngineAnalysisPosition[],
): void => {
  const mainLine = gameTree.getMainLine()

  analysisData.forEach((positionData) => {
    const { ply, maia, stockfish } = positionData

    // Find the corresponding node (ply is the index in the main line)
    if (ply >= 0 && ply < mainLine.length) {
      const node = mainLine[ply]

      // Verify FEN matches to ensure we're applying to the correct position
      if (node.fen === positionData.fen) {
        // Apply Maia analysis
        if (maia) {
          node.addMaiaAnalysis(maia)
        }

        // Apply Stockfish analysis
        if (stockfish) {
          const stockfishEval = reconstructStockfishEvaluation(
            stockfish.cp_vec,
            stockfish.depth,
            node.fen,
          )

          // Only apply if we don't have deeper analysis already
          if (
            !node.analysis.stockfish ||
            node.analysis.stockfish.depth < stockfish.depth
          ) {
            node.addStockfishAnalysis(stockfishEval)
          }
        }
      }
    }
  })
}

/**
 * Reconstruct a complete StockfishEvaluation from stored cp_vec using the same logic as the engine
 */
const reconstructStockfishEvaluation = (
  cpVec: { [move: string]: number },
  depth: number,
  fen: string,
) => {
  const board = new Chess(fen)
  const isBlackTurn = board.turn() === 'b'

  // Find the best move and cp (model_move and model_optimal_cp)
  let bestCp = isBlackTurn ? Infinity : -Infinity
  let bestMove = ''

  for (const move in cpVec) {
    const cp = cpVec[move]
    if (isBlackTurn) {
      if (cp < bestCp) {
        bestCp = cp
        bestMove = move
      }
    } else {
      if (cp > bestCp) {
        bestCp = cp
        bestMove = move
      }
    }
  }

  // Calculate cp_relative_vec using exact same logic as engine.ts:215-217
  const cp_relative_vec: { [move: string]: number } = {}
  for (const move in cpVec) {
    const cp = cpVec[move]
    cp_relative_vec[move] = isBlackTurn
      ? bestCp - cp // Black turn: model_optimal_cp - cp
      : cp - bestCp // White turn: cp - model_optimal_cp
  }

  // Calculate winrate_vec using exact same logic as engine.ts:219 and 233
  const winrate_vec: { [move: string]: number } = {}
  for (const move in cpVec) {
    const cp = cpVec[move]
    // Use exact same logic as engine: cp * (isBlackTurn ? -1 : 1)
    const winrate = cpToWinrate(cp * (isBlackTurn ? -1 : 1), false)
    winrate_vec[move] = winrate
  }

  // Calculate winrate_loss_vec using the same logic as the engine (lines 248-264)
  let bestWinrate = -Infinity
  for (const move in winrate_vec) {
    const wr = winrate_vec[move]
    if (wr > bestWinrate) {
      bestWinrate = wr
    }
  }

  const winrate_loss_vec: { [move: string]: number } = {}
  for (const move in winrate_vec) {
    winrate_loss_vec[move] = winrate_vec[move] - bestWinrate
  }

  // Sort all vectors by winrate (descending) as done in engine.ts:267-281
  const sortedEntries = Object.entries(winrate_vec).sort(
    ([, a], [, b]) => b - a,
  )

  const sortedWinrateVec = Object.fromEntries(sortedEntries)
  const sortedWinrateLossVec = Object.fromEntries(
    sortedEntries.map(([move]) => [move, winrate_loss_vec[move]]),
  )

  return {
    sent: true,
    depth,
    model_move: bestMove,
    model_optimal_cp: bestCp,
    cp_vec: cpVec,
    cp_relative_vec,
    winrate_vec: sortedWinrateVec,
    winrate_loss_vec: sortedWinrateLossVec,
  }
}

/**
 * Generate a unique cache key for analysis data
 */
export const generateAnalysisCacheKey = (
  analysisData: EngineAnalysisPosition[],
): string => {
  const keyData = analysisData.map((pos) => ({
    ply: pos.ply,
    fen: pos.fen,
    hasStockfish: !!pos.stockfish,
    stockfishDepth: pos.stockfish?.depth || 0,
    hasMaia: !!pos.maia,
    maiaModels: pos.maia ? Object.keys(pos.maia).sort() : [],
  }))

  return JSON.stringify(keyData)
}
