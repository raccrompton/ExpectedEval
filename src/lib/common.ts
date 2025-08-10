import { GameTree } from 'src/types'

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
