/**
 * EW Tree to Table Transformation
 *
 * Converts the recursive TreeNode structure into flat table rows
 * for the horizontal table-based EW visualization.
 *
 * Key concepts:
 * - Mainline: The highest probability path through the tree
 * - Alternative rows: Branches shown when a cell is expanded
 * - Expansion state: Tracked via Set<string> with keys like "plyIndex-san"
 */
import type { TreeNode } from './types'

/**
 * A cell in the EW table representing a single move.
 */
export interface EWTableCell {
  /** SAN notation for display (e.g., "Nf3") */
  san: string

  /** Full move number in PGN format (e.g., 30 for "30." or "30...") */
  moveNumber: number

  /** Which color made this move */
  color: 'w' | 'b'

  /** Reference to the TreeNode for hover tooltips and navigation */
  node: TreeNode

  /** Whether this cell has unexplored alternatives */
  hasAlternatives: boolean

  /** Whether this cell is currently expanded (showing alternatives below) */
  isExpanded: boolean

  /** Zero-based ply index (column position in table) */
  plyIndex: number
}

/**
 * A row in the EW table representing one line through the tree.
 */
export interface EWTableLine {
  /** Unique identifier for this row (e.g., "mainline" or "alt-0-d5") */
  id: string

  /** Array of cells, one per ply column */
  moves: EWTableCell[]

  /** Line-specific expected winrate (eval at leaf node) */
  lineEW: number | null

  /** Cumulative probability of reaching this exact line's end position */
  likelihood: number

  /** Depth at which this line branches from mainline (0 for mainline) */
  branchDepth: number

  /** Parent line ID for cascading collapse (null for mainline) */
  parentLineId: string | null
}

/**
 * Extract the fullmove number from a FEN string.
 *
 * FEN format: "position turn castling en-passant halfmove fullmove"
 * Example: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
 *                                                              ^
 *                                                         fullmove = 1
 */
export function getMoveNumberFromFen(fen: string): number {
  if (!fen || typeof fen !== 'string') {
    return 1
  }

  const parts = fen.split(' ')
  if (parts.length < 6) {
    return 1
  }

  const fullmove = parseInt(parts[5], 10)
  return isNaN(fullmove) ? 1 : fullmove
}

/**
 * Extract the side-to-move from a FEN string.
 *
 * Returns 'w' for white to move, 'b' for black to move.
 */
export function getColorFromFen(fen: string): 'w' | 'b' {
  if (!fen || typeof fen !== 'string') {
    return 'w'
  }

  const parts = fen.split(' ')
  if (parts.length < 2) {
    return 'w'
  }

  return parts[1] === 'b' ? 'b' : 'w'
}

/**
 * Calculate move number and color for a given ply index.
 *
 * @param plyIndex - Zero-based index of the ply in the line
 * @param baseMoveNumber - Starting move number from the root position
 * @param baseColor - Color to move at the root position
 * @returns Object with moveNumber and color
 */
function calculateMoveInfo(
  plyIndex: number,
  baseMoveNumber: number,
  baseColor: 'w' | 'b'
): { moveNumber: number; color: 'w' | 'b' } {
  if (baseColor === 'w') {
    const isWhiteMove = plyIndex % 2 === 0
    const moveNumber = baseMoveNumber + Math.floor(plyIndex / 2)
    return {
      moveNumber,
      color: isWhiteMove ? 'w' : 'b',
    }
  } else {
    const isBlackMove = plyIndex % 2 === 0
    const moveNumber = baseMoveNumber + Math.floor((plyIndex + 1) / 2)
    return {
      moveNumber,
      color: isBlackMove ? 'b' : 'w',
    }
  }
}

/**
 * Walk the tree following highest probability children to build the mainline.
 *
 * @param root - Root node of the tree
 * @returns Array of TreeNodes representing the mainline path
 */
function getMainlinePath(root: TreeNode): TreeNode[] {
  const path: TreeNode[] = []
  let current = root

  while (current.children.length > 0) {
    const sorted = [...current.children].sort((a, b) => b.probability - a.probability)
    const best = sorted[0]
    path.push(best)
    current = best
  }

  return path
}

/**
 * Build table cells from a tree path.
 *
 * @param root - Root node to start from
 * @param baseMoveNumber - Starting move number
 * @param baseColor - Color to move at root
 * @param expandedCells - Set of expanded cell keys
 * @returns Array of EWTableCell objects
 */
export function buildMainlineCells(
  root: TreeNode,
  baseMoveNumber: number,
  baseColor: 'w' | 'b',
  expandedCells: Set<string> = new Set()
): EWTableCell[] {
  const mainlinePath = getMainlinePath(root)
  const cells: EWTableCell[] = []

  let parentNode = root
  for (let i = 0; i < mainlinePath.length; i++) {
    const node = mainlinePath[i]
    const { moveNumber, color } = calculateMoveInfo(i, baseMoveNumber, baseColor)

    const siblings = parentNode.children.filter(c => c.san !== node.san)
    const hasAlternatives = siblings.length > 0

    const cellKey = `${i}-${node.san}`
    const isExpanded = expandedCells.has(cellKey)

    cells.push({
      san: node.san || '?',
      moveNumber,
      color,
      node,
      hasAlternatives,
      isExpanded,
      plyIndex: i,
    })

    parentNode = node
  }

  return cells
}

/**
 * Find the leaf node of the mainline path.
 */
function getMainlineLeaf(root: TreeNode): TreeNode {
  let current = root

  while (current.children.length > 0) {
    const sorted = [...current.children].sort((a, b) => b.probability - a.probability)
    current = sorted[0]
  }

  return current
}

