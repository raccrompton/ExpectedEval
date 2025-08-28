import React from 'react'
import { renderHook } from '@testing-library/react'
import { StockfishEngineContext } from '../../contexts/StockfishEngineContext/StockfishEngineContext'
import { useStockfishExpected } from '../../lib/expectedWinrate/stockfish'

const makeEval = (depth: number, winrate_vec: Record<string, number>) => ({
  depth,
  model_move: Object.keys(winrate_vec)[0] || 'e2e4',
  model_optimal_cp: 0,
  cp_vec: {},
  cp_relative_vec: {},
  winrate_vec,
  winrate_loss_vec: {},
})

const MockProvider: React.FC<{ children: React.ReactNode; seq: any[] }> = ({
  children,
  seq,
}) => {
  const engine = {
    streamEvaluations: async function* (
      _fen: string,
      _legal: number,
      target: number,
    ) {
      for (const ev of seq) {
        yield ev
      }
    },
    stopEvaluation: () => null,
    isReady: () => true,
    status: 'ready',
    error: null,
  } as any
  return React.createElement(
    StockfishEngineContext.Provider,
    { value: engine },
    children,
  )
}

describe('useStockfishExpected', () => {
  it('awaits stream and returns last evaluation at or before target depth', async () => {
    const seq = [
      makeEval(8, { e2e4: 0.52 }),
      makeEval(12, { e2e4: 0.55 }),
      makeEval(14, { e2e4: 0.58 }),
    ]
    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
      React.createElement(MockProvider, { seq } as any, children as any)
    const { result } = renderHook(() => useStockfishExpected(), {
      wrapper: Wrapper as any,
    })
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const ev = await result.current.evaluateAtDepth(startFen, 12)
    expect(ev?.depth).toBe(12)
    expect(ev?.winrate_vec?.e2e4).toBeCloseTo(0.55, 5)
  })
})
