/**
 * Expected Winrate Tree Builder
 *
 * This module builds the probability trees used in Expected Winrate
 * calculation. It implements Phase 2 of the algorithm from IMPLEMENTATION-STRATEGY.md.
 *
 * ARCHITECTURE: Phase-separated design for efficiency
 * - Phase 2 (this module): Build tree using Maia ONLY (fast neural network calls)
 * - Phase 3 (separate step): Batch evaluate with Stockfish (efficient, no duplicates)
 *
 * This separation is more efficient because:
 * 1. Maia calls are fast (~5ms each)
 * 2. SF calls are slow (~50-100ms each)
 * 3. Many positions in the tree are duplicates
 * 4. Batch SF evaluation avoids redundant work
 *
 * Tree termination is purely probability-based (no maxDepth):
 * - Branches are pruned when cumulative probability falls below threshold
 * - This naturally produces deeper trees for likely lines
 */

import { Chess } from 'chessops/chess'
import { makeFen, parseFen } from 'chessops/fen'
import { makeSan, parseSan } from 'chessops/san'
import { parseUci } from 'chessops/util'
import { isNormal } from 'chessops/types'
import type { MaiaAdapter, StockfishAdapter, MaiaEvaluation } from '../engine/types'
import type { TreeNode, EWConfig } from './types'
import { DEFAULT_EW_CONFIG } from './types'
import { getCachedPrediction, cachePrediction } from './predictionCache'

// ============================================================================
// UI RESPONSIVENESS HELPERS
// ============================================================================

/**
 * Yield control back to the browser's event loop.
 *
 * This prevents the UI from freezing during long-running calculations
 * by allowing the browser to process user interactions and render updates.
 *
 * Call this periodically during intensive calculations (e.g., every 3-5
 * Maia predictions) to keep the page responsive.
 */
export const yieldToUI = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0))

/** Counter for tracking predictions between yields */
let predictionCount = 0

/** How often to yield (every N predictions) */
const YIELD_INTERVAL = 3

// ============================================================================
// CACHED MAIA PREDICTION
// ============================================================================

/**
 * Get Maia prediction with caching.
 *
 * Checks the prediction cache first, and only calls Maia if there's a cache miss.
 * This eliminates redundant Maia inferences for positions that are evaluated
 * multiple times (e.g., during candidate selection and again in tree building).
 *
 * @param fen - Position FEN
 * @param maia - Maia adapter
 * @param eloLevel - ELO level for prediction
 * @returns Maia evaluation (from cache or fresh)
 */
async function getCachedMaiaPrediction(
  fen: string,
  maia: MaiaAdapter,
  eloLevel: number
): Promise<MaiaEvaluation> {
  // Check cache first
  const cached = getCachedPrediction(fen)
  if (cached !== undefined) {
    return cached
  }

  // Cache miss - call Maia
  const result = await maia.predict(fen, { eloLevel })

  // Store in cache for future use
  cachePrediction(fen, result)

  return result
}

// ============================================================================
// PHASE 2: BUILD PROBABILITY TREE (MAIA ONLY)
// ============================================================================

/**
 * Build a probability tree using Maia predictions only.
 *
 * PHASE 2 of the algorithm: Fast tree building with neural network.
 *
 * This function builds the tree structure without Stockfish evaluations.
 * SF evaluations are added later via batch processing (Phase 3).
 *
 * Tree termination is purely probability-based:
 * - Explore branches where child's cumulative probability >= threshold
 * - No fixed depth limit - depth emerges from probability decay
 *
 * @param rootFen - FEN of position after the candidate move was played
 * @param config - Algorithm configuration (uses probabilityThreshold, maiaLevel)
 * @param maia - Maia adapter for move predictions
 * @param rootTurn - Whose turn it was at the original position (for perspective normalization)
 * @returns Root node of the probability tree (sfWinrate/sfCp are null until Phase 3)
 *
 * @example
 * // After 1. e4, build tree of Black's likely responses
 * const tree = await buildTree(
 *   'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
 *   config,
 *   maia,
 *   'w'  // White made the candidate move
 * )
 */
