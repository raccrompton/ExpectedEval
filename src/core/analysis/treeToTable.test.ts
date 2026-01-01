/**
 * Unit tests for EW Tree to Table transformation.
 *
 * Tests the conversion of TreeNode structure to flat table rows
 * for the horizontal table-based EW visualization.
 */
import { describe, test, expect } from 'vitest'
import {
  treeToTableRows,
  getMoveNumberFromFen,
  getColorFromFen,
  buildMainlineCells,
} from './treeToTable'
import type { TreeNode } from './types'

/**
 * Factory to create mock TreeNode for testing.
 */
function createMockNode(overrides: Partial<TreeNode> = {}): TreeNode {
  return {
    move: null,
    san: null,
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    probability: 1.0,
    cumulativeProbability: 1.0,
    sfWinrate: null,
    sfCp: null,
    maiaWinrate: 0.52,
    depth: 0,
    children: [],
    exploredProbability: 0,
    unexploredMass: 0,
    isLeaf: true,
    ...overrides,
  }
}

/**
 * Factory to create a child node (with move/san set).
 */
function createChildNode(
  san: string,
  prob: number,
  maiaWinrate: number,
  depth: number,
  children: TreeNode[] = []
): TreeNode {
  return {
    move: san.toLowerCase(),
    san,
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    probability: prob,
    cumulativeProbability: prob,
    sfWinrate: null,
    sfCp: null,
    maiaWinrate,
    depth,
    children,
    exploredProbability: children.reduce((sum, c) => sum + c.probability, 0),
    unexploredMass: 0,
    isLeaf: children.length === 0,
  }
}

/**
 * Factory to create a simple linear tree (mainline only, no branches).
 * Root node has san=null (represents position after candidate move).
 * Children are the actual moves in sequence.
 * Correctly computes cumulativeProbability for each node.
 */
function createLinearTree(moves: Array<{ san: string; prob: number; maiaWinrate: number }>): TreeNode {
  function buildChildChain(
    movesRemaining: Array<{ san: string; prob: number; maiaWinrate: number }>,
    depth: number,
    parentCumProb: number
  ): TreeNode | null {
    if (movesRemaining.length === 0) {
      return null
    }

    const [first, ...rest] = movesRemaining
    const cumProb = parentCumProb * first.prob
    const childNode = buildChildChain(rest, depth + 1, cumProb)

    const node = createChildNode(
      first.san,
      first.prob,
      first.maiaWinrate,
      depth,
      childNode ? [childNode] : []
    )
    node.cumulativeProbability = cumProb
    return node
  }

  const firstChild = buildChildChain(moves, 1, 1.0)

  return createMockNode({
    san: null,
    move: null,
    depth: 0,
    children: firstChild ? [firstChild] : [],
    isLeaf: !firstChild,
    exploredProbability: firstChild ? firstChild.probability : 0,
  })
}

/**
 * Factory to create a tree with branches at specified depth.
 * Root node has san=null (position after candidate move).
 * atDepth in branches refers to ply index (0 = first response).
 *
 * Branches are SIBLINGS: alternatives at ply 0 are children of root,
 * alternatives at ply 1 are children of the ply-0 mainline node, etc.
 */
function createBranchingTree(
  mainline: Array<{ san: string; prob: number }>,
  branches: Array<{ atDepth: number; alternatives: Array<{ san: string; prob: number }> }>
): TreeNode {
  // Build children for a given ply level
  // plyIndex: 0 = first response, 1 = second response, etc.
  function buildChildrenAtPly(plyIndex: number): TreeNode[] {
    const mainlineMove = mainline[plyIndex]
    if (!mainlineMove) {
      return []
    }

    const children: TreeNode[] = []

    // Add mainline move first (highest probability)
    const nextLevelChildren = buildChildrenAtPly(plyIndex + 1)
    children.push(
      createChildNode(mainlineMove.san, mainlineMove.prob, 0.50, plyIndex + 1, nextLevelChildren)
    )

    // Add alternatives at this ply (siblings of the mainline move)
    const branchAtThisPly = branches.find(b => b.atDepth === plyIndex)
    if (branchAtThisPly) {
      for (const alt of branchAtThisPly.alternatives) {
        children.push(createChildNode(alt.san, alt.prob, 0.50, plyIndex + 1, []))
      }
    }

    return children
  }

  const rootChildren = buildChildrenAtPly(0)

  if (rootChildren.length === 0) {
    return createMockNode({ children: [], isLeaf: true })
  }

  const exploredProb = rootChildren.reduce((sum, c) => sum + c.probability, 0)

  return createMockNode({
    san: null,
    move: null,
    depth: 0,
    children: rootChildren,
    isLeaf: false,
    exploredProbability: exploredProb,
  })
}

