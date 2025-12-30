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
 */
function createLinearTree(moves: Array<{ san: string; prob: number; maiaWinrate: number }>): TreeNode {
  function buildChildChain(
    movesRemaining: Array<{ san: string; prob: number; maiaWinrate: number }>,
    depth: number
  ): TreeNode | null {
    if (movesRemaining.length === 0) {
      return null
    }

    const [first, ...rest] = movesRemaining
    const childNode = buildChildChain(rest, depth + 1)

    return createChildNode(
      first.san,
      first.prob,
      first.maiaWinrate,
      depth,
      childNode ? [childNode] : []
    )
  }

  const firstChild = buildChildChain(moves, 1)

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

    const expanded = new Set(['0-e5'])
    const rows = treeToTableRows(root, expanded, 1, 'w')

    expect(rows).toHaveLength(3)
    expect(rows[0].id).toBe('mainline')
    expect(rows[0].moves[0].san).toBe('e5')

    expect(rows[1].id).toBe('alt-0-d5')
    expect(rows[1].moves[0].san).toBe('d5')
    expect(rows[1].branchDepth).toBe(0)

    expect(rows[2].id).toBe('alt-0-c5')
    expect(rows[2].moves[0].san).toBe('c5')
  })

  test('sorts alternative rows by probability (highest first)', () => {
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

    const expanded = new Set(['0-e5'])
    const rows = treeToTableRows(root, expanded, 1, 'w')

    expect(rows[1].moves[0].san).toBe('d5')
    expect(rows[2].moves[0].san).toBe('c5')
  })

  test('marks cells as expanded when in expandedCells set', () => {
    const root = createBranchingTree(
      [
        { san: 'e5', prob: 0.45 },
        { san: 'Nf3', prob: 0.40 },
      ],
      [{ atDepth: 0, alternatives: [{ san: 'd5', prob: 0.30 }] }]
    )

    const expanded = new Set(['0-e5'])
    const rows = treeToTableRows(root, expanded, 1, 'w')

    expect(rows[0].moves[0].isExpanded).toBe(true)
    expect(rows[0].moves[1].isExpanded).toBe(false)
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
    const root = createBranchingTree(
      [
        { san: 'e5', prob: 0.45 },
        { san: 'Nf3', prob: 0.40 },
        { san: 'Nc6', prob: 0.50 },
      ],
      [
        { atDepth: 0, alternatives: [{ san: 'd5', prob: 0.30 }] },
        { atDepth: 1, alternatives: [{ san: 'Bc4', prob: 0.35 }] },
      ]
    )

    const expanded = new Set(['0-e5', '1-Nf3'])
    const rows = treeToTableRows(root, expanded, 1, 'w')

    expect(rows.length).toBeGreaterThan(1)

    const mainline = rows.find(r => r.id === 'mainline')
    expect(mainline).toBeDefined()

    const altAtDepth0 = rows.find(r => r.id === 'alt-0-d5')
    expect(altAtDepth0).toBeDefined()

    const altAtDepth1 = rows.find(r => r.id === 'alt-1-Bc4')
    expect(altAtDepth1).toBeDefined()
  })
})
