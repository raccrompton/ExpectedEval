/**
 * Unit Tests for Tree Builder
 *
 * Tests the probability tree construction used in Expected Winrate.
 * Uses mock engines to ensure predictable, fast tests.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildTree,
  buildTreeWithInlineSF,
  collectPositionsForEvaluation,
  batchEvaluateWithStockfish,
  populateSFEvaluations,
  applyMove,
  uciToSan,
  sanToUci,
  getLeafNodes,
  getNodesAtDepth,
  countNodes,
  getMaxDepth,
  getTurnFromFen,
} from './treeBuilder'
import { createMockStockfish, createMockMaia } from '../engine/mock'
import type { MockStockfish, MockMaia } from '../engine/mock'

// ============================================================================
// Test constants
// ============================================================================

/** Starting position FEN */
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/** Position after 1. e4 */
const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

/** Position after 1. e4 e5 */
const AFTER_E4_E5_FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'

// ============================================================================
// Utility function tests
// ============================================================================

describe('applyMove', () => {
  it('applies e2e4 from starting position', () => {
    const result = applyMove(STARTING_FEN, 'e2e4')

    expect(result).not.toBeNull()
    expect(result).toBe(AFTER_E4_FEN)
  })

  it('applies e7e5 after 1. e4', () => {
    const result = applyMove(AFTER_E4_FEN, 'e7e5')

    expect(result).not.toBeNull()
    expect(result).toBe(AFTER_E4_E5_FEN)
  })

  it('returns null for invalid FEN', () => {
    const result = applyMove('invalid-fen', 'e2e4')

    expect(result).toBeNull()
  })

  it('returns null for invalid move', () => {
    // e2e5 is not legal from starting position
    const result = applyMove(STARTING_FEN, 'e2e5')

    expect(result).toBeNull()
  })

  it('returns null for illegal move', () => {
    // Can't move e2 to e4 twice
    const afterE4 = applyMove(STARTING_FEN, 'e2e4')
    const result = applyMove(afterE4!, 'e4e5')

    // e4e5 is not legal (pawn can't go there)
    expect(result).toBeNull()
  })

  it('handles promotion moves', () => {
    // Position with pawn on 7th rank
    const promotionFen = '8/P7/8/8/8/8/8/4K2k w - - 0 1'
    const result = applyMove(promotionFen, 'a7a8q')

    expect(result).not.toBeNull()
    // Should have a queen on a8
    expect(result).toContain('Q')
  })
})

describe('uciToSan', () => {
  it('converts e2e4 to e4', () => {
    const san = uciToSan(STARTING_FEN, 'e2e4')

    expect(san).toBe('e4')
  })

  it('converts g1f3 to Nf3', () => {
    const san = uciToSan(STARTING_FEN, 'g1f3')

    expect(san).toBe('Nf3')
  })

  it('returns null for invalid move', () => {
    const san = uciToSan(STARTING_FEN, 'e2e5')

    expect(san).toBeNull()
  })

  it('returns null for invalid FEN', () => {
    const san = uciToSan('invalid', 'e2e4')

    expect(san).toBeNull()
  })
})

describe('sanToUci', () => {
  it('converts e4 to e2e4', () => {
    const uci = sanToUci(STARTING_FEN, 'e4')

    expect(uci).toBe('e2e4')
  })

  it('converts Nf3 to g1f3', () => {
    const uci = sanToUci(STARTING_FEN, 'Nf3')

    expect(uci).toBe('g1f3')
  })

  it('returns null for invalid SAN', () => {
    const uci = sanToUci(STARTING_FEN, 'Bxh7')

    expect(uci).toBeNull()
  })

  it('round-trips with uciToSan', () => {
    const originalUci = 'e2e4'
    const san = uciToSan(STARTING_FEN, originalUci)
    const backToUci = sanToUci(STARTING_FEN, san!)

    expect(backToUci).toBe(originalUci)
  })
})

// ============================================================================
// Tree building tests
// ============================================================================