describe('getMoveNumberFromFen', () => {
  test('extracts move number from standard FEN', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
    expect(getMoveNumberFromFen(fen)).toBe(1)
  })

  test('extracts move number 30 from middle-game FEN', () => {
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 30'
    expect(getMoveNumberFromFen(fen)).toBe(30)
  })

  test('handles FEN with high move number', () => {
    const fen = '8/8/8/8/8/8/8/4K3 w - - 0 150'
    expect(getMoveNumberFromFen(fen)).toBe(150)
  })

  test('returns 1 for malformed FEN', () => {
    expect(getMoveNumberFromFen('invalid')).toBe(1)
    expect(getMoveNumberFromFen('')).toBe(1)
  })
})

describe('getColorFromFen', () => {
  test('returns "w" for white to move', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1'
    expect(getColorFromFen(fen)).toBe('w')
  })

  test('returns "b" for black to move', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
    expect(getColorFromFen(fen)).toBe('b')
  })

  test('returns "w" for malformed FEN', () => {
    expect(getColorFromFen('invalid')).toBe('w')
    expect(getColorFromFen('')).toBe('w')
  })
})

describe('buildMainlineCells', () => {
  test('builds cells for simple 3-move mainline', () => {
    const root = createLinearTree([
      { san: 'e5', prob: 0.45, maiaWinrate: 0.48 },
      { san: 'Nf3', prob: 0.40, maiaWinrate: 0.52 },
      { san: 'Nc6', prob: 0.50, maiaWinrate: 0.50 },
    ])

    const cells = buildMainlineCells(root, 1, 'w')

    expect(cells).toHaveLength(3)
    expect(cells[0].san).toBe('e5')
    expect(cells[0].plyIndex).toBe(0)
    expect(cells[1].san).toBe('Nf3')
    expect(cells[1].plyIndex).toBe(1)
    expect(cells[2].san).toBe('Nc6')
    expect(cells[2].plyIndex).toBe(2)
  })

  test('correctly assigns move numbers starting from white move', () => {
    const root = createLinearTree([
      { san: 'e5', prob: 0.45, maiaWinrate: 0.48 },
      { san: 'Nf3', prob: 0.40, maiaWinrate: 0.52 },
    ])

    const cells = buildMainlineCells(root, 30, 'w')

    expect(cells[0].moveNumber).toBe(30)
    expect(cells[0].color).toBe('w')
    expect(cells[1].moveNumber).toBe(30)
    expect(cells[1].color).toBe('b')
  })

  test('correctly assigns move numbers starting from black move', () => {
    const root = createLinearTree([
      { san: 'Nf6', prob: 0.45, maiaWinrate: 0.48 },
      { san: 'Nc3', prob: 0.40, maiaWinrate: 0.52 },
    ])

    const cells = buildMainlineCells(root, 30, 'b')

    expect(cells[0].moveNumber).toBe(30)
    expect(cells[0].color).toBe('b')
    expect(cells[1].moveNumber).toBe(31)
    expect(cells[1].color).toBe('w')
  })

  test('marks cells with alternatives correctly', () => {
    const root = createBranchingTree(
      [
        { san: 'e5', prob: 0.45 },
        { san: 'Nf3', prob: 0.40 },
      ],
      [{ atDepth: 0, alternatives: [{ san: 'd5', prob: 0.30 }] }]
    )

    const cells = buildMainlineCells(root, 1, 'w')

    expect(cells[0].hasAlternatives).toBe(true)
    expect(cells[1].hasAlternatives).toBe(false)
  })
})

