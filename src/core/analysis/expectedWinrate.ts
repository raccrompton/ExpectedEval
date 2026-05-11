/**
 * Expected Winrate Calculation
 *
 * This module contains the core Expected Winrate algorithm. It combines:
 * - Stockfish evaluations (objective position quality)
 * - Maia predictions (human-like move probabilities)
 *
 * The algorithm calculates what evaluation a position will likely reach
 * if both players make human-like moves (not perfect engine moves).
 *
 * ## The Algorithm (4 Phases from IMPLEMENTATION-STRATEGY.md)
 *
 * 1. FILTER CANDIDATE MOVES (Phase 1)
 *    - Get Stockfish evaluation for all moves
 *    - Keep moves within winrate loss threshold
 *
 * 2. BUILD PROBABILITY TREES (Phase 2)
 *    - For each candidate, explore likely opponent responses using Maia ONLY
 *    - Fast neural network calls (~5ms each)
 *    - Recursively build tree based on cumulative probability threshold
 *    - No fixed depth limit - termination is probability-based
 *
 * 3. BATCH EVALUATE WITH STOCKFISH (Phase 3)
 *    - Collect all unique positions needing evaluation
 *    - Single batch of SF calls (efficient, no duplicates)
 *    - Populate SF values into tree nodes
 *
 * 4. CALCULATE EXPECTED WINRATE (Phase 4)
 *    - Sum leaf contributions: Σ(leaf_winrate × leaf_cumulative_prob)
 *    - Add uncovered mass: Σ(node_winrate × node_uncovered_prob)
 *
 * ## The Formula
 *
 * Expected Winrate = Σ(leaf_winrate × leaf_prob) + Σ(node_winrate × uncovered_mass)
 *
 * Where uncovered_mass at a node = (1 - exploredProbability) × cumulativeProbability
 */

import { Chess } from 'chessops/chess'
import { parseFen } from 'chessops/fen'
import type { StockfishAdapter, MaiaAdapter } from '../engine/types'
import type {
  TreeNode,
  EWConfig,
  EWResult,
  EWCandidateResult,
  OnEWProgress,
  SFRankedMove,
  MaiaPredictedMove,
} from './types'
import { DEFAULT_EW_CONFIG } from './types'
import {
  buildTree,
  applyMove,
  uciToSan,
  getMaxDepth,
  getTurnFromFen,
  collectPositionsForEvaluation,
  batchEvaluateWithStockfish,
  populateSFEvaluations,
  yieldToUI,
} from './treeBuilder'
import { getCachedPrediction, cachePrediction } from './predictionCache'

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate Expected Winrate for a position.
 *
 * This is the main entry point for the EW algorithm. It implements
 * all 4 phases from IMPLEMENTATION-STRATEGY.md:
 *
 * 1. Find candidate moves worth analyzing
 * 2. Build probability trees using Maia (fast)
 * 3. Batch evaluate with Stockfish (efficient)
 * 4. Compute weighted average winrates
 *
 * @param fen - Position to analyze
 * @param config - Algorithm configuration
 * @param stockfish - Stockfish adapter for evaluations
 * @param maia - Maia adapter for move predictions
 * @param onProgress - Optional progress callback
 * @returns Complete EW results with all candidates
 *
 * @example
 * const result = await calculateExpectedWinrate(
 *   'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
 *   { probabilityThreshold: 0.01 },
 *   stockfish,
 *   maia
 * )
 * console.log(result.candidates[0].expectedWinrateSF)
 */