describe('buildTree (Maia-only Phase 2)', () => {
  let maia: MockMaia

  beforeEach(async () => {
    // Create mock Maia with predictable outputs
    maia = createMockMaia({
      defaultPolicy: {
        'e7e5': 0.40,
        'c7c5': 0.25,
        'd7d6': 0.15,
        'e7e6': 0.10,
      },
      defaultValue: 0.48,
    })

    await maia.init()
  })

  it('creates a root node with correct FEN', async () => {
    // Use high threshold to get root-only tree
    const tree = await buildTree(AFTER_E4_FEN, { probabilityThreshold: 1.0 }, maia)

    expect(tree.fen).toBe(AFTER_E4_FEN)
    expect(tree.move).toBeNull()
    expect(tree.san).toBeNull()
  })

  it('root node has probability 1.0', async () => {
    const tree = await buildTree(AFTER_E4_FEN, { probabilityThreshold: 1.0 }, maia)

    expect(tree.probability).toBe(1.0)
    expect(tree.cumulativeProbability).toBe(1.0)
  })

  it('creates children based on Maia predictions', async () => {
    const tree = await buildTree(
      AFTER_E4_FEN,
      { probabilityThreshold: 0.05 },
      maia
    )

    // Should have children for moves above threshold
    expect(tree.children.length).toBeGreaterThan(0)

    // Children should have correct probabilities
    const e5Child = tree.children.find(c => c.move === 'e7e5')
    expect(e5Child).toBeDefined()
    expect(e5Child!.probability).toBeCloseTo(0.40, 2)
  })

  it('prunes moves below probability threshold', async () => {
    const tree = await buildTree(
      AFTER_E4_FEN,
      { probabilityThreshold: 0.20 },
      maia
    )

    // With 20% threshold, only e7e5 (40%) and c7c5 (25%) should be explored
    expect(tree.children.length).toBeLessThanOrEqual(2)
  })

  it('calculates cumulative probabilities correctly', async () => {
    const tree = await buildTree(
      AFTER_E4_FEN,
      { probabilityThreshold: 0.05 },
      maia
    )

    // Check first-level children
    for (const child of tree.children) {
      expect(child.cumulativeProbability).toBeCloseTo(child.probability, 5)

      // Check grandchildren (if any)
      for (const grandchild of child.children) {
        const expectedCumProb = child.cumulativeProbability * grandchild.probability
        expect(grandchild.cumulativeProbability).toBeCloseTo(expectedCumProb, 5)
      }
    }
  })

  it('has Maia evaluations but SF is null (Phase 2 only)', async () => {
    const tree = await buildTree(
      AFTER_E4_FEN,
      { probabilityThreshold: 0.10 },
      maia
    )

    // SF winrate should be null (not yet evaluated)
    expect(tree.sfWinrate).toBeNull()
    expect(tree.sfCp).toBeNull()

    // Maia winrate should be defined and valid
    expect(tree.maiaWinrate).toBeDefined()
    expect(tree.maiaWinrate).toBeGreaterThanOrEqual(0)
    expect(tree.maiaWinrate).toBeLessThanOrEqual(1)

    for (const child of tree.children) {
      expect(child.sfWinrate).toBeNull()
      expect(child.maiaWinrate).toBeDefined()
    }
  })

  it('tracks explored probability', async () => {
    const tree = await buildTree(
      AFTER_E4_FEN,
      { probabilityThreshold: 0.10 },
      maia
    )

    // Sum of child probabilities should equal exploredProbability
    const sumChildProbs = tree.children.reduce((sum, c) => sum + c.probability, 0)
    expect(tree.exploredProbability).toBeCloseTo(sumChildProbs, 5)
  })

  it('calculates unexploredMass correctly', async () => {
    const tree = await buildTree(
      AFTER_E4_FEN,
      { probabilityThreshold: 0.10 },
      maia
    )

    // Root unexploredMass = (1 - exploredProbability) × cumulativeProbability
    const expectedUnexploredMass = (1 - tree.exploredProbability) * tree.cumulativeProbability
    expect(tree.unexploredMass).toBeCloseTo(expectedUnexploredMass, 5)
  })
})

// ============================================================================
// buildTreeWithInlineSF tests (backward compatible API with SF evaluations)
// ============================================================================

describe('buildTreeWithInlineSF (backward compatible)', () => {
  let stockfish: MockStockfish
  let maia: MockMaia

  beforeEach(async () => {
    stockfish = createMockStockfish({
      defaultCp: 20,
    })

    maia = createMockMaia({
      defaultPolicy: {
        'e7e5': 0.40,
        'c7c5': 0.25,
        'd7d6': 0.15,
        'e7e6': 0.10,
      },
      defaultValue: 0.48,
    })

    await stockfish.init()
    await maia.init()
  })

  it('has SF evaluations on all nodes after inline evaluation', async () => {
    const tree = await buildTreeWithInlineSF(
      AFTER_E4_FEN,
      { probabilityThreshold: 0.10 },
      stockfish,
      maia
    )

    // SF winrate should now be defined and valid
    expect(tree.sfWinrate).toBeDefined()
    expect(tree.sfWinrate).not.toBeNull()
    expect(tree.sfWinrate).toBeGreaterThanOrEqual(0)
    expect(tree.sfWinrate).toBeLessThanOrEqual(1)

    // Maia winrate should also be defined and valid
    expect(tree.maiaWinrate).toBeDefined()
    expect(tree.maiaWinrate).toBeGreaterThanOrEqual(0)
    expect(tree.maiaWinrate).toBeLessThanOrEqual(1)

    for (const child of tree.children) {
      expect(child.sfWinrate).toBeDefined()
      expect(child.sfWinrate).not.toBeNull()
      expect(child.maiaWinrate).toBeDefined()
    }
  })
})

