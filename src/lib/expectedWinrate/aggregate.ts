import {
  ConfidenceBucket,
  ExpectedWinrateNode,
  ExpectedWinrateResult,
} from './types'
import { EXPECTED_WINRATE_CONFIDENCE_THRESHOLDS } from 'src/constants/expectedWinrate'

export const computeCoverage = (paths: ExpectedWinrateNode[]): number => {
  let total = 0
  for (const n of paths) total += n.cumulativeProb
  return Math.max(0, Math.min(1, total))
}

export const confidenceFromCoverage = (coverage: number): ConfidenceBucket => {
  if (coverage >= EXPECTED_WINRATE_CONFIDENCE_THRESHOLDS.high) return 'high'
  if (coverage >= EXPECTED_WINRATE_CONFIDENCE_THRESHOLDS.medium) return 'medium'
  return 'low'
}

export const computeExpected = (
  paths: ExpectedWinrateNode[],
  baseWinrate: number,
) => {
  let sumProb = 0
  let sum = 0
  for (const p of paths) {
    if (p.leaf) {
      sum += p.cumulativeProb * p.leaf.winrate
      sumProb += p.cumulativeProb
    }
  }
  const uncovered = 1 - sumProb
  return sum + uncovered * baseWinrate
}

export const averageDepth = (paths: ExpectedWinrateNode[]) => {
  if (!paths.length) return 0
  let total = 0
  for (const p of paths) total += p.path.length
  return total / paths.length
}

export const summarize = (
  nodes: ExpectedWinrateNode[],
  baseWinrate: number,
) => {
  const coverage = computeCoverage(nodes)
  const expected = computeExpected(nodes, baseWinrate)
  const avgDepth = averageDepth(nodes)
  const confidence = confidenceFromCoverage(coverage)
  return { coverage, expected, avgDepth, confidence }
}