describe('treeToTableRows', () => {
  test('converts simple mainline to single row', () => {
    const root = createLinearTree([
      { san: 'e5', prob: 0.45, maiaWinrate: 0.48 },
      { san: 'Nf3', prob: 0.40, maiaWinrate: 0.52 },
      { san: 'Nc6', prob: 0.50, maiaWinrate: 0.50 },
    ])

    const rows = treeToTableRows(root, new Set(), 1, 'w')

    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('mainline')
    expect(rows[0].moves).toHaveLength(3)
    expect(rows[0].moves.map(m => m.san)).toEqual(['e5', 'Nf3', 'Nc6'])
  })

  test('calculates likelihood from cumulative probability of leaf', () => {
    const root = createLinearTree([
      { san: 'e5', prob: 0.5, maiaWinrate: 0.48 },
      { san: 'Nf3', prob: 0.4, maiaWinrate: 0.52 },
    ])

    const rows = treeToTableRows(root, new Set(), 1, 'w')

    // Likelihood = cumulative probability at leaf = 0.5 * 0.4 = 0.2
    expect(rows[0].likelihood).toBeCloseTo(0.2, 2)
  })

  test('adds alternative rows when cell is expanded', () => {
    // Tree structure:
    // root → e5 (0.45) → Nf3 (0.40) [mainline at ply 1]
    //                  → Bc4 (0.30) [alternative at ply 1]
    //      → d5 (0.30) → ...
    //
    // When we expand Nf3 at ply 1, Bc4 should appear as an alternative

    // Build e5 branch with alternatives at ply 1
    const e5Nf3 = createChildNode('Nf3', 0.40, 0.52, 2, [])
    e5Nf3.cumulativeProbability = 0.45 * 0.40
    const e5Bc4 = createChildNode('Bc4', 0.30, 0.50, 2, [])
    e5Bc4.cumulativeProbability = 0.45 * 0.30

    const e5 = createChildNode('e5', 0.45, 0.50, 1, [e5Nf3, e5Bc4])
    e5.cumulativeProbability = 0.45

    const d5 = createChildNode('d5', 0.30, 0.50, 1, [])
    d5.cumulativeProbability = 0.30

    const root = createMockNode({
      children: [e5, d5],
      isLeaf: false,
      exploredProbability: 0.75,
    })

    const expanded = new Set(['1-Nf3'])
    const rows = treeToTableRows(root, expanded, 1, 'w')

    // Should have: mainline (e5), e5's Bc4 alt, ply1-d5
    expect(rows).toHaveLength(3)
    expect(rows[0].id).toBe('mainline')
    expect(rows[0].moves[0].san).toBe('e5')

    // Alternative row for Bc4 (within e5 branch)
    expect(rows[1].id).toBe('mainline-alt-1-Bc4')
    expect(rows[1].moves[0].san).toBe('Bc4')
    expect(rows[1].branchDepth).toBe(1)

    // d5 row still visible
    expect(rows[2].id).toBe('ply1-d5')
    expect(rows[2].moves[0].san).toBe('d5')
  })

  test('sorts alternative rows by probability (highest first)', () => {
    // Tree: root → e5 → [Nf3 (0.40), Bc4 (0.30), d4 (0.15)]
    // When Nf3 is expanded, Bc4 should come before d4 (higher prob)

    const e5Nf3 = createChildNode('Nf3', 0.40, 0.52, 2, [])
    e5Nf3.cumulativeProbability = 0.45 * 0.40
    const e5Bc4 = createChildNode('Bc4', 0.30, 0.50, 2, [])
    e5Bc4.cumulativeProbability = 0.45 * 0.30
    const e5d4 = createChildNode('d4', 0.15, 0.48, 2, [])
    e5d4.cumulativeProbability = 0.45 * 0.15

    const e5 = createChildNode('e5', 0.45, 0.50, 1, [e5Nf3, e5Bc4, e5d4])
    e5.cumulativeProbability = 0.45

    const root = createMockNode({
      children: [e5],
      isLeaf: false,
      exploredProbability: 0.45,
    })

    const expanded = new Set(['1-Nf3'])
    const rows = treeToTableRows(root, expanded, 1, 'w')

    // rows[0] = mainline (e5), rows[1] = Bc4 alt, rows[2] = d4 alt
    expect(rows[1].moves[0].san).toBe('Bc4')
    expect(rows[2].moves[0].san).toBe('d4')
  })

  test('marks cells as expanded when in expandedCells set', () => {
    // In default mode, ply 0 cells never show isExpanded (they're always visible as rows)
    // Only ply 1+ cells can be expanded

    const e5Nf3 = createChildNode('Nf3', 0.40, 0.52, 2, [])
    e5Nf3.cumulativeProbability = 0.45 * 0.40
    const e5Bc4 = createChildNode('Bc4', 0.30, 0.50, 2, [])
    e5Bc4.cumulativeProbability = 0.45 * 0.30

    const e5 = createChildNode('e5', 0.45, 0.50, 1, [e5Nf3, e5Bc4])
    e5.cumulativeProbability = 0.45

    const root = createMockNode({
      children: [e5],
      isLeaf: false,
      exploredProbability: 0.45,
    })

    const expanded = new Set(['1-Nf3'])
    const rows = treeToTableRows(root, expanded, 1, 'w')

    // Ply 0 cell (e5) should not be marked as expanded
    expect(rows[0].moves[0].isExpanded).toBe(false)
    // Ply 1 cell (Nf3) should be marked as expanded
    expect(rows[0].moves[1].isExpanded).toBe(true)
  })

  test('handles empty tree (root only)', () => {
    const root = createMockNode({
      children: [],
      isLeaf: true,
    })

    const rows = treeToTableRows(root, new Set(), 1, 'w')

    expect(rows).toHaveLength(1)
    expect(rows[0].moves).toHaveLength(0)
  })

  test('calculates lineEW from leaf node maiaWinrate', () => {
    const root = createLinearTree([
      { san: 'e5', prob: 0.45, maiaWinrate: 0.48 },
      { san: 'Nf3', prob: 0.40, maiaWinrate: 0.55 },
    ])

    const rows = treeToTableRows(root, new Set(), 1, 'w')

    expect(rows[0].lineEW).toBeCloseTo(0.55, 2)
  })

  test('nested expansion adds more alternative rows', () => {
    // Tree: root → e5 → Nf3 (mainline) → Nc6 (mainline)
    //                  → Bc4 (alt)
    //             → d5 (always visible as separate ply-0 row)
    //
    // Only ply 1+ can be expanded. Ply 0 alternatives are always visible.

    // Build e5 branch with alternatives at ply 1
    const Nc6 = createChildNode('Nc6', 0.50, 0.50, 3, [])
    Nc6.cumulativeProbability = 0.45 * 0.40 * 0.50

    const Nf3 = createChildNode('Nf3', 0.40, 0.52, 2, [Nc6])
    Nf3.cumulativeProbability = 0.45 * 0.40

    const Bc4 = createChildNode('Bc4', 0.35, 0.50, 2, [])
    Bc4.cumulativeProbability = 0.45 * 0.35

    const e5 = createChildNode('e5', 0.45, 0.50, 1, [Nf3, Bc4])
    e5.cumulativeProbability = 0.45

    const d5 = createChildNode('d5', 0.30, 0.50, 1, [])
    d5.cumulativeProbability = 0.30

    const root = createMockNode({
      children: [e5, d5],
      isLeaf: false,
      exploredProbability: 0.75,
    })

    // Expand at ply 1 (Nf3)
    const expanded = new Set(['1-Nf3'])
    const rows = treeToTableRows(root, expanded, 1, 'w')

    expect(rows.length).toBeGreaterThan(1)

    // Mainline row should exist
    const mainline = rows.find(r => r.id === 'mainline')
    expect(mainline).toBeDefined()

    // Ply-0 alternatives are always visible as separate rows
    const d5Row = rows.find(r => r.id === 'ply1-d5')
    expect(d5Row).toBeDefined()

    // Ply-1 alternative should be visible under mainline
    const altAtDepth1 = rows.find(r => r.id === 'mainline-alt-1-Bc4')
    expect(altAtDepth1).toBeDefined()
  })
})