export async function buildTree(
  rootFen: string,
  config: Partial<EWConfig>,
  maia: MaiaAdapter,
  rootTurn?: 'w' | 'b'
): Promise<TreeNode> {
  // Merge config with defaults
  const fullConfig: EWConfig = { ...DEFAULT_EW_CONFIG, ...config }

  // Determine root turn from FEN if not provided
  // The rootTurn is the side that made the candidate move (BEFORE this position)
  // So if it's Black's turn in rootFen, White made the candidate move
  const fenTurn = getTurnFromFen(rootFen)
  const actualRootTurn = rootTurn ?? (fenTurn === 'w' ? 'b' : 'w')

  // Reset prediction counter at start of each tree build
  predictionCount = 0

  // Get Maia evaluation for root position (with caching)
  // This gives us move probabilities AND value head evaluation
  const rootMaiaEval = await getCachedMaiaPrediction(
    rootFen,
    maia,
    fullConfig.maiaLevel
  )
  predictionCount++

  // Maia returns value from side-to-move's perspective.
  // Normalize to root player's perspective using the same pattern as SF.
  const rootFenTurn = getTurnFromFen(rootFen)
  const normalizedMaiaValue = rootFenTurn === actualRootTurn
    ? rootMaiaEval.value
    : 1 - rootMaiaEval.value

  // Create the root node (sfWinrate/sfCp are null until Phase 3)
  const root: TreeNode = {
    move: null,
    san: null,
    fen: rootFen,
    probability: 1.0,
    cumulativeProbability: 1.0,
    sfWinrate: null,               // Populated in Phase 3
    sfCp: null,                    // Populated in Phase 3
    maiaWinrate: normalizedMaiaValue,
    depth: 0,
    children: [],
    exploredProbability: 0,
    unexploredMass: 0,             // Calculated after expansion
    isLeaf: true,
  }

  // Recursively build the tree using Maia only
  await expandNodeWithMaia(root, fullConfig, maia, actualRootTurn)

  return root
}

/**
 * Recursively expand a node using Maia predictions.
 *
 * PHASE 2 CORE: Uses Maia neural network only (no Stockfish).
 *
 * Termination is purely probability-based:
 * - Stop when cumulative probability falls below threshold
 * - Explore all moves where child cumProb >= threshold
 *
 * @param node - The node to expand
 * @param config - Algorithm configuration
 * @param maia - Maia adapter for predictions
 * @param rootTurn - Whose turn at root (for perspective normalization)
 */
