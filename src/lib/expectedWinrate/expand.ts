import { Chess } from 'chess.ts'
import { useContext } from 'react'
import { MaiaEngineContext } from 'src/contexts/MaiaEngineContext/MaiaEngineContext'
import { ExpectedWinrateNode, ExpectedWinrateParams } from './types'

export const useMaiaExpand = () => {
  const { maia } = useContext(MaiaEngineContext)

  const expandOnce = async (
    fen: string,
    params: ExpectedWinrateParams,
  ): Promise<{ move: string; san: string; prob: number; nextFen: string }[]> => {
    if (!maia) return []
    const elo = 1500
    const { policy } = await maia.evaluate(fen, elo, elo)
    const board = new Chess(fen)
    const moves = board.moves({ verbose: true })
    const results: { move: string; san: string; prob: number; nextFen: string }[] = []
    for (const m of moves) {
      const uci = `${m.from}${m.to}${m.promotion || ''}`
      const prob = policy[uci] ?? 0
      if (prob > 0) {
        board.move(m)
        results.push({
          move: uci,
          san: m.san,
          prob,
          nextFen: board.fen(),
        })
        board.undo()
      }
    }
    results.sort((a, b) => b.prob - a.prob)
    return results
  }

  const expandTree = async (
    rootFen: string,
    params: ExpectedWinrateParams,
  ): Promise<ExpectedWinrateNode[]> => {
    const threshold = params.probThreshold
    const root = new Chess(rootFen)
    const playerToMove = root.turn() // 'w' | 'b'
    const nodes: ExpectedWinrateNode[] = []

    const stack: {
      fen: string
      path: string[]
      prob: number
      turn: 'w' | 'b'
    }[] = [{ fen: rootFen, path: [], prob: 1, turn: playerToMove }]

    while (stack.length) {
      const cur = stack.pop()!
      if (cur.prob < threshold) continue
      const children = await expandOnce(cur.fen, params)
      if (!children.length) continue

      for (const ch of children) {
        const nextBoard = new Chess(cur.fen)
        nextBoard.move(ch.san, { sloppy: true })
        const n: ExpectedWinrateNode = {
          fen: ch.nextFen,
          path: [...cur.path, ch.move],
          cumulativeProb: cur.prob * ch.prob,
          turn: nextBoard.turn(),
          pruned: false,
        }
        nodes.push(n)
        stack.push({
          fen: ch.nextFen,
          path: n.path,
          prob: n.cumulativeProb,
          turn: n.turn,
        })
      }
    }

    return nodes
  }

  return { expandTree }
}