describe('treeToTableRows - ply 1 default expansion', () => {
  test('shows all ply 1 children as rows when nothing is expanded', () => {
    // Tree with 3 children at ply 0 (e5, d5, c5)
    const root = createBranchingTree(
      [
        { san: 'e5', prob: 0.45 },
        { san: 'Nf3', prob: 0.40 },
      ],
      [
        {
          atDepth: 0,
          alternatives: [
            { san: 'd5', prob: 0.30 },
            { san: 'c5', prob: 0.15 },
          ],
        },
      ]
    )

    // Empty expandedCells = default mode
    const rows = treeToTableRows(root, new Set(), 1, 'w')

    // Should show all 3 ply 1 children as separate rows
    expect(rows).toHaveLength(3)

    // Verify all three moves are present
    const rowSans = rows.map(r => r.moves[0]?.san)
    expect(rowSans).toContain('e5')
    expect(rowSans).toContain('d5')
    expect(rowSans).toContain('c5')
  })

  test('ply 1 rows are sorted by probability in default mode', () => {
    const root = createBranchingTree(
      [{ san: 'e5', prob: 0.45 }],
      [
        {
          atDepth: 0,
          alternatives: [
            { san: 'c5', prob: 0.15 },
            { san: 'd5', prob: 0.30 },
          ],
        },
      ]
    )

    const rows = treeToTableRows(root, new Set(), 1, 'w')

    // Should be sorted: e5 (0.45), d5 (0.30), c5 (0.15)
    expect(rows[0].moves[0].san).toBe('e5')
    expect(rows[1].moves[0].san).toBe('d5')
    expect(rows[2].moves[0].san).toBe('c5')
  })

  test('ply 1 cells should not show hasAlternatives in default mode', () => {
    const root = createBranchingTree(
      [
        { san: 'e5', prob: 0.45 },
        { san: 'Nf3', prob: 0.40 },
      ],
      [
        {
          atDepth: 0,
          alternatives: [{ san: 'd5', prob: 0.30 }],
        },
      ]
    )

    const rows = treeToTableRows(root, new Set(), 1, 'w')

    // In default mode, ply 1 cells should NOT show + button
    // because alternatives are already expanded as separate rows
    for (const row of rows) {
      if (row.moves[0]) {
        expect(row.moves[0].hasAlternatives).toBe(false)
      }
    }
  })

  test('when any + is clicked, all ply 0 rows stay visible (no focused mode)', () => {
    // NEW BEHAVIOR: Ply-0 rows always stay visible when expanding cells.
    // There is no "focused mode" anymore - expansions are per-branch.

    const root = createBranchingTree(
      [
        { san: 'e5', prob: 0.45 },
        { san: 'Nf3', prob: 0.40 },
      ],
      [
        {
          atDepth: 0,
          alternatives: [
            { san: 'd5', prob: 0.30 },
            { san: 'c5', prob: 0.15 },
          ],
        },
        {
          atDepth: 1,
          alternatives: [{ san: 'Bc4', prob: 0.35 }],
        },
      ]
    )

    // Expand something at ply 1
    const expanded = new Set(['1-Nf3'])
    const rows = treeToTableRows(root, expanded, 1, 'w')

    const rowIds = rows.map(r => r.id)
    expect(rowIds).toContain('mainline')

    // Alternative at ply 1 should be visible (within mainline branch)
    expect(rowIds).toContain('mainline-alt-1-Bc4')

    // Ply 0 alternative rows should STILL be present (not hidden)
    expect(rowIds).toContain('ply1-d5')
    expect(rowIds).toContain('ply1-c5')

    // Ply 0 cells still don't show hasAlternatives (all are visible as rows)
    const mainline = rows.find(r => r.id === 'mainline')
    expect(mainline?.moves[0]?.hasAlternatives).toBe(false)
  })

  test('ply 0 cells never show hasAlternatives (all visible as rows)', () => {
    // Ply 0 cells should NEVER show hasAlternatives because all ply-0
    // children are already visible as separate rows. No expansion needed.
    const root = createBranchingTree(
      [
        { san: 'e5', prob: 0.45 },
        { san: 'Nf3', prob: 0.40 },
      ],
      [
        {
          atDepth: 0,
          alternatives: [{ san: 'd5', prob: 0.30 }],
        },
        {
          atDepth: 1,
          alternatives: [{ san: 'Bc4', prob: 0.35 }],
        },
      ]
    )

    // Test with expansions (any ply 1 cell expanded)
    const expanded = new Set(['1-Nf3'])
    const rows = treeToTableRows(root, expanded, 1, 'w')

    // Check all ply-0 cells - none should have hasAlternatives
    for (const row of rows) {
      if (row.branchDepth === 0 && row.moves[0]) {
        expect(row.moves[0].hasAlternatives).toBe(false)
      }
    }
  })

  test('each ply 1 row shows its own continuation mainline', () => {
    // Create tree where each ply 0 child has its own continuation
    const e5Child = createChildNode('e5', 0.45, 0.50, 1, [
      createChildNode('Nf3', 0.40, 0.52, 2, [
        createChildNode('Nc6', 0.50, 0.50, 3, []),
      ]),
    ])
    const d5Child = createChildNode('d5', 0.30, 0.50, 1, [
      createChildNode('exd5', 0.60, 0.55, 2, [
        createChildNode('Qxd5', 0.80, 0.53, 3, []),
      ]),
    ])

    const root = createMockNode({
      children: [e5Child, d5Child],
      isLeaf: false,
      exploredProbability: 0.75,
    })

    const rows = treeToTableRows(root, new Set(), 1, 'w')

    // Should show 2 rows, each with their own mainline continuation
    expect(rows).toHaveLength(2)

    const e5Row = rows.find(r => r.moves[0]?.san === 'e5')
    expect(e5Row).toBeDefined()
    expect(e5Row!.moves.map(m => m.san)).toEqual(['e5', 'Nf3', 'Nc6'])

    const d5Row = rows.find(r => r.moves[0]?.san === 'd5')
    expect(d5Row).toBeDefined()
    expect(d5Row!.moves.map(m => m.san)).toEqual(['d5', 'exd5', 'Qxd5'])
  })
})

