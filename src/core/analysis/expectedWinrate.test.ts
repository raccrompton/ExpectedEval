/**
 * Unit Tests for Expected Winrate Calculation
 *
 * Tests the core EW algorithm using mock engines for predictable results.
 * These tests verify:
 * 1. Candidate filtering works correctly
 * 2. Tree-based EW computation is accurate
 * 3. Results are properly sorted and formatted
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateExpectedWinrate,
  computeExpectedWinrateFromTree,
  summarizeEWResult,
  compareWithStockfish,
} from './expectedWinrate'
import { createMockStockfish, createMockMaia } from '../engine/mock'
import type { MockStockfish, MockMaia } from '../engine/mock'
import type { TreeNode } from './types'

// ============================================================================
// Test constants
// ============================================================================

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

// ============================================================================
// computeExpectedWinrateFromTree tests
// ============================================================================

describe('computeExpectedWinrateFromTree', () => {
  /**
   * Test: Single node tree (leaf)
   * EW should equal the node's evaluation.
   */
  it('returns evaluation for single-node tree', () => {
    const tree: TreeNode = {
      move: null,
      san: null,
      fen: STARTING_FEN,
      probability: 1.0,
      cumulativeProbability: 1.0,
      sfWinrate: 0.55,
      sfCp: 50,
      maiaWinrate: 0.53, // Maia slightly different
      depth: 0,
      children: [],
      exploredProbability: 0,
      unexploredMass: 0,  // Leaf has no uncovered mass
      isLeaf: true,
    }

    const { ewSF, ewMaia } = computeExpectedWinrateFromTree(tree)

    expect(ewSF).toBeCloseTo(0.55, 5)
    expect(ewMaia).toBeCloseTo(0.53, 5)
  })

  /**
   * Test: Two children with equal probability
   * EW should be average of children's evaluations.
   */
  it('computes weighted average for two equal children', () => {
    const tree: TreeNode = {
      move: null,
      san: null,
      fen: STARTING_FEN,
      probability: 1.0,
      cumulativeProbability: 1.0,
      sfWinrate: 0.50,
      sfCp: 0,
      maiaWinrate: 0.50,
      depth: 0,
      children: [
        {
          move: 'e7e5',
          san: 'e5',
          fen: AFTER_E4_FEN,
          probability: 0.50,
          cumulativeProbability: 0.50,
          sfWinrate: 0.60,
          sfCp: 100,
          maiaWinrate: 0.58,
          depth: 1,
          children: [],
          exploredProbability: 0,
          unexploredMass: 0,
          isLeaf: true,
        },
        {
          move: 'c7c5',
          san: 'c5',
          fen: AFTER_E4_FEN,
          probability: 0.50,
          cumulativeProbability: 0.50,
          sfWinrate: 0.40,
          sfCp: -100,
          maiaWinrate: 0.42,
          depth: 1,
          children: [],
          exploredProbability: 0,
          unexploredMass: 0,
          isLeaf: true,
        },
      ],
      exploredProbability: 1.0,
      unexploredMass: 0,  // 100% explored
      isLeaf: false,
    }

    const { ewSF, ewMaia } = computeExpectedWinrateFromTree(tree)

    // SF Average: (0.60 * 0.50) + (0.40 * 0.50) = 0.30 + 0.20 = 0.50
    expect(ewSF).toBeCloseTo(0.50, 5)
    // Maia Average: (0.58 * 0.50) + (0.42 * 0.50) = 0.29 + 0.21 = 0.50
    expect(ewMaia).toBeCloseTo(0.50, 5)
  })

  /**
   * Test: Weighted by probability
   * More likely moves should contribute more to EW.
   */
  it('weights by probability correctly', () => {
    const tree: TreeNode = {
      move: null,
      san: null,
      fen: STARTING_FEN,
      probability: 1.0,
      cumulativeProbability: 1.0,
      sfWinrate: 0.50,
      sfCp: 0,
      maiaWinrate: 0.50,
      depth: 0,
      children: [
        {
          move: 'e7e5',
          san: 'e5',
          fen: AFTER_E4_FEN,
          probability: 0.80, // High probability
          cumulativeProbability: 0.80,
          sfWinrate: 0.55, // Slightly better
          sfCp: 50,
          maiaWinrate: 0.54,
          depth: 1,
          children: [],
          exploredProbability: 0,
          unexploredMass: 0,
          isLeaf: true,
        },
        {
          move: 'c7c5',
          san: 'c5',
          fen: AFTER_E4_FEN,
          probability: 0.20, // Low probability
          cumulativeProbability: 0.20,
          sfWinrate: 0.40, // Worse
          sfCp: -100,
          maiaWinrate: 0.42,
          depth: 1,
          children: [],
          exploredProbability: 0,
          unexploredMass: 0,
          isLeaf: true,
        },
      ],
      exploredProbability: 1.0,
      unexploredMass: 0,
      isLeaf: false,
    }

    const { ewSF, ewMaia } = computeExpectedWinrateFromTree(tree)

    // SF: (0.55 * 0.80) + (0.40 * 0.20) = 0.44 + 0.08 = 0.52
    expect(ewSF).toBeCloseTo(0.52, 5)
    // Maia: (0.54 * 0.80) + (0.42 * 0.20) = 0.432 + 0.084 = 0.516
    expect(ewMaia).toBeCloseTo(0.516, 3)
  })

  /**
   * Test: Uncovered mass contribution
   * Unexplored moves should contribute based on parent evaluation.
   */
  it('accounts for uncovered probability mass', () => {
    const tree: TreeNode = {
      move: null,
      san: null,
      fen: STARTING_FEN,
      probability: 1.0,
      cumulativeProbability: 1.0,
      sfWinrate: 0.50, // This is used for uncovered mass
      sfCp: 0,
      maiaWinrate: 0.48,
      depth: 0,
      children: [
        {
          move: 'e7e5',
          san: 'e5',
          fen: AFTER_E4_FEN,
          probability: 0.60, // Only 60% explored
          cumulativeProbability: 0.60,
          sfWinrate: 0.55,
          sfCp: 50,
          maiaWinrate: 0.53,
          depth: 1,
          children: [],
          exploredProbability: 0,
          unexploredMass: 0,
          isLeaf: true,
        },
      ],
      exploredProbability: 0.60, // 40% uncovered
      unexploredMass: 0.40,      // Pre-calculated: (1 - 0.60) * 1.0 = 0.40
      isLeaf: false,
    }

    const { ewSF, ewMaia } = computeExpectedWinrateFromTree(tree)

    // SF: Leaf contribution: 0.55 * 0.60 = 0.33
    // SF: Uncovered contribution: 0.50 * 0.40 = 0.20
    // SF Total: 0.33 + 0.20 = 0.53
    expect(ewSF).toBeCloseTo(0.53, 5)
    // Maia: Leaf contribution: 0.53 * 0.60 = 0.318
    // Maia: Uncovered contribution: 0.48 * 0.40 = 0.192
    // Maia Total: 0.318 + 0.192 = 0.51
    expect(ewMaia).toBeCloseTo(0.51, 5)
  })

  /**
   * Test: Deep tree
   * Cumulative probability should compound correctly.
   */
  it('handles deep trees with cumulative probability', () => {
    const tree: TreeNode = {
      move: null,
      san: null,
      fen: STARTING_FEN,
      probability: 1.0,
      cumulativeProbability: 1.0,
      sfWinrate: 0.50,
      sfCp: 0,
      maiaWinrate: 0.50,
      depth: 0,
      children: [
        {
          move: 'e7e5',
          san: 'e5',
          fen: AFTER_E4_FEN,
          probability: 1.0,
          cumulativeProbability: 1.0,
          sfWinrate: 0.50,
          sfCp: 0,
          maiaWinrate: 0.50,
          depth: 1,
          children: [
            {
              move: 'g1f3',
              san: 'Nf3',
              fen: STARTING_FEN,
              probability: 0.50,
              cumulativeProbability: 0.50,
              sfWinrate: 0.60,
              sfCp: 100,
              maiaWinrate: 0.58,
              depth: 2,
              children: [],
              exploredProbability: 0,
              unexploredMass: 0,
              isLeaf: true,
            },
            {
              move: 'f1c4',
              san: 'Bc4',
              fen: STARTING_FEN,
              probability: 0.50,
              cumulativeProbability: 0.50,
              sfWinrate: 0.40,
              sfCp: -100,
              maiaWinrate: 0.42,
              depth: 2,
              children: [],
              exploredProbability: 0,
              unexploredMass: 0,
              isLeaf: true,
            },
          ],
          exploredProbability: 1.0,
          unexploredMass: 0,
          isLeaf: false,
        },
      ],
      exploredProbability: 1.0,
      unexploredMass: 0,
      isLeaf: false,
    }

    const { ewSF, ewMaia } = computeExpectedWinrateFromTree(tree)

    // SF: (0.60 * 0.50) + (0.40 * 0.50) = 0.50
    expect(ewSF).toBeCloseTo(0.50, 5)
    // Maia: (0.58 * 0.50) + (0.42 * 0.50) = 0.50
    expect(ewMaia).toBeCloseTo(0.50, 5)
  })

  /**
   * Test: Result is clamped to [0, 1]
   */
  it('clamps result to valid range', () => {
    const tree: TreeNode = {
      move: null,
      san: null,
      fen: STARTING_FEN,
      probability: 1.0,
      cumulativeProbability: 1.0,
      sfWinrate: 1.0, // Maximum
      sfCp: 10000,
      maiaWinrate: 0.99,
      depth: 0,
      children: [],
      exploredProbability: 0,
      unexploredMass: 0,
      isLeaf: true,
    }

    const { ewSF, ewMaia } = computeExpectedWinrateFromTree(tree)

    expect(ewSF).toBeLessThanOrEqual(1.0)
    expect(ewSF).toBeGreaterThanOrEqual(0.0)
    expect(ewMaia).toBeLessThanOrEqual(1.0)
    expect(ewMaia).toBeGreaterThanOrEqual(0.0)
  })

  /**
   * Test: Handles null sfWinrate (falls back to maiaWinrate)
   */
  it('falls back to maiaWinrate when sfWinrate is null', () => {
    const tree: TreeNode = {
      move: null,
      san: null,
      fen: STARTING_FEN,
      probability: 1.0,
      cumulativeProbability: 1.0,
      sfWinrate: null,  // Not yet evaluated
      sfCp: null,
      maiaWinrate: 0.55,
      depth: 0,
      children: [],
      exploredProbability: 0,
      unexploredMass: 0,
      isLeaf: true,
    }

    const { ewSF, ewMaia } = computeExpectedWinrateFromTree(tree)

    // Both should use maiaWinrate since sfWinrate is null
    expect(ewSF).toBeCloseTo(0.55, 5)
    expect(ewMaia).toBeCloseTo(0.55, 5)
  })
})

