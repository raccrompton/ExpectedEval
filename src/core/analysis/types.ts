/**
 * Expected Winrate Analysis Types
 *
 * This file defines the types and interfaces for the Expected Winrate
 * calculation algorithm. The algorithm combines Stockfish evaluations
 * with Maia human-like move predictions to calculate realistic winning
 * chances.
 *
 * Architecture follows the phase-separated design from IMPLEMENTATION-STRATEGY.md:
 * - Phase 1: Filter candidate moves (SF + Maia)
 * - Phase 2: Build probability trees (Maia only - fast)
 * - Phase 3: Batch evaluate with Stockfish (efficient)
 * - Phase 4: Calculate Expected Winrate
 *
 * Key concepts:
 * - TreeNode: A node in the probability tree we explore
 * - EWResult: The final result of calculating Expected Winrate
 * - EWConfig: Configuration parameters for the algorithm
 */

// ============================================================================
// TREE NODE TYPES
// ============================================================================

/**
 * A node in the Expected Winrate exploration tree.
 *
 * The algorithm builds a tree of likely positions by:
 * 1. Starting from a position after a candidate move
 * 2. Using Maia to predict opponent responses (Phase 2)
 * 3. Recursively exploring until cumulative probability falls below threshold
 * 4. Batch evaluating with Stockfish (Phase 3)
 *
 * Each node stores:
 * - The move that led to this position
 * - The cumulative probability of reaching this node
 * - Maia evaluation (populated during tree build)
 * - Stockfish evaluation (populated during batch evaluation, may be null)
 * - Child nodes (opponent responses)
 */
export interface TreeNode {
  /**
   * The move that led to this position (UCI format, e.g., "e2e4").
   * Null for the root node.
   */
  move: string | null

  /**
   * The move in SAN notation for display (e.g., "e4").
   * Null for the root node.
   */
  san: string | null

  /**
   * FEN of the position at this node.
   */
  fen: string

  /**
   * Maia probability of playing this move from parent position.
   * For root node, this is 1.0.
   * Range: 0.0 to 1.0
   */
  probability: number

  /**
   * Cumulative probability of reaching this node from the root.
   * This is the product of all move probabilities along the path.
   * Range: 0.0 to 1.0
   */
  cumulativeProbability: number

  /**
   * Stockfish winrate evaluation at this position.
   * From the perspective of the ROOT player (not side-to-move).
   * Range: 0.0 to 1.0
   *
   * NULL during Phase 2 (tree building) - populated in Phase 3 (batch SF eval).
   * Only leaf nodes and nodes with unexplored mass need SF evaluation.
   */
  sfWinrate: number | null

  /**
   * Stockfish centipawn evaluation (for display).
   * NULL until populated during batch SF evaluation.
   */
  sfCp: number | null

  /**
   * Maia's position evaluation (win probability).
   * From the perspective of the ROOT player (not side-to-move).
   * Range: 0.0 to 1.0
   *
   * This comes from Maia's neural network "value head" which predicts
   * win probability independently from move predictions.
   *
   * Populated during tree building (Phase 2).
   */
  maiaWinrate: number

  /**
   * Depth of this node in the tree (0 = root).
   */
  depth: number

  /**
   * Child nodes representing likely opponent responses.
   * Empty array for leaf nodes.
   */
  children: TreeNode[]

  /**
   * Sum of probabilities of explored children.
   * Range: 0.0 to 1.0
   *
   * Used to calculate uncovered mass: (1 - exploredProbability) × cumulativeProbability
   */
  exploredProbability: number

  /**
   * Pre-calculated unexplored probability mass at this node.
   *
   * Formula: (1 - exploredProbability) × cumulativeProbability
   *
   * This represents the weighted probability of the opponent playing
   * a move we didn't explore. Used in the EW formula for the
   * "uncovered mass" contribution.
   */
  unexploredMass: number

  /**
   * Whether this is a leaf node (no children explored).
   * Leaf nodes contribute their full cumulativeProbability to the EW calculation.
   */
  isLeaf: boolean
}

// ============================================================================
// BASELINE MOVE TYPES (for UI display panels)
// ============================================================================

/**
 * A move ranked by Stockfish evaluation.
 *
 * Used in the UI "Stockfish Panel" to show:
 * "Best: e4, d4, Nf3" with their evaluations.
 *
 * These are the raw SF recommendations BEFORE any EW filtering.
 */
export interface SFRankedMove {
  /**
   * Move in UCI format (e.g., "e2e4").
   */
  move: string

  /**
   * Move in SAN format for display (e.g., "e4").
   */
  san: string

  /**
   * Win probability from side-to-move perspective (0.0 to 1.0).
   */
  winrate: number

  /**
   * Centipawn evaluation (positive = good for side-to-move).
   */
  cp: number
}