export async function calculateExpectedWinrate(
  fen: string,
  config: Partial<EWConfig>,
  stockfish: StockfishAdapter,
  maia: MaiaAdapter,
  onProgress?: OnEWProgress
): Promise<EWResult> {
  const startTime = Date.now()

  // Merge config with defaults
  const fullConfig: EWConfig = { ...DEFAULT_EW_CONFIG, ...config }

  // Determine whose turn it is (for perspective normalization)
  const rootTurn = getTurnFromFen(fen)

  // =========================================================================
  // PHASE 1: FILTER CANDIDATE MOVES
  // =========================================================================

  onProgress?.({
    phase: 'filtering',
    progress: 0,
    message: 'Analyzing position...',
  })

  const candidates = await filterCandidateMoves(fen, fullConfig, stockfish, maia)

  onProgress?.({
    phase: 'filtering',
    progress: 100,
    message: `Found ${candidates.length} candidate moves`,
    candidateCount: candidates.length,
  })

  // =========================================================================
  // PHASE 2: BUILD PROBABILITY TREES (MAIA ONLY)
  // =========================================================================

  // Build trees for each candidate using Maia only (fast)
  const treesWithCandidates: Array<{
    candidate: typeof candidates[0]
    tree: TreeNode
    afterMoveFen: string
  }> = []

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]

    onProgress?.({
      phase: 'building_trees',
      progress: Math.round((i / candidates.length) * 100),
      message: `Building tree for ${candidate.san}...`,
      candidateCount: candidates.length,
      currentCandidate: candidate.san,
    })

    // Apply the candidate move to get resulting position
    const afterMoveFen = applyMove(fen, candidate.move)
    if (!afterMoveFen) {
      continue
    }

    // Build probability tree using Maia only (Phase 2)
    // sfWinrate/sfCp will be null until Phase 3
    const tree = await buildTree(afterMoveFen, fullConfig, maia, rootTurn)

    treesWithCandidates.push({
      candidate,
      tree,
      afterMoveFen,
    })
  }

  // =========================================================================
  // PHASE 3: BATCH EVALUATE WITH STOCKFISH
  // =========================================================================

  onProgress?.({
    phase: 'evaluating',
    progress: 0,
    message: 'Collecting positions for evaluation...',
    candidateCount: treesWithCandidates.length,
  })

  // Collect all unique positions from all trees
  const allPositions = new Map<string, 'w' | 'b'>()

  for (const { tree } of treesWithCandidates) {
    const treePositions = collectPositionsForEvaluation(tree, rootTurn)
    for (const [fen, turn] of treePositions) {
      if (!allPositions.has(fen)) {
        allPositions.set(fen, turn)
      }
    }
  }

  onProgress?.({
    phase: 'evaluating',
    progress: 10,
    message: `Evaluating ${allPositions.size} unique positions...`,
    candidateCount: treesWithCandidates.length,
    positionsToEvaluate: allPositions.size,
  })

  // Batch evaluate all unique positions
  const sfResults = await batchEvaluateWithStockfish(stockfish, allPositions, fullConfig)

  // Populate SF values into all trees
  for (const { tree } of treesWithCandidates) {
    populateSFEvaluations(tree, sfResults, rootTurn)
  }

  onProgress?.({
    phase: 'evaluating',
    progress: 100,
    message: 'Evaluation complete',
    candidateCount: treesWithCandidates.length,
    positionsToEvaluate: allPositions.size,
  })

  // =========================================================================
  // PHASE 4: CALCULATE EXPECTED WINRATE
  // =========================================================================

  onProgress?.({
    phase: 'computing',
    progress: 0,
    message: 'Computing Expected Winrate values...',
    candidateCount: treesWithCandidates.length,
  })

  const results: EWCandidateResult[] = []

  for (const { candidate, tree } of treesWithCandidates) {
    // Calculate BOTH Expected Winrates from the tree
    // - ewSF: Uses Stockfish evaluations at leaves (objectively accurate)
    // - ewMaia: Uses Maia evaluations at leaves (human-perceived)
    const { ewSF, ewMaia } = computeExpectedWinrateFromTree(tree)

    // Count unique positions evaluated for this tree
    const treePositions = collectPositionsForEvaluation(tree, rootTurn)

    results.push({
      move: candidate.move,
      san: candidate.san,
      probability: candidate.probability,
      stockfishWinrate: candidate.sfWinrate,
      stockfishCp: candidate.sfCp,
      maiaWinrate: candidate.maiaWinrate,
      expectedWinrateSF: ewSF,
      expectedWinrateMaia: ewMaia,
      tree,
      maxDepthReached: getMaxDepth(tree),
      uniquePositionsEvaluated: treePositions.size,
    })
  }

  // Sort by EW-SF (best first) - using objective SF for primary ranking
  results.sort((a, b) => (b.expectedWinrateSF ?? 0) - (a.expectedWinrateSF ?? 0))

  onProgress?.({
    phase: 'computing',
    progress: 100,
    message: 'Analysis complete',
    candidateCount: results.length,
  })

  // Get base position evaluations from both engines
  const baseSFEval = await stockfish.evaluate(fen, { depth: fullConfig.stockfishDepth })
  const baseMaiaEval = await maia.predict(fen, { eloLevel: fullConfig.maiaLevel })

  // =========================================================================
  // BUILD TOP MOVES FOR UI DISPLAY PANELS
  // =========================================================================

  // Build sfTopMoves from SF evaluation (sorted by winrate, best first)
  // If moveWinrates is available (MultiPV mode), use it; otherwise use candidates
  const sfTopMoves: SFRankedMove[] = []

  if (baseSFEval.moveWinrates && baseSFEval.moveEvaluations) {
    // MultiPV data available - build from raw SF results
    const sortedMoves = Object.entries(baseSFEval.moveWinrates)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    for (const [move, winrate] of sortedMoves) {
      const san = uciToSan(fen, move)
      if (san) {
        sfTopMoves.push({
          move,
          san,
          winrate,
          cp: baseSFEval.moveEvaluations[move] ?? 0,
        })
      }
    }
  } else {
    // Fall back to candidates (sorted by SF winrate)
    const sortedCandidates = [...results].sort(
      (a, b) => (b.stockfishWinrate ?? 0) - (a.stockfishWinrate ?? 0)
    )
    for (const c of sortedCandidates.slice(0, 5)) {
      if (c.stockfishWinrate !== null && c.stockfishCp !== null) {
        sfTopMoves.push({
          move: c.move,
          san: c.san,
          winrate: c.stockfishWinrate,
          cp: c.stockfishCp,
        })
      }
    }
  }

  // Build maiaTopMoves from Maia policy (sorted by probability, most likely first)
  const maiaTopMoves: MaiaPredictedMove[] = Object.entries(baseMaiaEval.policy)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([move, probability]) => {
      const san = uciToSan(fen, move)
      return {
        move,
        san: san || move,  // Fall back to UCI if SAN fails
        probability,
      }
    })

  return {
    fen,
    baseSFWinrate: baseSFEval.winrate,
    baseSFCp: baseSFEval.cp,
    baseMaiaWinrate: baseMaiaEval.value,
    sfTopMoves,
    maiaTopMoves,
    candidates: results,
    calculationTimeMs: Date.now() - startTime,
    config: fullConfig,
  }
}