// ============================================================================
// calculateExpectedWinrate integration tests
// ============================================================================

describe('calculateExpectedWinrate', () => {
  let stockfish: MockStockfish
  let maia: MockMaia

  beforeEach(async () => {
    // Create mock engines with predictable outputs
    stockfish = createMockStockfish({
      defaultCp: 20, // Slight White advantage
    })

    maia = createMockMaia({
      defaultPolicy: {
        'e2e4': 0.35,
        'd2d4': 0.28,
        'g1f3': 0.15,
        'c2c4': 0.10,
      },
      defaultValue: 0.52,
    })

    await stockfish.init()
    await maia.init()
  })

  it('returns results for a position', async () => {
    const result = await calculateExpectedWinrate(
      STARTING_FEN,
      { probabilityThreshold: 0.05, maxCandidates: 3 },
      stockfish,
      maia
    )

    expect(result).toBeDefined()
    expect(result.fen).toBe(STARTING_FEN)
    expect(result.candidates.length).toBeGreaterThan(0)
  })

  it('includes base position evaluation', async () => {
    const result = await calculateExpectedWinrate(
      STARTING_FEN,
      { probabilityThreshold: 0.05 },
      stockfish,
      maia
    )

    // Both SF and Maia baselines should be present
    expect(result.baseSFWinrate).toBeDefined()
    expect(result.baseSFWinrate).toBeGreaterThanOrEqual(0)
    expect(result.baseSFWinrate).toBeLessThanOrEqual(1)
    expect(result.baseMaiaWinrate).toBeDefined()
    expect(result.baseMaiaWinrate).toBeGreaterThanOrEqual(0)
    expect(result.baseMaiaWinrate).toBeLessThanOrEqual(1)
  })

  it('sorts candidates by expected winrate SF', async () => {
    const result = await calculateExpectedWinrate(
      STARTING_FEN,
      { probabilityThreshold: 0.05 },
      stockfish,
      maia
    )

    // Verify sorted by EW-SF (best first)
    for (let i = 1; i < result.candidates.length; i++) {
      expect(result.candidates[i - 1].expectedWinrateSF ?? 0)
        .toBeGreaterThanOrEqual(result.candidates[i].expectedWinrateSF ?? 0)
    }
  })

  it('respects maxCandidates config', async () => {
    const result = await calculateExpectedWinrate(
      STARTING_FEN,
      { probabilityThreshold: 0.05, maxCandidates: 2 },
      stockfish,
      maia
    )

    expect(result.candidates.length).toBeLessThanOrEqual(2)
  })

  it('records calculation time', async () => {
    const result = await calculateExpectedWinrate(
      STARTING_FEN,
      { probabilityThreshold: 0.05 },
      stockfish,
      maia
    )

    expect(result.calculationTimeMs).toBeDefined()
    expect(result.calculationTimeMs).toBeGreaterThanOrEqual(0)
  })

  it('includes configuration used', async () => {
    const result = await calculateExpectedWinrate(
      STARTING_FEN,
      { probabilityThreshold: 0.10 },
      stockfish,
      maia
    )

    expect(result.config.probabilityThreshold).toBe(0.10)
  })

  it('candidates have trees', async () => {
    const result = await calculateExpectedWinrate(
      STARTING_FEN,
      { probabilityThreshold: 0.05 },
      stockfish,
      maia
    )

    for (const candidate of result.candidates) {
      expect(candidate.tree).toBeDefined()
      expect(candidate.tree.fen).toBeDefined()
    }
  })

  it('EW values are within valid range', async () => {
    const result = await calculateExpectedWinrate(
      STARTING_FEN,
      { probabilityThreshold: 0.05 },
      stockfish,
      maia
    )

    for (const candidate of result.candidates) {
      // Both EW-SF and EW-Maia should be valid
      expect(candidate.expectedWinrateSF).toBeGreaterThanOrEqual(0)
      expect(candidate.expectedWinrateSF).toBeLessThanOrEqual(1)
      expect(candidate.expectedWinrateMaia).toBeGreaterThanOrEqual(0)
      expect(candidate.expectedWinrateMaia).toBeLessThanOrEqual(1)
      // Maia baseline should also be valid
      expect(candidate.maiaWinrate).toBeGreaterThanOrEqual(0)
      expect(candidate.maiaWinrate).toBeLessThanOrEqual(1)
    }
  })

  it('includes uniquePositionsEvaluated for each candidate', async () => {
    const result = await calculateExpectedWinrate(
      STARTING_FEN,
      { probabilityThreshold: 0.05 },
      stockfish,
      maia
    )

    for (const candidate of result.candidates) {
      expect(candidate.uniquePositionsEvaluated).toBeDefined()
      expect(candidate.uniquePositionsEvaluated).toBeGreaterThanOrEqual(0)
    }
  })
})

