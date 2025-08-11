import { Chess } from 'chess.ts'
import { cpToWinrate } from './stockfish'
import {
  GameTree,
  GameNode,
  RawMove,
  MistakePosition,
  MoveValueMapping,
  StockfishEvaluation,
  CachedEngineAnalysisEntry,
} from 'src/types'

export function convertBackendEvalToStockfishEval(
  possibleMoves: MoveValueMapping,
  turn: 'w' | 'b',
): StockfishEvaluation {
  const cp_vec: { [key: string]: number } = {}
  const cp_relative_vec: { [key: string]: number } = {}
  let model_optimal_cp = -Infinity
  let model_move = ''

  for (const move in possibleMoves) {
    const cp = possibleMoves[move]
    cp_vec[move] = cp
    if (cp > model_optimal_cp) {
      model_optimal_cp = cp
      model_move = move
    }
  }

  for (const move in cp_vec) {
    const cp = possibleMoves[move]
    cp_relative_vec[move] = cp - model_optimal_cp
  }

  const cp_vec_sorted = Object.fromEntries(
    Object.entries(cp_vec).sort(([, a], [, b]) => b - a),
  )

  const cp_relative_vec_sorted = Object.fromEntries(
    Object.entries(cp_relative_vec).sort(([, a], [, b]) => b - a),
  )

  const winrate_vec: { [key: string]: number } = {}
  let max_winrate = -Infinity

  for (const move in cp_vec_sorted) {
    const cp = cp_vec_sorted[move]
    const winrate = cpToWinrate(cp, false)
    winrate_vec[move] = winrate

    if (winrate_vec[move] > max_winrate) {
      max_winrate = winrate_vec[move]
    }
  }

  const winrate_loss_vec: { [key: string]: number } = {}
  for (const move in winrate_vec) {
    winrate_loss_vec[move] = winrate_vec[move] - max_winrate
  }

  const winrate_vec_sorted = Object.fromEntries(
    Object.entries(winrate_vec).sort(([, a], [, b]) => b - a),
  )

  const winrate_loss_vec_sorted = Object.fromEntries(
    Object.entries(winrate_loss_vec).sort(([, a], [, b]) => b - a),
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
    winrate_vec: winrate_vec_sorted,
    winrate_loss_vec: winrate_loss_vec_sorted,
  }
}

export function insertBackendStockfishEvalToGameTree(
  tree: GameTree,
  moves: RawMove[],
  stockfishEvaluations: MoveValueMapping[],
) {
  let currentNode: GameNode | null = tree.getRoot()

  for (let i = 0; i < moves.length; i++) {
    if (!currentNode) {
      break
    }

    const stockfishEval = stockfishEvaluations[i]
      ? convertBackendEvalToStockfishEval(
          stockfishEvaluations[i],
          moves[i].board.split(' ')[1] as 'w' | 'b',
        )
      : undefined

    if (stockfishEval) {
      currentNode.addStockfishAnalysis(stockfishEval)
    }
    currentNode = currentNode?.mainChild
  }
}

export const collectEngineAnalysisData = (
  gameTree: GameTree,
): CachedEngineAnalysisEntry[] => {
  const positions: CachedEngineAnalysisEntry[] = []
  const mainLine = gameTree.getMainLine()

  mainLine.forEach((node, index) => {
    if (!node.analysis.maia && !node.analysis.stockfish) {
      return
    }

    const position: CachedEngineAnalysisEntry = {
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

const reconstructCachedStockfishAnalysis = (
  cpVec: { [move: string]: number },
  depth: number,
  fen: string,
) => {
  const board = new Chess(fen)
  const isBlackTurn = board.turn() === 'b'

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

  const cp_relative_vec: { [move: string]: number } = {}
  for (const move in cpVec) {
    const cp = cpVec[move]
    cp_relative_vec[move] = isBlackTurn ? bestCp - cp : cp - bestCp
  }

  const winrate_vec: { [move: string]: number } = {}
  for (const move in cpVec) {
    const cp = cpVec[move]
    const winrate = cpToWinrate(cp * (isBlackTurn ? -1 : 1), false)
    winrate_vec[move] = winrate
  }

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

export const applyEngineAnalysisData = (
  gameTree: GameTree,
  analysisData: CachedEngineAnalysisEntry[],
): void => {
  const mainLine = gameTree.getMainLine()

  analysisData.forEach((positionData) => {
    const { ply, maia, stockfish } = positionData

    if (ply >= 0 && ply < mainLine.length) {
      const node = mainLine[ply]

      if (node.fen === positionData.fen) {
        if (maia) {
          node.addMaiaAnalysis(maia)
        }

        if (stockfish) {
          const stockfishEval = reconstructCachedStockfishAnalysis(
            stockfish.cp_vec,
            stockfish.depth,
            node.fen,
          )

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

export const generateAnalysisCacheKey = (
  analysisData: CachedEngineAnalysisEntry[],
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

export function extractPlayerMistakes(
  gameTree: GameTree,
  playerColor: 'white' | 'black',
): MistakePosition[] {
  const mainLine = gameTree.getMainLine()
  const mistakes: MistakePosition[] = []

  for (let i = 1; i < mainLine.length; i++) {
    const node = mainLine[i]
    const isPlayerMove = node.turn === (playerColor === 'white' ? 'b' : 'w')

    if (
      isPlayerMove &&
      (node.blunder || node.inaccuracy) &&
      node.move &&
      node.san
    ) {
      const parentNode = node.parent
      if (!parentNode) continue

      const stockfishEval = parentNode.analysis.stockfish
      if (!stockfishEval || !stockfishEval.model_move) continue

      const chess = new Chess(parentNode.fen)
      const bestMoveResult = chess.move(stockfishEval.model_move, {
        sloppy: true,
      })
      if (!bestMoveResult) continue

      mistakes.push({
        nodeId: `move-${i}`, // Simple ID based on position in main line
        moveIndex: i, // Index of the mistake node in the main line
        fen: parentNode.fen, // Position before the mistake
        playedMove: node.move,
        san: node.san,
        type: node.blunder ? 'blunder' : 'inaccuracy',
        bestMove: stockfishEval.model_move,
        bestMoveSan: bestMoveResult.san,
        playerColor,
      })
    }
  }

  return mistakes
}

export function getBestMoveForPosition(node: GameNode): {
  move: string
  san: string
} | null {
  const stockfishEval = node.analysis.stockfish
  if (!stockfishEval || !stockfishEval.model_move) {
    return null
  }

  const chess = new Chess(node.fen)
  const moveResult = chess.move(stockfishEval.model_move, { sloppy: true })

  if (!moveResult) {
    return null
  }

  return {
    move: stockfishEval.model_move,
    san: moveResult.san,
  }
}

export function isBestMove(node: GameNode, moveUci: string): boolean {
  const bestMove = getBestMoveForPosition(node)
  return bestMove ? bestMove.move === moveUci : false
}