// ============================================================================
// Phase 3 helpers tests
// ============================================================================

describe('Phase 3 helpers', () => {
  let stockfish: MockStockfish
  let maia: MockMaia

  beforeEach(async () => {
    stockfish = createMockStockfish({
      defaultCp: 20,
    })

    maia = createMockMaia({
      defaultPolicy: {
        'e7e5': 0.40,
        'c7c5': 0.25,
      },
      defaultValue: 0.48,
    })

    await stockfish.init()
    await maia.init()
  })

  describe('collectPositionsForEvaluation', () => {
    it('collects leaf positions', async () => {
      const tree = await buildTree(
        AFTER_E4_FEN,
        { probabilityThreshold: 0.20 },
        maia
      )

      const positions = collectPositionsForEvaluation(tree, 'w')

      // Should include positions that need evaluation
      expect(positions.size).toBeGreaterThan(0)
    })

    it('avoids duplicate FENs', async () => {
      const tree = await buildTree(
        AFTER_E4_FEN,
        { probabilityThreshold: 0.05 },
        maia
      )

      const positions = collectPositionsForEvaluation(tree, 'w')

      // Map naturally deduplicates by key
      const fens = Array.from(positions.keys())
      const uniqueFens = new Set(fens)
      expect(fens.length).toBe(uniqueFens.size)
    })
  })

  describe('batchEvaluateWithStockfish', () => {
    it('evaluates all provided positions', async () => {
      const positions = new Map<string, 'w' | 'b'>()
      positions.set(AFTER_E4_FEN, 'b')
      positions.set(AFTER_E4_E5_FEN, 'w')

      const results = await batchEvaluateWithStockfish(stockfish, positions, {})

      expect(results.size).toBe(2)
      expect(results.has(AFTER_E4_FEN)).toBe(true)
      expect(results.has(AFTER_E4_E5_FEN)).toBe(true)
    })

    it('returns winrate and cp for each position', async () => {
      const positions = new Map<string, 'w' | 'b'>()
      positions.set(AFTER_E4_FEN, 'b')

      const results = await batchEvaluateWithStockfish(stockfish, positions, {})

      const result = results.get(AFTER_E4_FEN)
      expect(result).toBeDefined()
      expect(result!.winrate).toBeGreaterThanOrEqual(0)
      expect(result!.winrate).toBeLessThanOrEqual(1)
      expect(typeof result!.cp).toBe('number')
    })
  })

  describe('populateSFEvaluations', () => {
    it('populates SF values into tree nodes', async () => {
      const tree = await buildTree(
        AFTER_E4_FEN,
        { probabilityThreshold: 0.20 },
        maia
      )

      // Initially SF should be null
      expect(tree.sfWinrate).toBeNull()

      // Create mock SF results
      const sfResults = new Map<string, { winrate: number; cp: number }>()
      sfResults.set(tree.fen, { winrate: 0.52, cp: 20 })

      populateSFEvaluations(tree, sfResults, 'w')

      // Now SF should be populated
      expect(tree.sfWinrate).not.toBeNull()
    })

    // Regression for #2: sfCp is White-perspective (per
    // StockfishEvaluation contract). When the root player is White, a
    // positive sfCp must remain positive after population — the previous
    // implementation flipped it whenever the node's side-to-move differed
    // from rootTurn, which mis-signed half the nodes in any tree.
    it('preserves sfCp sign when root player is White', async () => {
      const tree = await buildTree(
        AFTER_E4_FEN, // Black to move; root player (White) made e4
        { probabilityThreshold: 0.20 },
        maia
      )

      const sfResults = new Map<string, { winrate: number; cp: number }>()
      sfResults.set(tree.fen, { winrate: 0.45, cp: 35 })

      populateSFEvaluations(tree, sfResults, 'w')

      // Root is White → cp stays positive (35), regardless of node's side-to-move.
      expect(tree.sfCp).toBe(35)
      // winrate IS side-to-move-perspective so it gets flipped because the
      // node's side-to-move (Black) differs from rootTurn (White).
      expect(tree.sfWinrate).toBeCloseTo(1 - 0.45)
    })

    it('flips sfCp when root player is Black', async () => {
      // After 1. e4, Black to move. Imagine Black is the root player.
      const tree = await buildTree(
        AFTER_E4_FEN,
        { probabilityThreshold: 0.20 },
        maia
      )

      const sfResults = new Map<string, { winrate: number; cp: number }>()
      sfResults.set(tree.fen, { winrate: 0.55, cp: 40 })

      populateSFEvaluations(tree, sfResults, 'b')

      // Root is Black → flip White-perspective cp to Black's view.
      expect(tree.sfCp).toBe(-40)
    })
  })
})