async function expandNodeWithMaia(
  node: TreeNode,
  config: EWConfig,
  maia: MaiaAdapter,
  rootTurn: 'w' | 'b'
): Promise<void> {
  // Probability-based termination: stop if cumProb is too small
  if (node.cumulativeProbability < config.probabilityThreshold) {
    // This node is a leaf due to low probability
    node.unexploredMass = 0  // No uncovered mass at leaves
    return
  }

  // Get Maia predictions for this position (with caching)
  const predictions = await getCachedMaiaPrediction(
    node.fen,
    maia,
    config.maiaLevel
  )

  // Yield to UI periodically to prevent page freezing
  predictionCount++
  if (predictionCount % YIELD_INTERVAL === 0) {
    await yieldToUI()
  }

  // Find moves where child's cumulative probability would be above threshold
  // This is the key filter: only explore branches that matter
  const significantMoves = Object.entries(predictions.policy)
    .filter(([_, prob]) => {
      const childCumProb = node.cumulativeProbability * prob
      return childCumProb >= config.probabilityThreshold
    })
    .sort(([_, a], [__, b]) => b - a)  // Sort by probability descending

  // No significant moves = leaf node
  if (significantMoves.length === 0) {
    node.unexploredMass = 0  // All probability goes to this leaf
    return
  }

  // Track how much probability mass we're exploring
  let exploredProb = 0

  // Create child nodes for significant moves
  for (const [uciMove, probability] of significantMoves) {
    // Apply the move to get resulting position
    const newFen = applyMove(node.fen, uciMove)
    if (!newFen) {
      // Invalid move - skip (shouldn't happen with Maia, but defensive)
      continue
    }

    // Get SAN notation for display
    const san = uciToSan(node.fen, uciMove)

    // Get Maia evaluation for new position (with caching)
    const childMaiaEval = await getCachedMaiaPrediction(
      newFen,
      maia,
      config.maiaLevel
    )

    // Yield to UI periodically to prevent page freezing
    predictionCount++
    if (predictionCount % YIELD_INTERVAL === 0) {
      await yieldToUI()
    }

    // Maia returns value from side-to-move's perspective.
    // Normalize to root player's perspective using the same pattern as SF.
    const childTurn = getTurnFromFen(newFen)
    const normalizedChildValue = childTurn === rootTurn
      ? childMaiaEval.value
      : 1 - childMaiaEval.value

    // Calculate cumulative probability
    const cumProb = node.cumulativeProbability * probability

    // Create child node (sfWinrate/sfCp null until Phase 3)
    const child: TreeNode = {
      move: uciMove,
      san: san || uciMove,
      fen: newFen,
      probability,
      cumulativeProbability: cumProb,
      sfWinrate: null,               // Populated in Phase 3
      sfCp: null,                    // Populated in Phase 3
      maiaWinrate: normalizedChildValue,
      depth: node.depth + 1,
      children: [],
      exploredProbability: 0,
      unexploredMass: 0,
      isLeaf: true,
    }

    node.children.push(child)
    exploredProb += probability

    // Recursively expand this child
    await expandNodeWithMaia(child, config, maia, rootTurn)
  }

  // Update node state
  node.exploredProbability = exploredProb
  node.isLeaf = node.children.length === 0

  // Calculate unexplored mass at this node
  // This is the probability of moves we didn't explore, weighted by cumProb
  node.unexploredMass = Math.max(0, 1 - exploredProb) * node.cumulativeProbability
}

// ============================================================================
// PHASE 3 HELPERS: BATCH STOCKFISH EVALUATION
// ============================================================================

/**
 * Collect all unique positions that need Stockfish evaluation.
 *
 * PHASE 3 PREPARATION: We need SF evaluations for:
 * 1. All leaf nodes (end of explored branches)
 * 2. All internal nodes with unexploredMass > 0
 *
 * Using a Map ensures we only evaluate each unique FEN once.
 *
 * @param tree - Root of the probability tree
 * @param rootTurn - Root player's color (for perspective normalization)
 * @returns Map of FEN -> current turn at that position
 */
export function collectPositionsForEvaluation(
  tree: TreeNode,
  _rootTurn: 'w' | 'b'
): Map<string, 'w' | 'b'> {
  const positions = new Map<string, 'w' | 'b'>()

  function collectFromNode(node: TreeNode): void {
    // Need evaluation if: leaf OR has unexplored mass
    const needsEval = node.isLeaf || node.unexploredMass > 0

    if (needsEval && !positions.has(node.fen)) {
      positions.set(node.fen, getTurnFromFen(node.fen))
    }

    // Recurse into children
    for (const child of node.children) {
      collectFromNode(child)
    }
  }

  collectFromNode(tree)
  return positions
}

/**
 * Batch evaluate positions with Stockfish.
 *
 * PHASE 3 EXECUTION: Efficiently evaluate all unique positions.
 *
 * @param stockfish - Stockfish adapter
 * @param positions - Map of FEN -> turn from collectPositionsForEvaluation
 * @param config - Configuration (uses stockfishDepth)
 * @returns Map of FEN -> { winrate, cp } (from side-to-move perspective)
 */
