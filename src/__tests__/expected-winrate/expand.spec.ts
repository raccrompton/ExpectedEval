import { renderHook } from '@testing-library/react'
import React from 'react'
import { MaiaEngineContext } from '../../contexts/MaiaEngineContext/MaiaEngineContext'
import { useMaiaExpand } from '../../lib/expectedWinrate/expand'

const MockProvider: React.FC<{
  children: React.ReactNode
  policy: Record<string, number>
}> = ({ children, policy }) => {
  const maia = {
    evaluate: async (fen: string, eloWhite: number, eloBlack: number) => {
      return { policy }
    },
  } as any
  return React.createElement(
    MaiaEngineContext.Provider,
    {
      value: {
        maia,
        status: 'ready',
        progress: 1,
        downloadModel: async () => null,
      },
    },
    children,
  )
}

describe('useMaiaExpand', () => {
  it('expands children using Maia policy and thresholds cumulative probability', async () => {
    const policy = { e2e4: 0.6, d2d4: 0.3, g1f3: 0.1 }
    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
      React.createElement(MockProvider, { policy } as any, children as any)
    const { result } = renderHook(() => useMaiaExpand(), {
      wrapper: Wrapper as any,
    })
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const nodes = await result.current.expandTree(startFen, {
      probThreshold: 0.15,
      depth: 12,
      minWin: 0.45,
      maiaModel: 'maia_rapid',
    })
    expect(nodes.length).toBeGreaterThan(0)
    const movesSeen = new Set<string>()
    nodes.forEach((n) => {
      n.path.forEach((m) => movesSeen.add(m))
    })
    expect(movesSeen.has('e2e4')).toBe(true)
    expect(movesSeen.has('d2d4')).toBe(true)
  })
})
