import {
  computeCoverage,
  computeExpected,
  averageDepth,
  confidenceFromCoverage,
} from '../../lib/expectedWinrate/aggregate'
import { ExpectedWinrateNode } from '../../lib/expectedWinrate/types'

describe('aggregate utils', () => {
  const nodes: ExpectedWinrateNode[] = [
    {
      fen: 'f1',
      path: ['e2e4'],
      cumulativeProb: 0.6,
      turn: 'b',
      pruned: false,
      leaf: { winrate: 0.7, depth: 20 },
    },
    {
      fen: 'f2',
      path: ['d2d4'],
      cumulativeProb: 0.2,
      turn: 'b',
      pruned: false,
      leaf: { winrate: 0.3, depth: 20 },
    },
  ]

  it('computes coverage clamped to [0,1]', () => {
    expect(computeCoverage(nodes)).toBeCloseTo(0.8, 5)
  })

  it('computes expected with uncovered mass going to base', () => {
    const base = 0.5
    const expected = computeExpected(nodes, base)
    expect(expected).toBeCloseTo(0.58, 5)
  })

  it('computes average depth from path length', () => {
    expect(averageDepth(nodes)).toBeCloseTo(1, 5)
  })

  it('maps confidence buckets', () => {
    expect(confidenceFromCoverage(0.85)).toBe('high')
    expect(confidenceFromCoverage(0.7)).toBe('medium')
    expect(confidenceFromCoverage(0.3)).toBe('low')
  })
})