// ============================================================================
// Utility function tests
// ============================================================================

describe('summarizeEWResult', () => {
  it('generates readable summary', async () => {
    const stockfish = createMockStockfish({ defaultCp: 20 })
    const maia = createMockMaia({
      defaultPolicy: { 'e2e4': 0.50, 'd2d4': 0.30 },
    })
    await stockfish.init()
    await maia.init()

    const result = await calculateExpectedWinrate(
      STARTING_FEN,
      { probabilityThreshold: 0.05, maxCandidates: 3 },
      stockfish,
      maia
    )

    const summary = summarizeEWResult(result)

    expect(summary).toContain('Expected Winrate')
    expect(summary).toContain('Top moves')
    expect(summary).toContain('%')
  })
})

describe('compareWithStockfish', () => {
  it('identifies when different methods agree', async () => {
    const stockfish = createMockStockfish({ defaultCp: 20 })
    const maia = createMockMaia({
      defaultPolicy: { 'e2e4': 0.50, 'd2d4': 0.30 },
    })
    await stockfish.init()
    await maia.init()

    const result = await calculateExpectedWinrate(
      STARTING_FEN,
      { probabilityThreshold: 0.05 },
      stockfish,
      maia
    )

    const comparison = compareWithStockfish(result)

    // All best move fields should be defined
    expect(comparison.sfBestMove).toBeDefined()
    expect(comparison.ewSFBestMove).toBeDefined()
    expect(comparison.ewMaiaBestMove).toBeDefined()
    expect(comparison.probBestMove).toBeDefined()
    // Agreement flags should be booleans
    expect(typeof comparison.sfAgreeEWSF).toBe('boolean')
    expect(typeof comparison.sfAgreeEWMaia).toBe('boolean')
    expect(typeof comparison.ewSFAgreeEWMaia).toBe('boolean')
  })
})

// ============================================================================
// Edge case tests
// ============================================================================

describe('edge cases', () => {
  let stockfish: MockStockfish
  let maia: MockMaia

  beforeEach(async () => {
    stockfish = createMockStockfish({ defaultCp: 0 })
    maia = createMockMaia({
      defaultPolicy: { 'a2a3': 0.10, 'b2b3': 0.10 },
    })
    await stockfish.init()
    await maia.init()
  })

  it('handles high probability threshold (shallow trees)', async () => {
    const result = await calculateExpectedWinrate(
      STARTING_FEN,
      { probabilityThreshold: 0.50 },  // Very high - will create shallow trees
      stockfish,
      maia
    )

    // Should still return candidates
    expect(result.candidates.length).toBeGreaterThan(0)
  })

  it('handles very low probability threshold', async () => {
    const result = await calculateExpectedWinrate(
      STARTING_FEN,
      { probabilityThreshold: 0.01 },
      stockfish,
      maia
    )

    expect(result.candidates.length).toBeGreaterThan(0)
  })
})