// ============================================================================
// MAIA-ONLY CALCULATION (Fast Path)
// ============================================================================

/**
 * Calculate Expected Winrate using Maia only (no Stockfish).
 *
 * This is the fast path for auto-triggered calculations. It:
 * 1. Selects ALL legal moves as candidates (ignores maxCandidates config)
 * 2. Builds probability trees for each move using Maia
 * 3. Computes EW(Maia) only
 *
 * NOTE: Unlike calculateExpectedWinrate(), this function returns ALL legal
 * moves as candidates regardless of the maxCandidates config value. This
 * provides complete analysis coverage at the cost of more computation.
 *
 * SF fields (stockfishWinrate, stockfishCp, expectedWinrateSF, baseSFWinrate, etc.)
 * are all null until enrichWithStockfish() is called.
 *
 * @param fen - Position to analyze
 * @param config - Algorithm configuration (maxCandidates is ignored)
 * @param maia - Maia adapter for move predictions
 * @param onProgress - Optional progress callback
 * @returns EW result with Maia values only (SF fields are null)
 */
export async function calculateMaiaOnlyEW(
  fen: string,
  config: Partial<EWConfig>,
  maia: MaiaAdapter,
  onProgress?: OnEWProgress
): Promise<EWResult> {
  const startTime = Date.now()

  // Merge config with defaults
  const fullConfig: EWConfig = { ...DEFAULT_EW_CONFIG, ...config }

  // Determine whose turn it is (for perspective normalization)
  const rootTurn = getTurnFromFen(fen)

  // =========================================================================
  // PHASE 1B: SELECT CANDIDATES BY MAIA PROBABILITY
  // =========================================================================

  onProgress?.({
    phase: 'selecting',
    progress: 0,
    message: 'Selecting candidate moves...',
  })

  const candidates = await selectCandidatesByMaiaProbability(fen, fullConfig, maia)

  onProgress?.({
    phase: 'selecting',
    progress: 100,
    message: `Found ${candidates.length} candidate moves`,
    candidateCount: candidates.length,
  })

  // =========================================================================
  // PHASE 2: BUILD PROBABILITY TREES (MAIA ONLY)
  // =========================================================================

  const treesWithCandidates: Array<{
    candidate: typeof candidates[0]
    tree: TreeNode
  }> = []

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]

    onProgress?.({
      phase: 'building_trees',
      progress: Math.round((i / candidates.length) * 100),
      message: `Building tree for ${candidate.san}...`,
      candidateCount: candidates.length,
      currentCandidate: candidate.san,
    })

    // Apply the candidate move to get resulting position
    const afterMoveFen = applyMove(fen, candidate.move)
    if (!afterMoveFen) continue

    // Build probability tree using Maia only (Phase 2)
    const tree = await buildTree(afterMoveFen, fullConfig, maia, rootTurn)

    treesWithCandidates.push({ candidate, tree })
  }

  // =========================================================================
  // PHASE 4B: CALCULATE EXPECTED WINRATE (MAIA ONLY)
  // =========================================================================

  onProgress?.({
    phase: 'computing',
    progress: 0,
    message: 'Computing Expected Winrate values...',
    candidateCount: treesWithCandidates.length,
  })

  const results: EWCandidateResult[] = []

  for (const { candidate, tree } of treesWithCandidates) {
    // Calculate EW using Maia values only (SF will be null)
    const { ewMaia } = computeExpectedWinrateFromTree(tree)

    // Count unique positions for this tree
    const treePositions = collectPositionsForEvaluation(tree, rootTurn)

    results.push({
      move: candidate.move,
      san: candidate.san,
      probability: candidate.probability,
      stockfishWinrate: null,       // Not computed in Maia-only mode
      stockfishCp: null,            // Not computed in Maia-only mode
      maiaWinrate: candidate.maiaWinrate,
      expectedWinrateSF: null,      // Not computed in Maia-only mode
      expectedWinrateMaia: ewMaia,
      tree,
      maxDepthReached: getMaxDepth(tree),
      uniquePositionsEvaluated: treePositions.size,
    })
  }

  // Sort by EW-Maia (best first) since we don't have SF values
  results.sort((a, b) => b.expectedWinrateMaia - a.expectedWinrateMaia)

  onProgress?.({
    phase: 'computing',
    progress: 100,
    message: 'Analysis complete',
    candidateCount: results.length,
  })

  // Get Maia baseline evaluation
  const baseMaiaEval = await maia.predict(fen, { eloLevel: fullConfig.maiaLevel })

  // Build maiaTopMoves from Maia policy
  const maiaTopMoves: MaiaPredictedMove[] = Object.entries(baseMaiaEval.policy)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([move, probability]) => {
      const san = uciToSan(fen, move)
      return { move, san: san || move, probability }
    })

  return {
    fen,
    baseSFWinrate: null,      // Not computed in Maia-only mode
    baseSFCp: null,           // Not computed in Maia-only mode
    baseMaiaWinrate: baseMaiaEval.value,
    sfTopMoves: [],           // Empty until SF enrichment
    maiaTopMoves,
    candidates: results,
    calculationTimeMs: Date.now() - startTime,
    config: fullConfig,
  }
}

