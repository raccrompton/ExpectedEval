import { cpToWinrate } from './stockfish'
import { GameTree, MoveMap, StockfishEvaluation } from 'src/types'

export function buildGameTreeFromMoveList(moves: any[], initialFen: string) {
  const tree = new GameTree(initialFen)
  let currentNode = tree.getRoot()

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i]

    if (move.lastMove) {
      const [from, to] = move.lastMove
      currentNode = tree.addMainMove(
        currentNode,
        move.board,
        from + to,
        move.san || '',
      )
    }
  }

  return tree
}

export function convertBackendEvalToStockfishEval(
  moveMap: {
    [move: string]: number
  },
  turn: 'w' | 'b',
): StockfishEvaluation {
  const cp_vec: { [key: string]: number } = {}
  const cp_relative_vec: { [key: string]: number } = {}
  let model_optimal_cp = -Infinity
  let model_move = ''

  for (const move in moveMap) {
    const cp = moveMap[move]
    cp_vec[move] = cp
    if (cp > model_optimal_cp) {
      model_optimal_cp = cp
      model_move = move
    }
  }

  for (const move in cp_vec) {
    const cp = moveMap[move]
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