/**
 * A move ranked by Maia prediction probability.
 *
 * Used in the UI "Maia Panel" to show:
 * "Predicted: e4 (35%), d4 (28%)" with probabilities.
 *
 * These represent what Maia predicts humans will play.
 */
export interface MaiaPredictedMove {
  /**
   * Move in UCI format (e.g., "e2e4").
   */
  move: string

  /**
   * Move in SAN format for display (e.g., "e4").
   */
  san: string

  /**
   * Probability of a human playing this move (0.0 to 1.0).
   */
  probability: number
}

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Result for a single candidate move.
 *
 * When calculating Expected Winrate for a position, we evaluate
 * multiple candidate moves. Each gets its own tree and EW score.
 */
export interface EWCandidateResult {
  /**
   * The candidate move (UCI format).
   */
  move: string

  /**
   * The move in SAN notation for display.
   */
  san: string

  /**
   * Maia probability of a human playing this move.
   */
  probability: number

  /**
   * Raw Stockfish winrate for the resulting position (after this move).
   * This is the direct SF evaluation, NOT accounting for human play patterns.
   */
  stockfishWinrate: number

  /**
   * Raw Stockfish centipawn evaluation (after this move).
   */
  stockfishCp: number

  /**
   * Raw Maia winrate for the resulting position (after this move).
   * This is Maia's position evaluation from its value head.
   */
  maiaWinrate: number

  /**
   * Expected Winrate using Stockfish evaluations at leaf nodes.
   * Weighted average: Σ(SF_winrate × probability) across explored tree.
   *
   * Use this for "objectively accurate" expected outcomes.
   */
  expectedWinrateSF: number

  /**
   * Expected Winrate using Maia evaluations at leaf nodes.
   * Weighted average: Σ(Maia_winrate × probability) across explored tree.
   *
   * Use this for "human-perceived" expected outcomes.
   */
  expectedWinrateMaia: number

  /**
   * The explored tree of likely responses.
   * Can be used to display the analysis to the user.
   */
  tree: TreeNode

  /**
   * How deep we explored (max depth reached in tree).
   */
  maxDepthReached: number

  /**
   * Number of unique positions evaluated with Stockfish.
   * Lower is more efficient (fewer duplicate evaluations).
   */
  uniquePositionsEvaluated: number
}

/**
 * Complete result of Expected Winrate calculation for a position.
 *
 * Provides FOUR evaluation methods:
 * 1. SF Baseline - Direct Stockfish evaluation of the position
 * 2. Maia Baseline - Direct Maia value evaluation of the position
 * 3. EW (SF) - Expected Winrate using SF values at tree leaves
 * 4. EW (Maia) - Expected Winrate using Maia values at tree leaves
 */
export interface EWResult {
  /**
   * FEN of the position being analyzed.
   */
  fen: string

  // ==========================================================================
  // BASELINE EVALUATIONS (for the Evaluation Panel)
  // ==========================================================================

  /**
   * Stockfish evaluation of the base position (before any candidate move).
   * This is the traditional "engine evaluation" of the position.
   */
  baseSFWinrate: number

  /**
   * Stockfish centipawn evaluation of the base position.
   */
  baseSFCp: number

  /**
   * Maia evaluation of the base position (before any candidate move).
   * This is Maia's neural network value head prediction.
   */
  baseMaiaWinrate: number

  // ==========================================================================
  // TOP MOVES FOR UI PANELS (separate from EW candidates)
  // ==========================================================================

  /**
   * Top moves by Stockfish evaluation (sorted best first).
   *
   * For UI display: "Best: e4, d4, Nf3"
   *
   * These are the raw SF recommendations from direct position analysis.
   * May include moves that don't appear in `candidates` (filtered by winrateLossThreshold).
   *
   * Typically 3-5 moves for display.
   */
  sfTopMoves: SFRankedMove[]

  /**
   * Top moves by Maia probability (sorted most likely first).
   *
   * For UI display: "Predicted: e4 (35%), d4 (28%)"
   *
   * These are the raw Maia predictions from direct position analysis.
   * Shows what humans are most likely to play, regardless of whether
   * the move is good or bad.
   *
   * Typically 3-5 moves for display.
   */
  maiaTopMoves: MaiaPredictedMove[]

  // ==========================================================================
  // EXPECTED WINRATE RESULTS
  // ==========================================================================

  /**
   * Results for each candidate move, sorted by EW-SF (best first).
   *
   * These are moves that passed the winrateLossThreshold filter and
   * had their probability trees explored.
   */
  candidates: EWCandidateResult[]

  // ==========================================================================
  // METADATA
  // ==========================================================================

  /**
   * Total time taken for calculation (milliseconds).
   */
  calculationTimeMs: number

