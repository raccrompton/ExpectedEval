import { Chess } from 'chess.ts'
import { StockfishEngineContext } from 'src/contexts/StockfishEngineContext/StockfishEngineContext'
import { useContext } from 'react'
import { StockfishEvaluation } from 'src/types'

export const useStockfishExpected = () => {
  const stockfish = useContext(StockfishEngineContext)

  const legalCount = (fen: string) => {
    const board = new Chess(fen)
    return board.moves().length
  }

  const evaluateAtDepth = async (
    fen: string,
    depth: number,
  ): Promise<StockfishEvaluation | null> => {
    const count = legalCount(fen)
    const stream = stockfish.streamEvaluations(fen, count, depth)
    if (!stream) return null
    let last: StockfishEvaluation | null = null
    for await (const ev of stream) {
      last = ev
      if (ev.depth >= depth) break
    }
    return last
  }

  return { evaluateAtDepth }
}