/**
 * Select candidate moves by Maia probability (no Stockfish filtering).
 *
 * This is the fast path for Maia-only mode:
 * - Gets Maia predictions for all moves
 * - Selects top N by probability
 * - Gets Maia value head evaluation for each move
 *
 * @param fen - Position to analyze
 * @param config - Algorithm configuration
 * @param maia - Maia adapter
 * @returns Array of candidate moves with Maia evaluations only
 */
async function selectCandidatesByMaiaProbability(
  fen: string,
  config: EWConfig,
  maia: MaiaAdapter
): Promise<Array<{
  move: string
  san: string
  maiaWinrate: number
  probability: number
}>> {
  // Get Maia move probabilities (with caching)
  let maiaPredictions = getCachedPrediction(fen)
  if (maiaPredictions === undefined) {
    maiaPredictions = await maia.predict(fen, { eloLevel: config.maiaLevel })
    cachePrediction(fen, maiaPredictions)
  }

  // Get legal moves from the position
  const legalMoves = getLegalMoves(fen)

  // Build candidates with probabilities
  const candidates: Array<{
    move: string
    san: string
    maiaWinrate: number
    probability: number
  }> = []

  for (let i = 0; i < legalMoves.length; i++) {
    const move = legalMoves[i]
    const probability = maiaPredictions.policy[move.uci] || 0

    // Apply the move to get Maia value evaluation
    const afterMoveFen = applyMove(fen, move.uci)
    if (!afterMoveFen) continue

    // Get Maia evaluation for position after move (with caching)
    // This cache hit is KEY - the same position is used as tree root later
    let maiaEval = getCachedPrediction(afterMoveFen)
    if (maiaEval === undefined) {
      maiaEval = await maia.predict(afterMoveFen, { eloLevel: config.maiaLevel })
      cachePrediction(afterMoveFen, maiaEval)
    }

    candidates.push({
      move: move.uci,
      san: move.san,
      maiaWinrate: 1 - maiaEval.value,  // Invert for side that made the move
      probability,
    })

    // Yield to UI periodically to prevent page freezing
    if (i % 5 === 4) {
      await yieldToUI()
    }
  }

  // Sort by probability (most likely first)
  // NOTE: No maxCandidates limit - Maia-only mode builds trees for ALL legal moves
  candidates.sort((a, b) => b.probability - a.probability)

  return candidates
}

// ============================================================================
// STOCKFISH ENRICHMENT
// ============================================================================

/**
 * Enrich a Maia-only EW result with Stockfish evaluations.
 *
 * Takes an existing result from calculateMaiaOnlyEW() and adds:
 * - SF evaluations at all tree nodes
 * - SF baseline evaluation of the position
 * - SF top moves ranking
 * - expectedWinrateSF for each candidate
 *
 * This is the slow path, triggered by user clicking "Add SF Analysis".
 *
 * @param result - Existing Maia-only EW result
 * @param stockfish - Stockfish adapter
 * @param config - Algorithm configuration (optional, uses result.config if not provided)
 * @param onProgress - Optional progress callback
 * @returns Complete EW result with SF values populated
 */