/**
 * Calculate cumulative probability by walking down the mainline.
 */
function calculateMainlineLikelihood(root: TreeNode): number {
  const path = getMainlinePath(root)
  if (path.length === 0) {
    return root.probability
  }

  let cumProb = 1
  for (const node of path) {
    cumProb *= node.probability
  }
  return cumProb
}

/**
 * Build alternative rows for expanded cells.
 *
 * @param root - Root node of the tree
 * @param expandedCells - Set of expanded cell keys
 * @param baseMoveNumber - Starting move number
 * @param baseColor - Color to move at root
 * @returns Array of alternative EWTableLine rows
 */
function buildAlternativeRows(
  root: TreeNode,
  expandedCells: Set<string>,
  baseMoveNumber: number,
  baseColor: 'w' | 'b'
): EWTableLine[] {
  const alternativeRows: EWTableLine[] = []

  const mainlinePath = getMainlinePath(root)
  let parentNode = root

  for (let plyIndex = 0; plyIndex < mainlinePath.length; plyIndex++) {
    const mainlineNode = mainlinePath[plyIndex]
    const cellKey = `${plyIndex}-${mainlineNode.san}`

    if (expandedCells.has(cellKey)) {
      const siblings = parentNode.children
        .filter(c => c.san !== mainlineNode.san)
        .sort((a, b) => b.probability - a.probability)

      for (const altNode of siblings) {
        const altCells = buildAlternativeCells(
          altNode,
          plyIndex,
          baseMoveNumber,
          baseColor,
          expandedCells
        )

        const altLeaf = getAlternativeLeaf(altNode)
        const altLikelihood = calculateAlternativeLikelihood(altNode, plyIndex, mainlinePath)

        alternativeRows.push({
          id: `alt-${plyIndex}-${altNode.san}`,
          moves: altCells,
          lineEW: altLeaf.maiaWinrate,
          likelihood: altLikelihood,
          branchDepth: plyIndex,
          parentLineId: 'mainline',
        })
      }
    }

    parentNode = mainlineNode
  }

  return alternativeRows
}

/**
 * Build cells for an alternative branch.
 */
function buildAlternativeCells(
  altRoot: TreeNode,
  branchPlyIndex: number,
  baseMoveNumber: number,
  baseColor: 'w' | 'b',
  expandedCells: Set<string>
): EWTableCell[] {
  const cells: EWTableCell[] = []

  const { moveNumber, color } = calculateMoveInfo(branchPlyIndex, baseMoveNumber, baseColor)

  cells.push({
    san: altRoot.san || '?',
    moveNumber,
    color,
    node: altRoot,
    hasAlternatives: false,
    isExpanded: false,
    plyIndex: branchPlyIndex,
  })

  let current = altRoot
  let plyOffset = branchPlyIndex + 1

  while (current.children.length > 0) {
    const sorted = [...current.children].sort((a, b) => b.probability - a.probability)
    const next = sorted[0]

    const moveInfo = calculateMoveInfo(plyOffset, baseMoveNumber, baseColor)

    cells.push({
      san: next.san || '?',
      moveNumber: moveInfo.moveNumber,
      color: moveInfo.color,
      node: next,
      hasAlternatives: sorted.length > 1,
      isExpanded: expandedCells.has(`${plyOffset}-${next.san}`),
      plyIndex: plyOffset,
    })

    current = next
    plyOffset++
  }

  return cells
}

/**
 * Get the leaf node of an alternative branch.
 */
function getAlternativeLeaf(altRoot: TreeNode): TreeNode {
  let current = altRoot

  while (current.children.length > 0) {
    const sorted = [...current.children].sort((a, b) => b.probability - a.probability)
    current = sorted[0]
  }

  return current
}

/**
 * Calculate likelihood for an alternative branch.
 */
function calculateAlternativeLikelihood(
  altNode: TreeNode,
  _branchPly: number,
  _mainlinePath: TreeNode[]
): number {
  let cumProb = altNode.probability

  let current = altNode
  while (current.children.length > 0) {
    const sorted = [...current.children].sort((a, b) => b.probability - a.probability)
    cumProb *= sorted[0].probability
    current = sorted[0]
  }

  return cumProb
}

/**
 * Convert a TreeNode structure into flat table rows.
 *
 * This is the main entry point for the transformation.
 *
 * @param root - Root TreeNode (after candidate move is applied)
 * @param expandedCells - Set of expanded cell keys (format: "plyIndex-san")
 * @param baseMoveNumber - Starting move number from the position FEN
 * @param baseColor - Color to move at the root position
 * @returns Array of EWTableLine rows for rendering
 */
export function treeToTableRows(
  root: TreeNode,
  expandedCells: Set<string>,
  baseMoveNumber: number,
  baseColor: 'w' | 'b'
): EWTableLine[] {
  const rows: EWTableLine[] = []

  const mainlineCells = buildMainlineCells(root, baseMoveNumber, baseColor, expandedCells)
  const mainlineLeaf = getMainlineLeaf(root)
  const mainlineLikelihood = calculateMainlineLikelihood(root)

  rows.push({
    id: 'mainline',
    moves: mainlineCells,
    lineEW: mainlineCells.length > 0 ? mainlineLeaf.maiaWinrate : null,
    likelihood: mainlineLikelihood,
    branchDepth: 0,
    parentLineId: null,
  })

  const alternativeRows = buildAlternativeRows(root, expandedCells, baseMoveNumber, baseColor)
  rows.push(...alternativeRows)

  return rows
}