describe('treeToTableRows - per-branch expansion in default mode', () => {
  /**
   * This test suite verifies that clicking + on a cell expands alternatives
   * WITHIN that specific ply-0 branch, rather than switching to focused mode.
   *
   * Bug context: Previously, clicking + on Bg7 in the Nf3 row would switch
   * to focused mode showing the global mainline (d4 branch), losing the
   * expansion context and showing no alternatives.
   */

  test('expanding cell at ply 1 in one branch shows alternatives for that branch only', () => {
    // Tree structure:
    // root
    //   ├─ e5 (0.45) [ply 0, mainline]
    //   │    └─ Nf3 (0.40) [ply 1] - NO alternatives to Nf3 in e5 branch
    //   └─ d5 (0.30) [ply 0]
    //        ├─ Nf3 (0.35) [ply 1, mainline in d5 branch]
    //        └─ Bc4 (0.25) [ply 1, alternative to Nf3 in d5 branch]
    //
    // When user expands "1-Nf3", they expect to see Bc4 as alternative
    // in the d5 branch, NOT nothing (which happens if we look in e5 branch).

    // Build the e5 branch (no alternatives to Nf3)
    const e5Nf3 = createChildNode('Nf3', 0.40, 0.52, 2, [])
    e5Nf3.cumulativeProbability = 0.45 * 0.40

    const e5 = createChildNode('e5', 0.45, 0.50, 1, [e5Nf3])
    e5.cumulativeProbability = 0.45

    // Build the d5 branch (Nf3 has sibling Bc4)
    const d5Nf3 = createChildNode('Nf3', 0.35, 0.48, 2, [])
    d5Nf3.cumulativeProbability = 0.30 * 0.35

    const d5Bc4 = createChildNode('Bc4', 0.25, 0.46, 2, [])
    d5Bc4.cumulativeProbability = 0.30 * 0.25

    const d5 = createChildNode('d5', 0.30, 0.50, 1, [d5Nf3, d5Bc4])
    d5.cumulativeProbability = 0.30

    const root = createMockNode({
      children: [e5, d5],
      isLeaf: false,
      exploredProbability: 0.75,
    })

    // Expand Nf3 at ply 1
    const expanded = new Set(['1-Nf3'])
    const rows = treeToTableRows(root, expanded, 1, 'w')

    // Should still show both ply-0 branches (e5 and d5) - NOT switch to focused mode
    const ply0Moves = rows.filter(r => r.branchDepth === 0).map(r => r.moves[0]?.san)
    expect(ply0Moves).toContain('e5')
    expect(ply0Moves).toContain('d5')

    // Should have an alternative row for Bc4 (from d5 branch)
    const bc4Row = rows.find(r => r.moves[0]?.san === 'Bc4')
    expect(bc4Row).toBeDefined()
    expect(bc4Row!.branchDepth).toBe(1) // Branches at ply 1
  })

  test('alternative rows appear after their parent ply-0 row', () => {
    // Tree: root → [e5 (0.45), d5 (0.30)]
    // d5 → [Nf3 (0.35), Bc4 (0.25)]

    const e5 = createChildNode('e5', 0.45, 0.50, 1, [])
    e5.cumulativeProbability = 0.45

    const d5Nf3 = createChildNode('Nf3', 0.35, 0.48, 2, [])
    d5Nf3.cumulativeProbability = 0.30 * 0.35

    const d5Bc4 = createChildNode('Bc4', 0.25, 0.46, 2, [])
    d5Bc4.cumulativeProbability = 0.30 * 0.25

    const d5 = createChildNode('d5', 0.30, 0.50, 1, [d5Nf3, d5Bc4])
    d5.cumulativeProbability = 0.30

    const root = createMockNode({
      children: [e5, d5],
      isLeaf: false,
      exploredProbability: 0.75,
    })

    const expanded = new Set(['1-Nf3'])
    const rows = treeToTableRows(root, expanded, 1, 'w')

    // Find positions of e5, d5, and Bc4 rows
    const e5Index = rows.findIndex(r => r.moves[0]?.san === 'e5')
    const d5Index = rows.findIndex(r => r.moves[0]?.san === 'd5')
    const bc4Index = rows.findIndex(r => r.moves[0]?.san === 'Bc4')

    // Bc4 should come after d5 (its parent), not after e5
    expect(d5Index).toBeLessThan(bc4Index)
    // e5 should still be first (highest prob)
    expect(e5Index).toBeLessThan(d5Index)
  })

  test('cells in default mode rows show isExpanded when expanded', () => {
    // Verify that the isExpanded flag is properly set on cells in default mode

    const d5Nf3 = createChildNode('Nf3', 0.35, 0.48, 2, [])
    d5Nf3.cumulativeProbability = 0.35

    const d5Bc4 = createChildNode('Bc4', 0.25, 0.46, 2, [])
    d5Bc4.cumulativeProbability = 0.25

    const d5 = createChildNode('d5', 0.50, 0.50, 1, [d5Nf3, d5Bc4])
    d5.cumulativeProbability = 0.50

    const root = createMockNode({
      children: [d5],
      isLeaf: false,
      exploredProbability: 0.50,
    })

    const expanded = new Set(['1-Nf3'])
    const rows = treeToTableRows(root, expanded, 1, 'w')

    // Find the d5 main row
    const d5Row = rows.find(r => r.moves[0]?.san === 'd5')
    expect(d5Row).toBeDefined()

    // The Nf3 cell at ply 1 should be marked as expanded
    const nf3Cell = d5Row!.moves.find(c => c.san === 'Nf3')
    expect(nf3Cell).toBeDefined()
    expect(nf3Cell!.isExpanded).toBe(true)
  })

  test('expanding in one ply-0 branch does not affect other branches', () => {
    // Tree:
    // root
    //   ├─ e5 → Nf3 (has sibling Bc4)
    //   └─ d5 → Nf3 (has sibling Bc4)
    //
    // Expanding Nf3 should only show Bc4 in the branches where Nf3 has siblings

    // e5 branch with alternatives
    const e5Nf3 = createChildNode('Nf3', 0.40, 0.52, 2, [])
    e5Nf3.cumulativeProbability = 0.45 * 0.40
    const e5Bc4 = createChildNode('Bc4', 0.30, 0.50, 2, [])
    e5Bc4.cumulativeProbability = 0.45 * 0.30
    const e5 = createChildNode('e5', 0.45, 0.50, 1, [e5Nf3, e5Bc4])
    e5.cumulativeProbability = 0.45

    // d5 branch with alternatives
    const d5Nf3 = createChildNode('Nf3', 0.35, 0.48, 2, [])
    d5Nf3.cumulativeProbability = 0.30 * 0.35
    const d5Bc4 = createChildNode('Bc4', 0.25, 0.46, 2, [])
    d5Bc4.cumulativeProbability = 0.30 * 0.25
    const d5 = createChildNode('d5', 0.30, 0.50, 1, [d5Nf3, d5Bc4])
    d5.cumulativeProbability = 0.30

    const root = createMockNode({
      children: [e5, d5],
      isLeaf: false,
      exploredProbability: 0.75,
    })

    const expanded = new Set(['1-Nf3'])
    const rows = treeToTableRows(root, expanded, 1, 'w')

    // Should have 4 rows: e5 main, e5's Bc4 alt, d5 main, d5's Bc4 alt
    // (Both branches have Nf3 at ply 1 with Bc4 sibling)
    expect(rows.length).toBe(4)

    // Both Bc4 alternatives should be present
    const bc4Rows = rows.filter(r => r.moves[0]?.san === 'Bc4')
    expect(bc4Rows.length).toBe(2)
  })
})