export async function enrichWithStockfish(
  result: EWResult,
  stockfish: StockfishAdapter,
  config?: Partial<EWConfig>,
  onProgress?: OnEWProgress
): Promise<EWResult> {
  const startTime = Date.now()
  const fullConfig = { ...result.config, ...config }
  const rootTurn = getTurnFromFen(result.fen)

  // =========================================================================
  // PHASE 3: BATCH EVALUATE WITH STOCKFISH
  // =========================================================================

  onProgress?.({
    phase: 'enriching_sf',
    progress: 0,
    message: 'Collecting positions for evaluation...',
    candidateCount: result.candidates.length,
  })

  // Collect all unique positions from all candidate trees
  const allPositions = new Map<string, 'w' | 'b'>()

  for (const candidate of result.candidates) {
    const treePositions = collectPositionsForEvaluation(candidate.tree, rootTurn)
    for (const [fen, turn] of treePositions) {
      if (!allPositions.has(fen)) {
        allPositions.set(fen, turn)
      }
    }
  }

  // Add candidate move positions for direct SF evaluation
  for (const candidate of result.candidates) {
    const afterMoveFen = applyMove(result.fen, candidate.move)
    if (afterMoveFen && !allPositions.has(afterMoveFen)) {
      // The turn after making the move
      const afterTurn = rootTurn === 'w' ? 'b' : 'w'
      allPositions.set(afterMoveFen, afterTurn)
    }
  }

  onProgress?.({
    phase: 'enriching_sf',
    progress: 10,
    message: `Evaluating ${allPositions.size} unique positions...`,
    candidateCount: result.candidates.length,
    positionsToEvaluate: allPositions.size,
  })

  // Batch evaluate all unique positions
  const sfResults = await batchEvaluateWithStockfish(stockfish, allPositions, fullConfig)

  onProgress?.({
    phase: 'enriching_sf',
    progress: 70,
    message: 'Populating SF evaluations...',
    candidateCount: result.candidates.length,
    positionsToEvaluate: allPositions.size,
  })

  // Populate SF values into all trees and compute SF-based metrics
  const enrichedCandidates: EWCandidateResult[] = []

  for (const candidate of result.candidates) {
    // Populate SF evaluations into tree
    populateSFEvaluations(candidate.tree, sfResults, rootTurn)

    // Compute EW(SF) now that we have SF values
    const { ewSF } = computeExpectedWinrateFromTree(candidate.tree)

    // Get direct SF evaluation for this candidate move
    const afterMoveFen = applyMove(result.fen, candidate.move)
    const sfEval = afterMoveFen ? sfResults.get(afterMoveFen) : null

    // SF values need perspective normalization (opponent's view → our view).
    // winrate is side-to-move-perspective so always flip; cp is
    // White-perspective so only flip when the mover (root turn) is Black.
    const stockfishWinrate = sfEval ? 1 - sfEval.winrate : null
    const stockfishCp = sfEval
      ? (rootTurn === 'b' ? -sfEval.cp : sfEval.cp)
      : null

    enrichedCandidates.push({
      ...candidate,
      stockfishWinrate,
      stockfishCp,
      expectedWinrateSF: ewSF,
    })
  }

  // Re-sort by EW-SF now that we have it
  enrichedCandidates.sort((a, b) => (b.expectedWinrateSF ?? 0) - (a.expectedWinrateSF ?? 0))

  onProgress?.({
    phase: 'enriching_sf',
    progress: 90,
    message: 'Getting baseline evaluations...',
    candidateCount: enrichedCandidates.length,
  })

  // Get SF baseline evaluation for the position
  const baseSFEval = await stockfish.evaluate(result.fen, { depth: fullConfig.stockfishDepth })

  // Build sfTopMoves from SF evaluation
  const sfTopMoves: SFRankedMove[] = []

  if (baseSFEval.moveWinrates && baseSFEval.moveEvaluations) {
    const sortedMoves = Object.entries(baseSFEval.moveWinrates)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    for (const [move, winrate] of sortedMoves) {
      const san = uciToSan(result.fen, move)
      if (san) {
        sfTopMoves.push({
          move,
          san,
          winrate,
          cp: baseSFEval.moveEvaluations[move] ?? 0,
        })
      }
    }
  } else {
    // Fall back to candidates sorted by SF winrate
    const sortedCandidates = [...enrichedCandidates]
      .filter(c => c.stockfishWinrate !== null)
      .sort((a, b) => (b.stockfishWinrate ?? 0) - (a.stockfishWinrate ?? 0))
    for (const c of sortedCandidates.slice(0, 5)) {
      if (c.stockfishWinrate !== null && c.stockfishCp !== null) {
        sfTopMoves.push({
          move: c.move,
          san: c.san,
          winrate: c.stockfishWinrate,
          cp: c.stockfishCp,
        })
      }
    }
  }

  onProgress?.({
    phase: 'enriching_sf',
    progress: 100,
    message: 'SF enrichment complete',
    candidateCount: enrichedCandidates.length,
  })

  return {
    ...result,
    baseSFWinrate: baseSFEval.winrate,
    baseSFCp: baseSFEval.cp,
    sfTopMoves,
    candidates: enrichedCandidates,
    calculationTimeMs: result.calculationTimeMs + (Date.now() - startTime),
  }
}