export async function batchEvaluateWithStockfish(
  stockfish: StockfishAdapter,
  positions: Map<string, 'w' | 'b'>,
  config: Partial<EWConfig>
): Promise<Map<string, { winrate: number; cp: number }>> {
  const fullConfig: EWConfig = { ...DEFAULT_EW_CONFIG, ...config }
  const results = new Map<string, { winrate: number; cp: number }>()

  for (const [fen] of positions) {
    const sfResult = await stockfish.evaluate(fen, {
      depth: fullConfig.stockfishDepth,
    })
    results.set(fen, {
      winrate: sfResult.winrate,
      cp: sfResult.cp,
    })
  }

  return results
}

/**
 * Populate Stockfish evaluations into the tree.
 *
 * PHASE 3 COMPLETION: Set sfWinrate/sfCp on all nodes that were evaluated.
 * Values are normalized to root player's perspective.
 *
 * @param tree - Root of the probability tree
 * @param sfResults - Map of FEN -> { winrate, cp } from batch evaluation
 * @param rootTurn - Root player's color (for perspective normalization)
 */
export function populateSFEvaluations(
  tree: TreeNode,
  sfResults: Map<string, { winrate: number; cp: number }>,
  rootTurn: 'w' | 'b'
): void {
  function populateNode(node: TreeNode): void {
    const sfResult = sfResults.get(node.fen)

    if (sfResult !== undefined) {
      // Stockfish returns evaluation from side-to-move perspective
      // Normalize to root player's perspective
      const currentTurn = getTurnFromFen(node.fen)
      if (currentTurn === rootTurn) {
        // Same perspective - use as-is
        node.sfWinrate = sfResult.winrate
        node.sfCp = sfResult.cp
      } else {
        // Opposite perspective - invert
        node.sfWinrate = 1 - sfResult.winrate
        node.sfCp = -sfResult.cp
      }
    }

    // Recurse into children
    for (const child of node.children) {
      populateNode(child)
    }
  }

  populateNode(tree)
}

// ============================================================================
// BACKWARD COMPATIBILITY: INLINE SF EVALUATION
// ============================================================================

/**
 * Build a tree with inline Stockfish evaluation (backward compatible).
 *
 * This is the original API that evaluates SF at each node during tree building.
 * Less efficient but simpler to use for testing.
 *
 * @deprecated Use buildTree + batchEvaluateWithStockfish for production
 */
