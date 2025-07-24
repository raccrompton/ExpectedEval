import { GameTree, GameNode } from 'src/types'
import { EngineAnalysisPosition } from 'src/api/analysis/analysis'

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

    // Add Maia analysis if available
    if (node.analysis.maia) {
      position.maia = node.analysis.maia
    }

    // Add Stockfish analysis if available
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
          // Create a StockfishEvaluation object with minimal required fields
          const stockfishEval = {
            sent: true,
            depth: stockfish.depth,
            model_move: Object.keys(stockfish.cp_vec)[0] || '',
            model_optimal_cp: Math.max(
              ...Object.values(stockfish.cp_vec).map(Number),
              0,
            ),
            cp_vec: stockfish.cp_vec,
            cp_relative_vec: calculateRelativeCp(stockfish.cp_vec),
          }

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
 * Helper function to calculate relative centipawn values
 */
const calculateRelativeCp = (cpVec: {
  [move: string]: number
}): { [move: string]: number } => {
  const maxCp = Math.max(...Object.values(cpVec))
  const relativeCp: { [move: string]: number } = {}

  Object.entries(cpVec).forEach(([move, cp]) => {
    relativeCp[move] = cp - maxCp
  })

  return relativeCp
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