// ============================================================================
// PHASE 1: FILTER CANDIDATE MOVES
// ============================================================================

/**
 * Filter candidate moves worth analyzing.
 *
 * Uses both Stockfish (for quality) and Maia (for likelihood) to find
 * moves that are:
 * 1. Not too bad objectively (within winrate loss threshold)
 * 2. Likely to be played by humans (above probability threshold)
 *
 * Returns both SF and Maia evaluations for each candidate.
 *
 * @param fen - Position to analyze
 * @param config - Algorithm configuration
 * @param stockfish - Stockfish adapter
 * @param maia - Maia adapter
 * @returns Array of candidate moves with both SF and Maia evaluations
 */
async function filterCandidateMoves(
  fen: string,
  config: EWConfig,
  stockfish: StockfishAdapter,
  maia: MaiaAdapter
): Promise<Array<{
  move: string
  san: string
  sfWinrate: number
  sfCp: number
  maiaWinrate: number
  probability: number
}>> {
  // Root turn determines whether sfCp (White-perspective) needs to be flipped
  // when we re-express it from the candidate-mover's perspective.
  const rootTurn = getTurnFromFen(fen)

  // Get Maia move probabilities
  const maiaPredictions = await maia.predict(fen, { eloLevel: config.maiaLevel })

  // Get legal moves from the position
  const legalMoves = getLegalMoves(fen)

  // Evaluate each move with both Stockfish and Maia
  const evaluatedMoves: Array<{
    move: string
    san: string
    sfWinrate: number
    sfCp: number
    maiaWinrate: number
    probability: number
  }> = []

  for (const move of legalMoves) {
    // Apply the move
    const afterMoveFen = applyMove(fen, move.uci)
    if (!afterMoveFen) continue

    // Get Stockfish evaluation
    const sfEval = await stockfish.evaluate(afterMoveFen, {
      depth: config.stockfishDepth,
    })

    // Get Maia evaluation (value head) for the resulting position
    const maiaEval = await maia.predict(afterMoveFen, {
      eloLevel: config.maiaLevel,
    })

    // Get Maia probability for this move (from the base position)
    const probability = maiaPredictions.policy[move.uci] || 0

    // Store both evaluations
    // Note: We need to invert the winrate since it's from opponent's perspective after the move.
    // sfEval.cp is White-perspective (per StockfishEvaluation contract); from the
    // candidate-mover's perspective, only flip when the mover is Black.
    evaluatedMoves.push({
      move: move.uci,
      san: move.san,
      sfWinrate: 1 - sfEval.winrate,    // Invert for side that made the move
      sfCp: rootTurn === 'b' ? -sfEval.cp : sfEval.cp,
      maiaWinrate: 1 - maiaEval.value,   // Invert for side that made the move
      probability,
    })
  }

  // Find the best move's evaluation (using SF for filtering)
  const bestEval = Math.max(...evaluatedMoves.map(m => m.sfWinrate))

  // Filter candidates: all moves within winrate loss threshold of best
  const candidates = evaluatedMoves.filter(m =>
    bestEval - m.sfWinrate <= config.winrateLossThreshold
  )

  // Sort by SF evaluation (best first) and limit to maxCandidates
  candidates.sort((a, b) => b.sfWinrate - a.sfWinrate)

  return candidates.slice(0, config.maxCandidates)
}

/**
 * Get all legal moves in a position.
 *
 * @param fen - Position FEN
 * @returns Array of moves with UCI and SAN notation
 */
function getLegalMoves(fen: string): Array<{ uci: string; san: string }> {
  try {
    const setupResult = parseFen(fen)
    if (!setupResult.isOk) return []

    const chessResult = Chess.fromSetup(setupResult.value)
    if (!chessResult.isOk) return []

    const chess = chessResult.value
    const moves: Array<{ uci: string; san: string }> = []

    // chessops provides legal moves through the position
    for (const [from, dests] of chess.allDests()) {
      for (const to of dests) {
        // Build UCI notation
        const fromStr = squareToAlgebraic(from)
        const toStr = squareToAlgebraic(to)

        // Check for promotion
        const isPromotion = chess.board.get(from)?.role === 'pawn' &&
          (to >= 56 || to <= 7) // 8th or 1st rank

        if (isPromotion) {
          // Add all promotion options
          for (const promo of ['q', 'r', 'b', 'n']) {
            const uci = fromStr + toStr + promo
            const san = uciToSan(fen, uci)
            if (san) moves.push({ uci, san })
          }
        } else {
          const uci = fromStr + toStr
          const san = uciToSan(fen, uci)
          if (san) moves.push({ uci, san })
        }
      }
    }

    return moves
  } catch {
    return []
  }
}