export async function buildTreeWithInlineSF(
  rootFen: string,
  config: Partial<EWConfig>,
  stockfish: StockfishAdapter,
  maia: MaiaAdapter
): Promise<TreeNode> {
  // Build tree with Maia only
  const fenTurn = getTurnFromFen(rootFen)
  const rootTurn = fenTurn === 'w' ? 'b' : 'w'
  const tree = await buildTree(rootFen, config, maia, rootTurn)

  // Collect and batch evaluate
  const positions = collectPositionsForEvaluation(tree, rootTurn)
  const sfResults = await batchEvaluateWithStockfish(stockfish, positions, config)

  // Populate SF values
  populateSFEvaluations(tree, sfResults, rootTurn)

  return tree
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get whose turn it is from a FEN string.
 *
 * @param fen - Position FEN
 * @returns 'w' for white, 'b' for black
 */
export function getTurnFromFen(fen: string): 'w' | 'b' {
  const parts = fen.split(' ')
  return (parts[1] || 'w') as 'w' | 'b'
}

/**
 * Apply a UCI move to a FEN and return the resulting FEN.
 *
 * @param fen - Starting position FEN
 * @param uciMove - Move in UCI format (e.g., "e2e4")
 * @returns Resulting FEN, or null if move is invalid
 */
export function applyMove(fen: string, uciMove: string): string | null {
  try {
    const setupResult = parseFen(fen)
    if (!setupResult.isOk) {
      return null
    }

    const chessResult = Chess.fromSetup(setupResult.value)
    if (!chessResult.isOk) {
      return null
    }

    const chess = chessResult.value
    const move = parseUci(uciMove)

    if (!move) {
      return null
    }

    if (!chess.isLegal(move)) {
      return null
    }

    chess.play(move)
    return makeFen(chess.toSetup())
  } catch {
    return null
  }
}

/**
 * Convert a UCI move to SAN notation.
 *
 * @param fen - Position FEN before the move
 * @param uciMove - Move in UCI format
 * @returns SAN notation (e.g., "e4"), or null if invalid
 */
export function uciToSan(fen: string, uciMove: string): string | null {
  try {
    const setupResult = parseFen(fen)
    if (!setupResult.isOk) {
      return null
    }

    const chessResult = Chess.fromSetup(setupResult.value)
    if (!chessResult.isOk) {
      return null
    }

    const chess = chessResult.value
    const move = parseUci(uciMove)

    if (!move) {
      return null
    }

    if (!chess.isLegal(move)) {
      return null
    }

    return makeSan(chess, move)
  } catch {
    return null
  }
}

/**
 * Convert SAN notation to UCI format.
 *
 * @param fen - Position FEN
 * @param san - Move in SAN format (e.g., "e4")
 * @returns UCI notation (e.g., "e2e4"), or null if invalid
 */
export function sanToUci(fen: string, san: string): string | null {
  try {
    const setupResult = parseFen(fen)
    if (!setupResult.isOk) {
      return null
    }

    const chessResult = Chess.fromSetup(setupResult.value)
    if (!chessResult.isOk) {
      return null
    }

    const chess = chessResult.value
    const move = parseSan(chess, san)

    if (!move) {
      return null
    }

    if (!isNormal(move)) {
      return null
    }

    const from = squareToAlgebraic(move.from)
    const to = squareToAlgebraic(move.to)
    const promo = move.promotion ? roleToChar(move.promotion) : ''

    return from + to + promo
  } catch {
    return null
  }
}

/**
 * Convert a square number (0-63) to algebraic notation (a1-h8).
 */
function squareToAlgebraic(square: number): string {
  const file = square % 8
  const rank = Math.floor(square / 8)
  return String.fromCharCode(97 + file) + (rank + 1).toString()
}

/**
 * Convert a piece role to its character.
 */
function roleToChar(role: string): string {
  switch (role) {
    case 'queen': return 'q'
    case 'rook': return 'r'
    case 'bishop': return 'b'
    case 'knight': return 'n'
    default: return ''
  }
}

// ============================================================================
// TREE TRAVERSAL UTILITIES
// ============================================================================

/**
 * Get all leaf nodes from a tree.
 *
 * @param node - Root of tree to traverse
 * @returns Array of all leaf nodes
 */
export function getLeafNodes(node: TreeNode): TreeNode[] {
  if (node.children.length === 0) {
    return [node]
  }

  return node.children.flatMap(child => getLeafNodes(child))
}

/**
 * Get all nodes at a specific depth.
 *
 * @param node - Root of tree
 * @param targetDepth - Depth to collect (0 = root)
 * @returns Array of nodes at that depth
 */
export function getNodesAtDepth(node: TreeNode, targetDepth: number): TreeNode[] {
  if (node.depth === targetDepth) {
    return [node]
  }

  if (node.depth > targetDepth) {
    return []
  }

  return node.children.flatMap(child => getNodesAtDepth(child, targetDepth))
}

/**
 * Count total nodes in a tree.
 *
 * @param node - Root of tree
 * @returns Total number of nodes
 */
export function countNodes(node: TreeNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0)
}

/**
 * Get maximum depth of a tree.
 *
 * @param node - Root of tree
 * @returns Maximum depth reached
 */
export function getMaxDepth(node: TreeNode): number {
  if (node.children.length === 0) {
    return node.depth
  }

  return Math.max(...node.children.map(child => getMaxDepth(child)))
}
