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
 * @param hidePly0Alternatives - If true, ply 0 cells won't show hasAlternatives
 * @returns Array of EWTableCell objects
 */
export function buildMainlineCells(
  root: TreeNode,
  baseMoveNumber: number,
  baseColor: 'w' | 'b',
  expandedCells: Set<string> = new Set(),
  hidePly0Alternatives: boolean = false
): EWTableCell[] {
  const mainlinePath = getMainlinePath(root)
  const cells: EWTableCell[] = []

  let parentNode = root
  for (let i = 0; i < mainlinePath.length; i++) {
    const node = mainlinePath[i]
    const { moveNumber, color } = calculateMoveInfo(i, baseMoveNumber, baseColor)

    const siblings = parentNode.children.filter(c => c.san !== node.san)
    // When hidePly0Alternatives=true, ply 0 doesn't show + button (used in focused mode)
    const hasAlternatives = i === 0 && hidePly0Alternatives ? false : siblings.length > 0

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
 * Calculate cumulative probability of the mainline leaf.
 *
 * Uses the leaf's pre-computed cumulativeProbability from tree building
 * for consistency with alternative likelihood calculations.
 */
function calculateMainlineLikelihood(root: TreeNode): number {
  const leaf = getMainlineLeaf(root)
  return leaf.cumulativeProbability
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
        const altLikelihood = calculateAlternativeLikelihood(altNode)

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
 *
 * Returns the cumulative probability of reaching the leaf node of this alternative line.
 * Uses the leaf's pre-computed cumulativeProbability from tree building, which is more
 * accurate than recomputing from mainline ancestors (avoids discrepancies when the
 * alternative's actual path differs from the mainline path).
 */
function calculateAlternativeLikelihood(
  altNode: TreeNode
): number {
  // Find the leaf node by following highest-probability children
  let current = altNode
  while (current.children.length > 0) {
    const sorted = [...current.children].sort((a, b) => b.probability - a.probability)
    current = sorted[0]
  }

  // Return the leaf's pre-computed cumulative probability
  // This was calculated during tree building and accounts for the actual path taken
  return current.cumulativeProbability
}

/**
 * Build cells for a ply 1 child and its mainline continuation.
 * Used in default mode to show each ply 1 child as a separate row.
 *
 * @param ply1Node - The ply-0 child node to build cells for
 * @param baseMoveNumber - Starting move number from the position FEN
 * @param baseColor - Color to move at the root position
 * @param expandedCells - Set of expanded cell keys (format: "plyIndex-san")
 */
function buildPly1RowCells(
  ply1Node: TreeNode,
  baseMoveNumber: number,
  baseColor: 'w' | 'b',
  expandedCells: Set<string> = new Set()
): EWTableCell[] {
  const cells: EWTableCell[] = []
  const { moveNumber, color } = calculateMoveInfo(0, baseMoveNumber, baseColor)

  // First cell (ply 0) - no hasAlternatives since all are shown as rows
  cells.push({
    san: ply1Node.san || '?',
    moveNumber,
    color,
    node: ply1Node,
    hasAlternatives: false,
    isExpanded: false,
    plyIndex: 0,
  })

  // Follow mainline from this node
  let current = ply1Node
  let plyOffset = 1

  while (current.children.length > 0) {
    const sorted = [...current.children].sort((a, b) => b.probability - a.probability)
    const next = sorted[0]
    const moveInfo = calculateMoveInfo(plyOffset, baseMoveNumber, baseColor)

    const cellKey = `${plyOffset}-${next.san}`

    cells.push({
      san: next.san || '?',
      moveNumber: moveInfo.moveNumber,
      color: moveInfo.color,
      node: next,
      hasAlternatives: sorted.length > 1,
      isExpanded: expandedCells.has(cellKey),
      plyIndex: plyOffset,
    })

    current = next
    plyOffset++
  }

  return cells
}

/**
 * Build alternative rows for a specific ply-0 branch.
 *
 * Walks the mainline of the ply-0 node and generates alternative rows
 * for any expanded cells within that branch.
 *
 * @param ply0Node - The ply-0 child whose subtree we're exploring
 * @param ply0RowId - ID of the parent row (e.g., "mainline" or "ply1-d5")
 * @param expandedCells - Set of expanded cell keys (format: "plyIndex-san")
 * @param baseMoveNumber - Starting move number from the position FEN
 * @param baseColor - Color to move at the root position
 */
function buildPly1BranchAlternatives(
  ply0Node: TreeNode,
  ply0RowId: string,
  expandedCells: Set<string>,
  baseMoveNumber: number,
  baseColor: 'w' | 'b'
): EWTableLine[] {
  const alternativeRows: EWTableLine[] = []

  // Walk the mainline of this ply-0 branch
  let parentNode = ply0Node
  let plyIndex = 1 // Start at ply 1 (ply 0 is the ply0Node itself)

  while (parentNode.children.length > 0) {
    const sorted = [...parentNode.children].sort((a, b) => b.probability - a.probability)
    const mainlineNode = sorted[0]
    const cellKey = `${plyIndex}-${mainlineNode.san}`

    // Check if this cell is expanded
    if (expandedCells.has(cellKey)) {
      // Get siblings (alternatives to the mainline move)
      const siblings = sorted.slice(1) // All except the mainline move

      for (const altNode of siblings) {
        const altCells = buildAlternativeCells(
          altNode,
          plyIndex,
          baseMoveNumber,
          baseColor,
          expandedCells
        )

        const altLeaf = getAlternativeLeaf(altNode)
        const altLikelihood = calculateAlternativeLikelihood(altNode)

        alternativeRows.push({
          id: `${ply0RowId}-alt-${plyIndex}-${altNode.san}`,
          moves: altCells,
          lineEW: altLeaf.maiaWinrate,
          likelihood: altLikelihood,
          branchDepth: plyIndex,
          parentLineId: ply0RowId,
        })
      }
    }

    parentNode = mainlineNode
    plyIndex++
  }

  return alternativeRows
}

/**
 * Build rows for default mode: all ply 1 children shown as separate rows.
 *
 * When expandedCells is provided, generates alternative rows for each
 * ply-0 branch that has expanded cells.
 *
 * @param root - Root TreeNode (after candidate move is applied)
 * @param baseMoveNumber - Starting move number from the position FEN
 * @param baseColor - Color to move at the root position
 * @param expandedCells - Set of expanded cell keys (format: "plyIndex-san")
 */
function buildDefaultModeRows(
  root: TreeNode,
  baseMoveNumber: number,
  baseColor: 'w' | 'b',
  expandedCells: Set<string> = new Set()
): EWTableLine[] {
  if (root.children.length === 0) {
    return [{
      id: 'mainline',
      moves: [],
      lineEW: null,
      likelihood: 1,
      branchDepth: 0,
      parentLineId: null,
    }]
  }

  // Sort children by probability (highest first)
  const sortedChildren = [...root.children].sort((a, b) => b.probability - a.probability)

  const rows: EWTableLine[] = []

  for (let index = 0; index < sortedChildren.length; index++) {
    const child = sortedChildren[index]
    const rowId = index === 0 ? 'mainline' : `ply1-${child.san}`

    // Build the main row for this ply-0 child
    const cells = buildPly1RowCells(child, baseMoveNumber, baseColor, expandedCells)
    const leaf = getAlternativeLeaf(child)
    const likelihood = calculateAlternativeLikelihood(child)

    rows.push({
      id: rowId,
      moves: cells,
      lineEW: leaf.maiaWinrate,
      likelihood,
      branchDepth: 0,
      parentLineId: null,
    })

    // Build alternative rows for any expanded cells in this branch
    const altRows = buildPly1BranchAlternatives(
      child,
      rowId,
      expandedCells,
      baseMoveNumber,
      baseColor
    )
    rows.push(...altRows)
  }

  return rows
}

/**
 * Convert a TreeNode structure into flat table rows.
 *
 * This is the main entry point for the transformation.
 *
 * All ply-0 children are shown as separate rows. When cells are expanded,
 * alternative rows are generated within each ply-0 branch's context.
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
  // Always use default mode - expansions are handled per-branch
  return buildDefaultModeRows(root, baseMoveNumber, baseColor, expandedCells)
}