/**
 * Convert a square number to algebraic notation.
 */
function squareToAlgebraic(square: number): string {
  const file = square % 8
  const rank = Math.floor(square / 8)
  return String.fromCharCode(97 + file) + (rank + 1).toString()
}

// ============================================================================
// PHASE 4: COMPUTE EXPECTED WINRATE
// ============================================================================

/**
 * Result of computing Expected Winrate from a tree.
 *
 * Contains both SF-based and Maia-based EW values.
 */
interface EWFromTreeResult {
  /** Expected Winrate using Stockfish evaluations at leaves */
  ewSF: number
  /** Expected Winrate using Maia evaluations at leaves */
  ewMaia: number
}

/**
 * Compute Expected Winrate from a probability tree.
 *
 * The formula accounts for both explored leaves and unexplored mass:
 *
 * EW = Σ(leaf_eval × leaf_cumulative_prob) + Σ(node_eval × uncovered_mass)
 *
 * The "uncovered mass" at each node represents the probability of
 * the opponent playing a move we didn't explore. We use the pre-calculated
 * unexploredMass field from Phase 2 tree building.
 *
 * Returns BOTH SF-based and Maia-based Expected Winrates:
 * - ewSF: Uses Stockfish evaluations - more "objectively accurate"
 * - ewMaia: Uses Maia evaluations - more "human-like perception"
 *
 * NOTE: If sfWinrate is null (Phase 3 not run), falls back to maiaWinrate.
 *
 * @param tree - Root of the probability tree
 * @returns Object with both ewSF and ewMaia (each 0.0 to 1.0)
 */