  /**
   * Configuration used for this calculation.
   */
  config: EWConfig
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configuration for Expected Winrate calculation.
 *
 * Tree exploration is controlled primarily by probabilityThreshold:
 * - Branches are pruned when cumulative probability falls below threshold
 * - No fixed depth limit - exploration depth emerges from probability decay
 *
 * This follows the IMPLEMENTATION-STRATEGY.md specification where
 * termination is purely probability-based.
 */
export interface EWConfig {
  /**
   * Minimum cumulative probability for a branch to be explored.
   *
   * This single parameter controls both breadth and depth:
   * - Breadth: Only explore moves where cumProb >= threshold
   * - Depth: Stop expanding when cumProb < threshold
   *
   * Typical value: 0.01-0.05 (1-5%)
   *
   * Lower values = deeper/wider trees (slower, more accurate)
   * Higher values = shallower/narrower trees (faster, less accurate)
   */
  probabilityThreshold: number

  /**
   * Maximum winrate loss for a move to be considered as candidate.
   * Moves that lose more than this from the best move are filtered out.
   *
   * Typical value: 0.05 (5%)
   *
   * This filters out clearly bad moves before we build expensive trees.
   */
  winrateLossThreshold: number

  /**
   * Maia ELO level for predictions (1100-1900 in steps of 100).
   *
   * Typical value: 1500 (intermediate player)
   *
   * Lower ELO = more "human-like mistakes" in predictions.
   * Higher ELO = more accurate play predictions.
   */
  maiaLevel: number

  /**
   * Stockfish search depth for evaluations.
   *
   * Typical value: 10-14
   *
   * Higher = more accurate but slower.
   * With batch evaluation, we can use slightly higher depths.
   */
  stockfishDepth: number

  /**
   * Maximum number of candidate moves to analyze.
   *
   * Typical value: 5-10
   *
   * Limits computation by only analyzing top moves.
   */
  maxCandidates: number
}

/**
 * Helper to detect test mode and parse URL params.
 * Test mode uses lower values for faster E2E tests.
 */
function getEWConfigFromEnv(): Partial<EWConfig> {
  // Only check URL in browser environment
  if (typeof window === 'undefined' || !window.location) {
    return {}
  }

  const params = new URLSearchParams(window.location.search)
  const sfDepth = params.get('sfDepth')
  const testMode = params.get('testMode')

  if (sfDepth || testMode === 'true') {
    return {
      probabilityThreshold: 0.3,           // 30% - very fast tree building, few nodes
      stockfishDepth: sfDepth ? parseInt(sfDepth, 10) : 1,
      maxCandidates: 2,                    // Only top 2 candidates
    }
  }

  return {}
}

/**
 * Default configuration for Expected Winrate calculation.
 *
 * These values balance accuracy vs computation time.
 * Uses probability-based termination (no maxDepth).
 *
 * In test mode (?testMode=true or ?sfDepth=1), uses faster settings.
 */
export const DEFAULT_EW_CONFIG: EWConfig = {
  probabilityThreshold: 0.01,    // 1% - explore branches with ≥1% cumulative probability
  winrateLossThreshold: 0.05,    // 5% - filter moves losing more than 5% winrate
  maiaLevel: 1500,               // Intermediate human level
  stockfishDepth: 10,            // Reasonable depth for batch evaluation
  maxCandidates: 8,              // Analyze top 8 candidate moves
  ...getEWConfigFromEnv(),       // Override with test mode settings if applicable
}

// ============================================================================
// CALLBACK TYPES
// ============================================================================

/**
 * Progress callback for long-running calculations.
 *
 * Called periodically during EW calculation to report progress.
 * Phases match the 4-phase algorithm from IMPLEMENTATION-STRATEGY.md.
 */
export interface EWProgressCallback {
  /**
   * Current phase of calculation.
   *
   * - 'filtering': Phase 1 - Finding candidate moves
   * - 'building_trees': Phase 2 - Building probability trees with Maia
   * - 'evaluating': Phase 3 - Batch evaluating positions with Stockfish
   * - 'computing': Phase 4 - Calculating Expected Winrate values
   */
  phase: 'filtering' | 'building_trees' | 'evaluating' | 'computing'

  /**
   * Progress within current phase (0-100).
   */
  progress: number

  /**
   * Human-readable message about current activity.
   */
  message: string

  /**
   * Number of candidate moves being analyzed.
   */
  candidateCount?: number

  /**
   * Current candidate being processed (if applicable).
   */
  currentCandidate?: string

  /**
   * Number of unique positions to evaluate with SF (Phase 3).
   */
  positionsToEvaluate?: number
}

/**
 * Type for the progress callback function.
 */
export type OnEWProgress = (progress: EWProgressCallback) => void