describe('treeToTableRows - alternative likelihood calculation', () => {
  test('likelihood uses leaf cumulativeProbability for accuracy', () => {
    // Tree structure with correct cumulativeProbability values:
    // root (cumProb=1.0)
    //   └─ Nxd1 (prob=0.30, cumProb=0.30) [ply 0]
    //        └─ Bxg7 (prob=0.50, cumProb=0.15) [ply 1]
    //             ├─ Qb1 (prob=0.40, cumProb=0.06) [ply 2, mainline]
    //             └─ Kxg7 (prob=0.35, cumProb=0.0525) [ply 2, alternative]
    //
    // Likelihood for Kxg7 row = leaf.cumulativeProbability = 0.0525

    // Build nodes with correct cumulativeProbability values
    const Qb1 = createChildNode('Qb1', 0.40, 0.60, 3, [])
    Qb1.cumulativeProbability = 0.30 * 0.50 * 0.40 // 0.06

    const Kxg7 = createChildNode('Kxg7', 0.35, 0.58, 3, [])
    Kxg7.cumulativeProbability = 0.30 * 0.50 * 0.35 // 0.0525

    const Bxg7 = createChildNode('Bxg7', 0.50, 0.55, 2, [Qb1, Kxg7])
    Bxg7.cumulativeProbability = 0.30 * 0.50 // 0.15

    const Nxd1 = createChildNode('Nxd1', 0.30, 0.52, 1, [Bxg7])
    Nxd1.cumulativeProbability = 0.30

    const root = createMockNode({
      children: [Nxd1],
      isLeaf: false,
      exploredProbability: 0.30,
    })

    // Expand at ply 2 (Qb1) to show Kxg7 alternative
    const expanded = new Set(['2-Qb1'])
    const rows = treeToTableRows(root, expanded, 16, 'b')

    // Find the Kxg7 alternative row (under mainline)
    const kxg7Row = rows.find(r => r.id === 'mainline-alt-2-Kxg7')
    expect(kxg7Row).toBeDefined()

    // Likelihood = leaf.cumulativeProbability = 0.0525
    expect(kxg7Row!.likelihood).toBeCloseTo(0.0525, 4)
  })

  test('alternative at ply 1 uses leaf cumulativeProbability', () => {
    // Tree structure:
    // root (cumProb=1.0)
    //   └─ e5 (prob=0.50, cumProb=0.50) [ply 0]
    //        ├─ Nf3 (prob=0.40, cumProb=0.20) [ply 1, mainline]
    //        │    └─ Nc6 (prob=0.60, cumProb=0.12) [ply 2]
    //        └─ Bc4 (prob=0.35, cumProb=0.175) [ply 1, alternative]
    //
    // Likelihood for Bc4 row = leaf.cumulativeProbability = 0.175 (Bc4 is leaf)

    const Nc6 = createChildNode('Nc6', 0.60, 0.50, 3, [])
    Nc6.cumulativeProbability = 0.50 * 0.40 * 0.60 // 0.12

    const Nf3 = createChildNode('Nf3', 0.40, 0.52, 2, [Nc6])
    Nf3.cumulativeProbability = 0.50 * 0.40 // 0.20

    const Bc4 = createChildNode('Bc4', 0.35, 0.48, 2, [])
    Bc4.cumulativeProbability = 0.50 * 0.35 // 0.175

    const e5 = createChildNode('e5', 0.50, 0.48, 1, [Nf3, Bc4])
    e5.cumulativeProbability = 0.50

    const root = createMockNode({
      children: [e5],
      isLeaf: false,
      exploredProbability: 0.50,
    })

    // Expand at ply 1 (Nf3) to show Bc4 alternative
    const expanded = new Set(['1-Nf3'])
    const rows = treeToTableRows(root, expanded, 1, 'w')

    // Find the Bc4 alternative row (under mainline)
    const bc4Row = rows.find(r => r.id === 'mainline-alt-1-Bc4')
    expect(bc4Row).toBeDefined()

    // Likelihood = leaf.cumulativeProbability = 0.175
    expect(bc4Row!.likelihood).toBeCloseTo(0.175, 3)
  })

  test('mainline likelihood uses leaf cumulativeProbability', () => {
    // Mainline: e5 (50%) → Nf3 (40%) → Nc6 (60%)
    // Likelihood = leaf.cumulativeProbability = 0.12

    const Nc6 = createChildNode('Nc6', 0.60, 0.50, 3, [])
    Nc6.cumulativeProbability = 0.50 * 0.40 * 0.60 // 0.12

    const Nf3 = createChildNode('Nf3', 0.40, 0.52, 2, [Nc6])
    Nf3.cumulativeProbability = 0.50 * 0.40 // 0.20

    const e5 = createChildNode('e5', 0.50, 0.48, 1, [Nf3])
    e5.cumulativeProbability = 0.50

    const root = createMockNode({
      children: [e5],
      isLeaf: false,
      exploredProbability: 0.50,
    })

    // Expand at ply 1 to verify likelihood is still computed correctly
    const expanded = new Set(['1-Nf3'])
    const rows = treeToTableRows(root, expanded, 1, 'w')

    const mainline = rows.find(r => r.id === 'mainline')
    expect(mainline).toBeDefined()

    // Likelihood = leaf.cumulativeProbability = 0.12
    expect(mainline!.likelihood).toBeCloseTo(0.12, 3)
  })
})