export function computeExpectedWinrateFromTree(tree: TreeNode): EWFromTreeResult {
  /**
   * Recursive helper to compute weighted evaluation sums.
   *
   * Returns weighted sums for both SF and Maia evaluations.
   */
  function computeNode(node: TreeNode): {
    sfLeafSum: number
    sfUncoveredSum: number
    maiaLeafSum: number
    maiaUncoveredSum: number
  } {
    // Get effective SF value (fall back to Maia if SF not populated)
    const effectiveSF = node.sfWinrate ?? node.maiaWinrate

    // If this is a leaf node, contribute its evaluation
    if (node.children.length === 0) {
      return {
        sfLeafSum: effectiveSF * node.cumulativeProbability,
        sfUncoveredSum: 0,
        maiaLeafSum: node.maiaWinrate * node.cumulativeProbability,
        maiaUncoveredSum: 0,
      }
    }

    // Not a leaf - recurse into children
    let sfLeafSum = 0
    let sfUncoveredSum = 0
    let maiaLeafSum = 0
    let maiaUncoveredSum = 0

    for (const child of node.children) {
      const childResult = computeNode(child)
      sfLeafSum += childResult.sfLeafSum
      sfUncoveredSum += childResult.sfUncoveredSum
      maiaLeafSum += childResult.maiaLeafSum
      maiaUncoveredSum += childResult.maiaUncoveredSum
    }

    // Add uncovered mass contribution at this node
    // Use pre-calculated unexploredMass from Phase 2
    const uncoveredMass = node.unexploredMass

    // The uncovered positions are assumed to have this node's evaluation
    sfUncoveredSum += effectiveSF * uncoveredMass
    maiaUncoveredSum += node.maiaWinrate * uncoveredMass

    return { sfLeafSum, sfUncoveredSum, maiaLeafSum, maiaUncoveredSum }
  }

  const result = computeNode(tree)

  // Compute totals and clamp to valid range
  const ewSF = Math.max(0, Math.min(1, result.sfLeafSum + result.sfUncoveredSum))
  const ewMaia = Math.max(0, Math.min(1, result.maiaLeafSum + result.maiaUncoveredSum))

  return { ewSF, ewMaia }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a human-readable summary of EW results.
 *
 * Shows all 4 evaluation methods:
 * 1. SF Baseline - Direct Stockfish evaluation
 * 2. Maia Baseline - Direct Maia value evaluation
 * 3. EW (SF) - Expected Winrate using SF at leaves
 * 4. EW (Maia) - Expected Winrate using Maia at leaves
 *
 * @param result - EW calculation result
 * @returns Summary string
 */
export function summarizeEWResult(result: EWResult): string {
  const lines: string[] = []

  lines.push(`Expected Winrate Analysis`)
  lines.push(``)
  lines.push(`=== Baseline Evaluations ===`)
  if (result.baseSFCp !== null && result.baseSFWinrate !== null) {
    lines.push(`  Stockfish: ${result.baseSFCp >= 0 ? '+' : ''}${result.baseSFCp} cp (${(result.baseSFWinrate * 100).toFixed(1)}%)`)
  } else {
    lines.push(`  Stockfish: (not computed)`)
  }
  lines.push(`  Maia:      ${(result.baseMaiaWinrate * 100).toFixed(1)}%`)
  lines.push(``)

  // SF Top Moves
  lines.push(`=== Stockfish Top Moves ===`)
  if (result.sfTopMoves.length > 0) {
    const sfMoveStrs = result.sfTopMoves.map(m =>
      `${m.san} (${m.cp >= 0 ? '+' : ''}${m.cp})`
    )
    lines.push(`  Best: ${sfMoveStrs.join(', ')}`)
  } else {
    lines.push(`  (not computed)`)
  }
  lines.push(``)

  // Maia Predicted Moves
  lines.push(`=== Maia Predictions ===`)
  const maiaMoveStrs = result.maiaTopMoves.map(m =>
    `${m.san} (${(m.probability * 100).toFixed(0)}%)`
  )
  lines.push(`  Predicted: ${maiaMoveStrs.join(', ')}`)
  lines.push(``)

  lines.push(`=== Expected Winrate Results ===`)
  const hasSF = result.candidates.some(c => c.expectedWinrateSF !== null)
  lines.push(`Top moves (sorted by ${hasSF ? 'EW-SF' : 'EW-Maia'}):`)

  for (let i = 0; i < Math.min(5, result.candidates.length); i++) {
    const c = result.candidates[i]
    const ewSFStr = c.expectedWinrateSF !== null
      ? `EW(SF)=${(c.expectedWinrateSF * 100).toFixed(1)}%`
      : 'EW(SF)=—'
    const sfStr = c.stockfishWinrate !== null
      ? `SF=${(c.stockfishWinrate * 100).toFixed(1)}%`
      : 'SF=—'
    lines.push(
      `  ${i + 1}. ${c.san}:` +
      ` ${ewSFStr}` +
      ` EW(Maia)=${(c.expectedWinrateMaia * 100).toFixed(1)}%` +
      ` (${sfStr},` +
      ` Maia=${(c.maiaWinrate * 100).toFixed(1)}%,` +
      ` prob=${(c.probability * 100).toFixed(0)}%)`
    )
  }

  lines.push(``)
  lines.push(`Calculation time: ${result.calculationTimeMs}ms`)

  return lines.join('\n')
}

/**
 * Compare EW results with pure Stockfish evaluation.
 *
 * Returns best moves according to each evaluation method:
 * - sfBest: Best by direct Stockfish evaluation
 * - ewSFBest: Best by EW using SF at leaves
 * - ewMaiaBest: Best by EW using Maia at leaves
 * - probBest: Most likely human move (highest Maia probability)
 *
 * @param result - EW calculation result
 * @returns Comparison data for all evaluation methods
 */
export function compareWithStockfish(result: EWResult): {
  sfBestMove: string | null
  ewSFBestMove: string | null
  ewMaiaBestMove: string
  probBestMove: string
  sfAgreeEWSF: boolean
  sfAgreeEWMaia: boolean
  ewSFAgreeEWMaia: boolean
} {
  // Check if we have SF data
  const hasSF = result.candidates.some(c => c.stockfishWinrate !== null)

  // EW-SF best move (already sorted by EW-SF or EW-Maia)
  const ewSFBest = hasSF
    ? [...result.candidates].sort(
        (a, b) => (b.expectedWinrateSF ?? 0) - (a.expectedWinrateSF ?? 0)
      )[0]
    : null

  // SF best move (sort by Stockfish evaluation)
  const sfBest = hasSF
    ? [...result.candidates].sort(
        (a, b) => (b.stockfishWinrate ?? 0) - (a.stockfishWinrate ?? 0)
      )[0]
    : null

  // EW-Maia best move (sort by EW using Maia at leaves)
  const ewMaiaBest = [...result.candidates].sort(
    (a, b) => b.expectedWinrateMaia - a.expectedWinrateMaia
  )[0]

  // Most probable human move (sort by Maia probability)
  const probBest = [...result.candidates].sort(
    (a, b) => b.probability - a.probability
  )[0]

  return {
    sfBestMove: sfBest?.san ?? null,
    ewSFBestMove: ewSFBest?.san ?? null,
    ewMaiaBestMove: ewMaiaBest.san,
    probBestMove: probBest.san,
    sfAgreeEWSF: sfBest !== null && ewSFBest !== null && sfBest.move === ewSFBest.move,
    sfAgreeEWMaia: sfBest !== null && sfBest.move === ewMaiaBest.move,
    ewSFAgreeEWMaia: ewSFBest !== null && ewSFBest.move === ewMaiaBest.move,
  }
}
