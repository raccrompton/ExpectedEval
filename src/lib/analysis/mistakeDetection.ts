import { Chess } from 'chess.ts'
import { GameNode, GameTree } from 'src/types/tree'
import { MistakePosition } from 'src/types/analysis'

/**
 * Extracts all mistakes (blunders and inaccuracies) from the game tree for a specific player
 */
export function extractPlayerMistakes(
  gameTree: GameTree,
  playerColor: 'white' | 'black',
): MistakePosition[] {
  const mainLine = gameTree.getMainLine()
  const mistakes: MistakePosition[] = []

  // Skip the root node (starting position)
  for (let i = 1; i < mainLine.length; i++) {
    const node = mainLine[i]

    // Check if this move was made by the specified player
    const isPlayerMove = node.turn === (playerColor === 'white' ? 'b' : 'w') // opposite because turn indicates who moves next

    if (
      isPlayerMove &&
      (node.blunder || node.inaccuracy) &&
      node.move &&
      node.san
    ) {
      const parentNode = node.parent
      if (!parentNode) continue

      // Get the best move from the parent node's Stockfish analysis
      const stockfishEval = parentNode.analysis.stockfish
      if (!stockfishEval || !stockfishEval.model_move) continue

      // Convert the best move to SAN notation
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

/**
 * Gets the best move for a given position from the node's Stockfish analysis
 */
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

/**
 * Checks if a move matches the best move for a position
 */
export function isBestMove(node: GameNode, moveUci: string): boolean {
  const bestMove = getBestMoveForPosition(node)
  return bestMove ? bestMove.move === moveUci : false
}