// ============================================================================
// getTurnFromFen tests
// ============================================================================

describe('getTurnFromFen', () => {
  it('returns w for white to move', () => {
    expect(getTurnFromFen(STARTING_FEN)).toBe('w')
  })

  it('returns b for black to move', () => {
    expect(getTurnFromFen(AFTER_E4_FEN)).toBe('b')
  })

  it('returns w after black moves', () => {
    expect(getTurnFromFen(AFTER_E4_E5_FEN)).toBe('w')
  })
})

// ============================================================================
// Tree traversal tests
// ============================================================================

describe('tree traversal utilities', () => {
  let maia: MockMaia

  beforeEach(async () => {
    maia = createMockMaia({
      defaultPolicy: { 'e7e5': 0.40, 'c7c5': 0.30 },
    })
    await maia.init()
  })

  describe('getLeafNodes', () => {
    it('returns root for root-only tree (high threshold)', async () => {
      // Using high threshold ensures no children are explored
      const tree = await buildTree(
        AFTER_E4_FEN,
        { probabilityThreshold: 1.0 },
        maia
      )

      const leaves = getLeafNodes(tree)

      expect(leaves.length).toBe(1)
      expect(leaves[0]).toBe(tree)
    })

    it('returns children for shallow tree', async () => {
      // Use medium threshold to get some children but not grandchildren
      const tree = await buildTree(
        AFTER_E4_FEN,
        { probabilityThreshold: 0.35 },
        maia
      )

      const leaves = getLeafNodes(tree)

      // All children should be leaves at this threshold
      expect(leaves.length).toBe(tree.children.length)
    })
  })

  describe('getNodesAtDepth', () => {
    it('returns root at depth 0', async () => {
      const tree = await buildTree(
        AFTER_E4_FEN,
        { probabilityThreshold: 0.10 },
        maia
      )

      const depth0 = getNodesAtDepth(tree, 0)

      expect(depth0.length).toBe(1)
      expect(depth0[0]).toBe(tree)
    })

    it('returns children at depth 1', async () => {
      const tree = await buildTree(
        AFTER_E4_FEN,
        { probabilityThreshold: 0.10 },
        maia
      )

      const depth1 = getNodesAtDepth(tree, 1)

      expect(depth1.length).toBe(tree.children.length)
    })
  })

  describe('countNodes', () => {
    it('returns 1 for root-only tree', async () => {
      const tree = await buildTree(
        AFTER_E4_FEN,
        { probabilityThreshold: 1.0 },
        maia
      )

      expect(countNodes(tree)).toBe(1)
    })

    it('counts all nodes in tree', async () => {
      const tree = await buildTree(
        AFTER_E4_FEN,
        { probabilityThreshold: 0.35 },
        maia
      )

      const count = countNodes(tree)

      // Root + children (no grandchildren at this threshold)
      expect(count).toBe(1 + tree.children.length)
    })
  })

  describe('getMaxDepth', () => {
    it('returns 0 for root-only tree', async () => {
      const tree = await buildTree(
        AFTER_E4_FEN,
        { probabilityThreshold: 1.0 },
        maia
      )

      expect(getMaxDepth(tree)).toBe(0)
    })

    it('returns correct max depth', async () => {
      const tree = await buildTree(
        AFTER_E4_FEN,
        { probabilityThreshold: 0.10 },
        maia
      )

      const maxDepth = getMaxDepth(tree)

      // Should be at least 1 if there are children
      if (tree.children.length > 0) {
        expect(maxDepth).toBeGreaterThanOrEqual(1)
      }
    })
  })
})
