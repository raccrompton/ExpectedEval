#!/usr/bin/env npx tsx
/**
 * Expected Winrate Methods Comparison Script
 *
 * Compares four different methods for evaluating a chess position:
 *
 * 1. BASELINE STOCKFISH - Stockfish winrate for the base position
 * 2. BASELINE MAIA - Maia value (win probability) for the base position
 * 3. EXPECTED WINRATE (MAIA) - Tree search with Maia probs, Maia values at leaves
 * 4. EXPECTED WINRATE (SF) - Tree search with Maia probs, Stockfish values at leaves
 *
 * The Expected Winrate algorithm follows the formula from IMPLEMENTATION-STRATEGY.md:
 *
 *   EW = Σ(leaf_winrate × leaf_prob) + Σ(node_winrate × node_uncovered_mass)
 *
 * Where:
 * - leaf_winrate = evaluation at leaf position (0.0 to 1.0)
 * - leaf_prob = cumulative probability of reaching that leaf
 * - node_winrate = evaluation at internal node where pruning occurred
 * - node_uncovered_mass = (1 - Σexplored_child_probs) × node's cumulative probability
 *
 * Tree exploration terminates based on cumulative probability coverage.
 *
 * Usage:
 *   npx tsx scripts/compare-ew-methods.ts
 *   npx tsx scripts/compare-ew-methods.ts --fen "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
 *   npx tsx scripts/compare-ew-methods.ts --threshold 0.005 --sf-depth 12
 */

import * as path from "path";
import * as fs from "fs";

// Import Node.js engine implementations
import { NodeMaia } from "../src/core/engine/maia.node";
import { NodeStockfish } from "../src/core/engine/stockfish.node";

// Import chessops for move application
import { Chess } from "chessops/chess";
import { parseFen, makeFen } from "chessops/fen";
import { parseUci } from "chessops/util";

// -----------------------------------------------------------------------------
// ANSI colors for terminal output
// -----------------------------------------------------------------------------
const c = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

// -----------------------------------------------------------------------------
// Test positions - 10 diverse chess positions for comparison
// -----------------------------------------------------------------------------
const TEST_POSITIONS = [
  {
    name: "Starting position",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  },
  {
    name: "After 1.e4",
    fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  },
  {
    name: "Italian Game",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
  },
  {
    name: "Sicilian Najdorf",
    fen: "rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6",
  },
  {
    name: "Queens Gambit Declined",
    fen: "rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4",
  },
  {
    name: "Ruy Lopez",
    fen: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
  },
  {
    name: "French Defense",
    fen: "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
  },
  {
    name: "Caro-Kann",
    fen: "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
  },
  {
    name: "Kings Indian",
    fen: "rnbqkb1r/pppppp1p/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 4",
  },
  {
    name: "Complex middlegame",
    fen: "r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 4 7",
  },
];

// -----------------------------------------------------------------------------
// Configuration for the Expected Winrate calculation
// -----------------------------------------------------------------------------
interface Config {
  // Minimum cumulative probability threshold for tree exploration
  // This single parameter controls both breadth and depth:
  // - Breadth: Only explore moves where child's cumulative prob >= threshold
  // - Depth: Stop expanding nodes when cumulative prob < threshold
  // Lower values = deeper/wider trees (slower, more accurate)
  // Higher values = shallower/narrower trees (faster, less accurate)
  probabilityThreshold: number;

  // ELO level for Maia predictions (affects move probabilities)
  eloLevel: number;

  // Stockfish search depth for evaluations
  sfDepth: number;
}

const DEFAULT_CONFIG: Config = {
  probabilityThreshold: 0.01, // Stop exploring branches with <1% cumulative probability
  eloLevel: 1500, // Maia 1500 ELO model
  sfDepth: 10, // Stockfish depth 10 for evaluations
};

// -----------------------------------------------------------------------------
// Tree node structure for Expected Winrate calculation
// -----------------------------------------------------------------------------
interface TreeNode {
  // Position information
  fen: string;
  move: string | null; // UCI move that led to this node (null for root)
  depth: number; // Depth in the tree (0 = root)

  // Probability tracking
  moveProb: number; // Probability of this specific move being played
  cumulativeProb: number; // Probability of reaching this node from root

  // Evaluations (from the perspective of the ROOT player)
  maiaValue: number | null; // Maia's win probability estimate
  sfWinrate: number | null; // Stockfish's win probability estimate

  // Tree structure
  children: TreeNode[];
  isLeaf: boolean; // True if no children were explored

  // For EW calculation: probability mass not explored at this node
  unexploredMass: number;
}

// -----------------------------------------------------------------------------
// Result types for the comparison
// -----------------------------------------------------------------------------
interface PositionAnalysis {
  name: string;
  fen: string;

  // Baseline evaluations (just evaluate the position directly)
  baselineSF: number;
  baselineMaia: number;

  // Expected Winrate calculations
  ewMaia: number; // EW using Maia values at leaves
  ewSF: number; // EW using Stockfish values at leaves

  // Top move recommendations
  sfBestMove: string; // Stockfish's recommended move
  maiaMostLikely: string; // Maia's most likely human move (highest probability)
  maiaMostLikelyProb: number; // Probability of that move

  // EW best moves - one for each leaf evaluation method
  ewBestMove_SF: string; // Move with highest EW using SF values at leaves
  ewBestMoveValue_SF: number; // The EW(SF) value of that move
  ewBestMove_Maia: string; // Move with highest EW using Maia values at leaves
  ewBestMoveValue_Maia: number; // The EW(Maia) value of that move

  // Per-move EW values for all explored candidate moves
  // Keyed by UCI move string (e.g., "e2e4" -> 0.542)
  moveEWValues_SF: Record<string, number>; // EW using SF values at leaves
  moveEWValues_Maia: Record<string, number>; // EW using Maia values at leaves

  // Statistics about the tree exploration
  nodesExplored: number;
  maxDepthReached: number;
  coverageAchieved: number;
  uniquePositions: number; // Number of unique FENs evaluated with SF

  // Timing breakdown
  timeMs: number;
  treeBuildMs: number; // Time for Phase 2 (Maia tree building)
  sfEvalMs: number; // Time for Phase 3 (SF batch evaluation)

  // The probability tree (for debugging/visualization)
  tree: TreeNode;
}

// -----------------------------------------------------------------------------
// Utility functions for chess operations
// -----------------------------------------------------------------------------

/**
 * Get whose turn it is from a FEN string.
 * Returns 'w' for white, 'b' for black.
 */
function getTurn(fen: string): "w" | "b" {
  // FEN format: "pieces turn castling en-passant halfmove fullmove"
  // The turn is the second field
  return fen.split(" ")[1] as "w" | "b";
}

/**
 * Apply a UCI move to a FEN and return the resulting FEN.
 * Uses chessops for proper move validation and application.
 */
function applyMove(fen: string, uciMove: string): string {
  // Parse the FEN into a setup object
  const setup = parseFen(fen);
  if (!setup.isOk) throw new Error(`Invalid FEN: ${fen}`);

  // Create a Chess position from the setup
  const chess = Chess.fromSetup(setup.value);
  if (!chess.isOk) throw new Error(`Invalid position`);

  const pos = chess.value;

  // Parse the UCI move (e.g., "e2e4" -> {from: e2, to: e4})
  const move = parseUci(uciMove);
  if (!move) throw new Error(`Invalid UCI move: ${uciMove}`);

  // Apply the move to the position
  pos.play(move);

  // Return the resulting FEN
  return makeFen(pos.toSetup());
}

/**
 * Format a number as a percentage string.
 */
function percent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// -----------------------------------------------------------------------------
// Core Expected Winrate Algorithm
// -----------------------------------------------------------------------------

/**
 * Build the probability tree for Expected Winrate calculation.
 *
 * PHASE 2 of the algorithm from IMPLEMENTATION-STRATEGY.md:
 * - Use Maia to predict likely moves at each position
 * - Recursively build tree based on cumulative probability
 * - Prune branches below probabilityThreshold
 * - Track cumulative probability at each node
 *
 * IMPORTANT: This function only uses Maia for move predictions and value estimates.
 * Stockfish evaluation happens AFTER the tree is built (Phase 3).
 *
 * @param maia - Maia engine instance for move predictions
 * @param fen - Current position FEN
 * @param config - Configuration parameters
 * @param rootTurn - Whose turn it was at the root (for normalizing evaluations)
 * @param depth - Current depth in the tree
 * @param cumulativeProb - Probability of reaching this node from root
 */
// Debug counter for tree building
let nodeCount = 0;
let lastLogTime = Date.now();
let maxDepthSeen = 0;

async function buildProbabilityTree(
  maia: NodeMaia,
  fen: string,
  config: Config,
  rootTurn: "w" | "b",
  depth: number = 0,
  cumulativeProb: number = 1.0
): Promise<TreeNode> {
  nodeCount++;
  if (depth > maxDepthSeen) maxDepthSeen = depth;

  // Log progress every 2 seconds
  const now = Date.now();
  if (now - lastLogTime > 2000) {
    console.log(
      `  ${
        c.dim
      }[DEBUG] Nodes: ${nodeCount}, maxDepth: ${maxDepthSeen}, current: depth=${depth}, cumProb=${(
        cumulativeProb * 100
      ).toFixed(3)}%${c.reset}`
    );
    lastLogTime = now;
  }

  // Get Maia's prediction for this position (move probabilities + value estimate)
  const maiaPrediction = await maia.predict(fen, { eloLevel: config.eloLevel });

  // Normalize Maia value to root player's perspective
  // IMPORTANT: Maia ALWAYS returns White's expected score (see maia.node.ts)
  // We need to convert from White's perspective to root player's perspective
  // This is independent of whose turn it currently is!
  const normalizedMaiaValue =
    rootTurn === "w" ? maiaPrediction.value : 1 - maiaPrediction.value;

  // Create the node - sfWinrate is null until Phase 3 (batch SF evaluation)
  const node: TreeNode = {
    fen,
    move: null,
    depth,
    moveProb: 1.0,
    cumulativeProb,
    maiaValue: normalizedMaiaValue,
    sfWinrate: null, // Will be populated in Phase 3
    children: [],
    isLeaf: true,
    unexploredMass: 0,
  };

  // Decide whether to expand this node
  // Stop if cumulative probability is too small to matter
  // This is the key insight: we explore based on probability, not depth
  const shouldExpand = cumulativeProb >= config.probabilityThreshold;

  if (!shouldExpand) {
    // This is a leaf node - cumulative probability too small to explore further
    return node;
  }

  // Get moves where child's cumulative probability would be above threshold
  // This is the key filter: we only explore moves that contribute meaningfully
  // to the probability mass we're tracking
  const significantMoves = Object.entries(maiaPrediction.policy)
    .filter(([_, prob]) => {
      const childCumulativeProb = cumulativeProb * prob;
      return childCumulativeProb >= config.probabilityThreshold;
    })
    .sort((a, b) => b[1] - a[1]);

  // Debug: log when we have many significant moves at depth 0
  if (depth === 0) {
    console.log(
      `  ${c.dim}[DEBUG] Root has ${significantMoves.length} significant moves to explore${c.reset}`
    );
    console.log(
      `  ${c.dim}[DEBUG] Top moves: ${significantMoves
        .slice(0, 5)
        .map(([m, p]) => `${m}:${(p * 100).toFixed(1)}%`)
        .join(", ")}${c.reset}`
    );
  }

  // Track how much probability mass we've explored at this node
  let exploredProb = 0;

  // Explore each significant move (all moves that pass the probability threshold)
  for (const [move, prob] of significantMoves) {
    try {
      // Apply the move to get the resulting position
      const childFen = applyMove(fen, move);
      const childCumulativeProb = cumulativeProb * prob;

      // Recursively build the subtree (Maia only, no SF)
      const childNode = await buildProbabilityTree(
        maia,
        childFen,
        config,
        rootTurn,
        depth + 1,
        childCumulativeProb
      );

      // Set the move information on the child
      childNode.move = move;
      childNode.moveProb = prob;
      childNode.cumulativeProb = childCumulativeProb;

      // Add to our children
      node.children.push(childNode);
      node.isLeaf = false;

      exploredProb += prob;
    } catch {
      // Skip invalid moves (shouldn't happen with Maia, but just in case)
      continue;
    }
  }

  // Calculate unexplored probability mass at this node
  // This is the portion of moves we didn't explore (below threshold or past coverage)
  node.unexploredMass = Math.max(0, 1 - exploredProb) * cumulativeProb;

  return node;
}

/**
 * Collect all positions that need Stockfish evaluation.
 *
 * PHASE 3 PREPARATION: We need to evaluate:
 * 1. All leaf nodes (end of explored branches)
 * 2. All internal nodes with unexplored mass > 0 (for the uncovered mass term)
 *
 * Returns a Map of FEN -> rootTurn-relative turn (for normalizing SF values later)
 */
function collectPositionsForEvaluation(
  node: TreeNode,
  rootTurn: "w" | "b",
  positions: Map<string, "w" | "b"> = new Map()
): Map<string, "w" | "b"> {
  const currentTurn = getTurn(node.fen);
  const needsEval = node.isLeaf || node.unexploredMass > 0;

  if (needsEval && !positions.has(node.fen)) {
    positions.set(
      node.fen,
      currentTurn === rootTurn ? "same" : ("opposite" as any)
    );
    // Store the current turn so we can normalize the SF value later
    positions.set(node.fen, currentTurn);
  }

  // Recurse into children
  for (const child of node.children) {
    collectPositionsForEvaluation(child, rootTurn, positions);
  }

  return positions;
}

/**
 * Batch evaluate positions with Stockfish.
 *
 * PHASE 3 of the algorithm: Evaluate all leaf positions efficiently.
 * This is much faster than evaluating during tree building because:
 * 1. We only evaluate positions that actually need it (leaves + uncovered nodes)
 * 2. The number of positions is typically small (tens, not hundreds)
 *
 * @returns Map of FEN -> SF winrate (from side-to-move perspective)
 */
async function batchEvaluateWithSF(
  stockfish: NodeStockfish,
  positions: Map<string, "w" | "b">,
  config: Config
): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  // Evaluate each unique position
  for (const [fen] of positions) {
    const sfResult = await stockfish.evaluate(fen, { depth: config.sfDepth });
    results.set(fen, sfResult.winrate);
  }

  return results;
}

/**
 * Populate Stockfish winrate values into the tree.
 *
 * PHASE 3 COMPLETION: After batch evaluation, set sfWinrate on all nodes.
 * Values are normalized to root player's perspective.
 */
function populateSFWinrates(
  node: TreeNode,
  sfResults: Map<string, number>,
  rootTurn: "w" | "b"
): void {
  const currentTurn = getTurn(node.fen);
  const sfWinrate = sfResults.get(node.fen);

  if (sfWinrate !== undefined) {
    // Normalize to root player's perspective
    node.sfWinrate = currentTurn === rootTurn ? sfWinrate : 1 - sfWinrate;
  }

  // Recurse into children
  for (const child of node.children) {
    populateSFWinrates(child, sfResults, rootTurn);
  }
}

/**
 * Calculate Expected Winrate using Maia values at leaves.
 *
 * This implements Phase 4 of the algorithm from IMPLEMENTATION-STRATEGY.md:
 *   EW = Σ(leaf_winrate × leaf_prob) + Σ(node_winrate × node_uncovered_mass)
 *
 * @param node - Root of the probability tree
 * @returns Expected winrate from root player's perspective (0.0 to 1.0)
 */
function calculateEW_Maia(node: TreeNode): number {
  if (node.isLeaf || node.children.length === 0) {
    // Leaf node: contributes its own value weighted by cumulative probability
    // This is the Σ(leaf_winrate × leaf_prob) part
    return (node.maiaValue ?? 0.5) * node.cumulativeProb;
  }

  // Internal node with children
  let total = 0;

  // Sum contributions from all children (recursive)
  for (const child of node.children) {
    total += calculateEW_Maia(child);
  }

  // Add contribution from unexplored mass at this node
  // This is the Σ(node_winrate × node_uncovered_mass) part
  // We use this node's evaluation for the unexplored branches
  total += (node.maiaValue ?? 0.5) * node.unexploredMass;

  return total;
}

/**
 * Calculate Expected Winrate using Stockfish values at leaves.
 *
 * Same algorithm as calculateEW_Maia, but uses Stockfish evaluations instead.
 *
 * @param node - Root of the probability tree
 * @returns Expected winrate from root player's perspective (0.0 to 1.0)
 */
function calculateEW_SF(node: TreeNode): number {
  if (node.isLeaf || node.children.length === 0) {
    // Leaf node: contributes its own SF value weighted by cumulative probability
    return (node.sfWinrate ?? 0.5) * node.cumulativeProb;
  }

  // Internal node with children
  let total = 0;

  // Sum contributions from all children (recursive)
  for (const child of node.children) {
    total += calculateEW_SF(child);
  }

  // Add contribution from unexplored mass at this node
  total += (node.sfWinrate ?? 0.5) * node.unexploredMass;

  return total;
}

/**
 * Print the probability tree for debugging/verification.
 * Shows move, probability, and cumulative probability at each node.
 *
 * @param node - Tree node to print
 * @param indent - Current indentation level
 * @param maxDepth - Maximum depth to print (to avoid overwhelming output)
 */
function printProbabilityTree(
  node: TreeNode,
  indent: string = "",
  maxDepth: number = 6
): void {
  // Format the node info
  const moveStr = node.move ? node.move : "ROOT";
  const probStr = node.move ? `prob=${(node.moveProb * 100).toFixed(1)}%` : "";
  const cumProbStr = `cumProb=${(node.cumulativeProb * 100).toFixed(2)}%`;
  const leafStr = node.isLeaf ? " [LEAF]" : "";
  const unexploredStr =
    node.unexploredMass > 0.001
      ? ` unexplored=${(node.unexploredMass * 100).toFixed(2)}%`
      : "";

  // Color based on cumulative probability
  const cumColor =
    node.cumulativeProb >= 0.1
      ? c.green
      : node.cumulativeProb >= 0.01
      ? c.yellow
      : c.dim;

  console.log(
    `${indent}${c.bright}${moveStr}${c.reset} ${probStr} ${cumColor}${cumProbStr}${c.reset}${leafStr}${unexploredStr}`
  );

  // Stop at max depth
  if (node.depth >= maxDepth) {
    if (node.children.length > 0) {
      console.log(
        `${indent}  ${c.dim}... (${node.children.length} children truncated)${c.reset}`
      );
    }
    return;
  }

  // Print children
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const isLast = i === node.children.length - 1;
    const childIndent = indent + (isLast ? "  └─ " : "  ├─ ");
    const grandchildIndent = indent + (isLast ? "     " : "  │  ");

    // Print child with its proper indentation
    const childMoveStr = child.move || "???";
    const childProbStr = `prob=${(child.moveProb * 100).toFixed(1)}%`;
    const childCumProbStr = `cumProb=${(child.cumulativeProb * 100).toFixed(
      2
    )}%`;
    const childLeafStr = child.isLeaf ? " [LEAF]" : "";
    const childUnexploredStr =
      child.unexploredMass > 0.001
        ? ` unexplored=${(child.unexploredMass * 100).toFixed(2)}%`
        : "";

    const childCumColor =
      child.cumulativeProb >= 0.1
        ? c.green
        : child.cumulativeProb >= 0.01
        ? c.yellow
        : c.dim;

    console.log(
      `${childIndent}${c.bright}${childMoveStr}${c.reset} ${childProbStr} ${childCumColor}${childCumProbStr}${c.reset}${childLeafStr}${childUnexploredStr}`
    );

    // Recursively print grandchildren
    if (child.children.length > 0 && child.depth < maxDepth) {
      for (let j = 0; j < child.children.length; j++) {
        const grandchild = child.children[j];
        const isLastGrand = j === child.children.length - 1;
        printProbabilityTree(
          grandchild,
          grandchildIndent + (isLastGrand ? "└─ " : "├─ "),
          maxDepth
        );
      }
    } else if (child.children.length > 0) {
      console.log(
        `${grandchildIndent}${c.dim}... (${child.children.length} children truncated)${c.reset}`
      );
    }
  }
}

/**
 * Count total nodes in the tree.
 */
function countNodes(node: TreeNode): number {
  let count = 1;
  for (const child of node.children) {
    count += countNodes(child);
  }
  return count;
}

/**
 * Find the maximum depth reached in the tree.
 */
function findMaxDepth(node: TreeNode): number {
  if (node.children.length === 0) {
    return node.depth;
  }
  return Math.max(...node.children.map(findMaxDepth));
}

/**
 * Calculate the total probability coverage achieved.
 * This is the sum of all leaf cumulative probabilities plus unexplored masses.
 */
function calculateCoverage(node: TreeNode): number {
  if (node.isLeaf || node.children.length === 0) {
    return node.cumulativeProb;
  }

  let total = 0;
  for (const child of node.children) {
    total += calculateCoverage(child);
  }
  total += node.unexploredMass;

  return total;
}

// -----------------------------------------------------------------------------
// Main analysis function
// -----------------------------------------------------------------------------

/**
 * Analyze a single position with all four methods.
 *
 * @param maia - Maia engine instance
 * @param stockfish - Stockfish engine instance
 * @param name - Human-readable name for this position
 * @param fen - Position FEN to analyze
 * @param config - Configuration parameters
 * @returns Analysis results for all four methods
 */
async function analyzePosition(
  maia: NodeMaia,
  stockfish: NodeStockfish,
  name: string,
  fen: string,
  config: Config
): Promise<PositionAnalysis> {
  const start = Date.now();
  const rootTurn = getTurn(fen);

  // ----- BASELINE EVALUATIONS -----
  // These are simple static evaluations of the base position

  // Baseline Stockfish: Just evaluate the position directly
  const sfResult = await stockfish.evaluate(fen, { depth: config.sfDepth });
  const baselineSF = sfResult.winrate; // Already from side-to-move perspective

  // Baseline Maia: Get Maia's win probability for the position
  // NOTE: Maia ALWAYS returns White's expected score (see maia.node.ts)
  // Convert to side-to-move perspective to match Stockfish baseline
  const maiaPrediction = await maia.predict(fen, { eloLevel: config.eloLevel });
  const baselineMaia =
    rootTurn === "w" ? maiaPrediction.value : 1 - maiaPrediction.value;

  // ----- EXPECTED WINRATE CALCULATIONS -----
  // Three-phase algorithm: Build tree → Batch evaluate → Calculate EW

  // PHASE 2: Build the probability tree using Maia only (fast)
  nodeCount = 0; // Reset counter for each position
  maxDepthSeen = 0;
  lastLogTime = Date.now();
  console.log(`  ${c.dim}[DEBUG] Starting tree build...${c.reset}`);
  const treeBuildStart = Date.now();
  const tree = await buildProbabilityTree(
    maia,
    fen,
    config,
    rootTurn,
    0, // Start at depth 0
    1.0 // Start with cumulative probability 1.0
  );
  const treeBuildMs = Date.now() - treeBuildStart;
  console.log(
    `  ${c.dim}[DEBUG] Tree built: ${nodeCount} nodes, maxDepth=${maxDepthSeen}, took ${treeBuildMs}ms${c.reset}`
  );

  // PHASE 3: Batch evaluate positions with Stockfish (efficient)
  // Only evaluate leaves and nodes with unexplored mass
  const sfEvalStart = Date.now();
  const positionsToEvaluate = collectPositionsForEvaluation(tree, rootTurn);
  console.log(
    `  ${c.dim}[DEBUG] SF eval: ${positionsToEvaluate.size} unique positions to evaluate${c.reset}`
  );
  const sfResults = await batchEvaluateWithSF(
    stockfish,
    positionsToEvaluate,
    config
  );
  populateSFWinrates(tree, sfResults, rootTurn);
  const sfEvalMs = Date.now() - sfEvalStart;

  // PHASE 4: Calculate Expected Winrate
  // EW(Maia) uses Maia values at leaves
  const ewMaia = calculateEW_Maia(tree);

  // EW(SF) uses Stockfish values at leaves
  const ewSF = calculateEW_SF(tree);

  // ----- TOP MOVE RECOMMENDATIONS -----

  // SF's best move (from baseline evaluation)
  const sfBestMove = sfResult.bestMove;

  // Maia's most likely human move (highest probability)
  const policyEntries = Object.entries(maiaPrediction.policy);
  policyEntries.sort((a, b) => b[1] - a[1]);
  const maiaMostLikely = policyEntries[0]?.[0] ?? "";
  const maiaMostLikelyProb = policyEntries[0]?.[1] ?? 0;

  // EW's best moves: find the root child with highest EW value
  // We calculate EW for each method (SF and Maia) separately
  // Also store per-move EW values for all explored candidate moves
  let ewBestMove_SF = "";
  let ewBestMoveValue_SF = -Infinity;
  let ewBestMove_Maia = "";
  let ewBestMoveValue_Maia = -Infinity;
  const moveEWValues_SF: Record<string, number> = {};
  const moveEWValues_Maia: Record<string, number> = {};

  for (const child of tree.children) {
    const move = child.move ?? "";

    // Calculate EW(SF) for this child's subtree, normalized by its probability
    const childEW_SF = calculateEW_SF(child) / child.cumulativeProb;
    moveEWValues_SF[move] = childEW_SF;
    if (childEW_SF > ewBestMoveValue_SF) {
      ewBestMoveValue_SF = childEW_SF;
      ewBestMove_SF = move;
    }

    // Calculate EW(Maia) for this child's subtree, normalized by its probability
    const childEW_Maia = calculateEW_Maia(child) / child.cumulativeProb;
    moveEWValues_Maia[move] = childEW_Maia;
    if (childEW_Maia > ewBestMoveValue_Maia) {
      ewBestMoveValue_Maia = childEW_Maia;
      ewBestMove_Maia = move;
    }
  }
  // If no children (shouldn't happen), fall back to SF best move
  if (!ewBestMove_SF) {
    ewBestMove_SF = sfBestMove;
    ewBestMoveValue_SF = baselineSF;
  }
  if (!ewBestMove_Maia) {
    ewBestMove_Maia = sfBestMove;
    ewBestMoveValue_Maia = baselineMaia;
  }

  // Gather statistics
  const nodesExplored = countNodes(tree);
  const maxDepthReached = findMaxDepth(tree);
  const coverageAchieved = calculateCoverage(tree);
  const uniquePositions = positionsToEvaluate.size;

  return {
    name,
    fen,
    baselineSF,
    baselineMaia,
    ewMaia,
    ewSF,
    sfBestMove,
    maiaMostLikely,
    maiaMostLikelyProb,
    ewBestMove_SF,
    ewBestMoveValue_SF,
    ewBestMove_Maia,
    ewBestMoveValue_Maia,
    moveEWValues_SF,
    moveEWValues_Maia,
    nodesExplored,
    maxDepthReached,
    coverageAchieved,
    uniquePositions,
    timeMs: Date.now() - start,
    treeBuildMs,
    sfEvalMs,
    tree,
  };
}

// -----------------------------------------------------------------------------
// Display functions
// -----------------------------------------------------------------------------

/**
 * Display the analysis results for a single position.
 */
function displayResult(result: PositionAnalysis): void {
  console.log(`\n${c.bright}${c.blue}═══ ${result.name} ═══${c.reset}`);
  console.log(`${c.dim}FEN: ${result.fen}${c.reset}`);
  console.log(
    `${c.dim}Stats: ${result.nodesExplored} nodes, ${
      result.uniquePositions
    } unique FENs, depth ${result.maxDepthReached}, ${percent(
      result.coverageAchieved
    )} coverage${c.reset}`
  );
  console.log(
    `${c.dim}Time: ${result.timeMs}ms total (Maia tree: ${result.treeBuildMs}ms, SF eval: ${result.sfEvalMs}ms)${c.reset}\n`
  );

  // Display the four evaluation methods
  console.log(`${c.bright}Evaluation Comparison:${c.reset}`);
  console.log("─".repeat(50));

  // Format as a comparison table
  const methods = [
    { name: "Baseline Stockfish", value: result.baselineSF, color: c.cyan },
    { name: "Baseline Maia", value: result.baselineMaia, color: c.magenta },
    { name: "Expected WR (Maia)", value: result.ewMaia, color: c.yellow },
    { name: "Expected WR (SF)", value: result.ewSF, color: c.green },
  ];

  for (const method of methods) {
    const bar = "█".repeat(Math.round(method.value * 30));
    const empty = "░".repeat(30 - Math.round(method.value * 30));
    console.log(
      `  ${method.name.padEnd(20)} ${method.color}${percent(
        method.value
      ).padStart(6)}${c.reset}  ${c.dim}${bar}${empty}${c.reset}`
    );
  }

  // Show top move recommendations
  console.log(`\n${c.bright}Top Move Recommendations:${c.reset}`);
  console.log("─".repeat(50));

  // Highlight if moves differ
  const allSame =
    result.sfBestMove === result.maiaMostLikely &&
    result.sfBestMove === result.ewBestMove_SF &&
    result.sfBestMove === result.ewBestMove_Maia;

  console.log(
    `  ${c.cyan}Stockfish best:${c.reset}  ${c.bright}${result.sfBestMove}${c.reset}`
  );
  console.log(
    `  ${c.magenta}Maia predicts:${c.reset}   ${c.bright}${result.maiaMostLikely}${c.reset} ${c.dim}(${(result.maiaMostLikelyProb * 100).toFixed(1)}% likely)${c.reset}`
  );
  console.log(
    `  ${c.green}EW(SF) best:${c.reset}     ${c.bright}${result.ewBestMove_SF}${c.reset} ${c.dim}(${(result.ewBestMoveValue_SF * 100).toFixed(1)}% EW)${c.reset}`
  );
  console.log(
    `  ${c.yellow}EW(Maia) best:${c.reset}   ${c.bright}${result.ewBestMove_Maia}${c.reset} ${c.dim}(${(result.ewBestMoveValue_Maia * 100).toFixed(1)}% EW)${c.reset}`
  );

  if (!allSame) {
    if (result.sfBestMove !== result.ewBestMove_SF) {
      console.log(
        `  ${c.yellow}⚠ EW(SF) recommends different move than Stockfish!${c.reset}`
      );
    }
    if (result.ewBestMove_SF !== result.ewBestMove_Maia) {
      console.log(
        `  ${c.yellow}⚠ EW(SF) and EW(Maia) recommend different moves!${c.reset}`
      );
    }
  }

  // Show the differences
  console.log(`\n${c.bright}Differences:${c.reset}`);

  const diffSF_EW = result.ewSF - result.baselineSF;
  const diffMaia_EW = result.ewMaia - result.baselineMaia;
  const diffEW_methods = result.ewSF - result.ewMaia;

  const formatDiff = (diff: number): string => {
    const sign = diff >= 0 ? "+" : "";
    const color = Math.abs(diff) < 0.02 ? c.dim : diff > 0 ? c.green : c.red;
    return `${color}${sign}${(diff * 100).toFixed(1)}%${c.reset}`;
  };

  console.log(`  SF Baseline → EW(SF):     ${formatDiff(diffSF_EW)}`);
  console.log(`  Maia Baseline → EW(Maia): ${formatDiff(diffMaia_EW)}`);
  console.log(`  EW(Maia) vs EW(SF):       ${formatDiff(diffEW_methods)}`);

  // Interpretation
  if (Math.abs(diffSF_EW) < 0.02 && Math.abs(diffMaia_EW) < 0.02) {
    console.log(`\n  ${c.green}✓ All methods largely agree${c.reset}`);
  } else if (Math.abs(diffEW_methods) < 0.02) {
    console.log(
      `\n  ${c.yellow}⚡ EW methods agree, but differ from baselines${c.reset}`
    );
    console.log(
      `     This suggests human play leads to different outcomes than static eval`
    );
  } else {
    console.log(
      `\n  ${c.red}✗ Significant disagreement between methods${c.reset}`
    );
    console.log(
      `     The choice of evaluation method matters for this position`
    );
  }
}

/**
 * Display a summary comparing all positions.
 */
function displaySummary(results: PositionAnalysis[]): void {
  console.log(
    `\n${c.bright}${c.cyan}╔══════════════════════════════════════════════════════════╗${c.reset}`
  );
  console.log(
    `${c.bright}${c.cyan}║                      SUMMARY                             ║${c.reset}`
  );
  console.log(
    `${c.bright}${c.cyan}╚══════════════════════════════════════════════════════════╝${c.reset}\n`
  );

  // Calculate average differences
  let totalDiffSF = 0;
  let totalDiffMaia = 0;
  let totalDiffEW = 0;

  for (const r of results) {
    totalDiffSF += Math.abs(r.ewSF - r.baselineSF);
    totalDiffMaia += Math.abs(r.ewMaia - r.baselineMaia);
    totalDiffEW += Math.abs(r.ewSF - r.ewMaia);
  }

  const n = results.length;
  const avgDiffSF = totalDiffSF / n;
  const avgDiffMaia = totalDiffMaia / n;
  const avgDiffEW = totalDiffEW / n;

  console.log(`Positions analyzed: ${n}`);
  console.log(`\nAverage absolute differences:`);
  console.log(`  SF Baseline vs EW(SF):     ${percent(avgDiffSF)}`);
  console.log(`  Maia Baseline vs EW(Maia): ${percent(avgDiffMaia)}`);
  console.log(`  EW(Maia) vs EW(SF):        ${percent(avgDiffEW)}`);

  // Interpretation
  console.log(`\n${c.bright}Interpretation:${c.reset}`);

  if (avgDiffSF < 0.02 && avgDiffMaia < 0.02) {
    console.log(
      `${c.green}Expected Winrate gives similar results to static evaluation.${c.reset}`
    );
    console.log(
      `The tree search may not provide significant additional insight.`
    );
  } else if (avgDiffEW < 0.02) {
    console.log(
      `${c.yellow}Both EW methods agree, but differ from baselines.${c.reset}`
    );
    console.log(
      `Tree search provides different insights than static evaluation.`
    );
    console.log(
      `Consider using EW for more realistic win probability estimates.`
    );
  } else {
    console.log(
      `${c.red}Evaluation methods show significant variation.${c.reset}`
    );
    console.log(`The choice of evaluation method matters substantially.`);
    console.log(
      `EW(SF) may be more accurate but EW(Maia) captures "human feel".`
    );
  }

  // Table of all results
  console.log(`\n${c.bright}Results Table:${c.reset}`);
  console.log("─".repeat(75));
  console.log(
    `${"Position".padEnd(20)} ${"Base SF".padStart(8)} ${"Base Maia".padStart(
      10
    )} ${"EW(Maia)".padStart(10)} ${"EW(SF)".padStart(8)} ${"Nodes".padStart(
      6
    )}`
  );
  console.log("─".repeat(75));

  for (const r of results) {
    console.log(
      `${r.name.slice(0, 19).padEnd(20)} ${percent(r.baselineSF).padStart(
        8
      )} ${percent(r.baselineMaia).padStart(10)} ${percent(r.ewMaia).padStart(
        10
      )} ${percent(r.ewSF).padStart(8)} ${r.nodesExplored
        .toString()
        .padStart(6)}`
    );
  }
  console.log("─".repeat(75));
}

// -----------------------------------------------------------------------------
// Output/Serialization functions
// -----------------------------------------------------------------------------

/**
 * Serialize a tree node to a JSON-friendly format.
 * Includes all probabilities and evaluations for debugging.
 */
function serializeTree(node: TreeNode): object {
  return {
    fen: node.fen,
    move: node.move,
    depth: node.depth,
    moveProb: Math.round(node.moveProb * 10000) / 10000,
    cumulativeProb: Math.round(node.cumulativeProb * 10000) / 10000,
    maiaValue:
      node.maiaValue !== null
        ? Math.round(node.maiaValue * 10000) / 10000
        : null,
    sfWinrate:
      node.sfWinrate !== null
        ? Math.round(node.sfWinrate * 10000) / 10000
        : null,
    isLeaf: node.isLeaf,
    unexploredMass: Math.round(node.unexploredMass * 10000) / 10000,
    children: node.children.map(serializeTree),
  };
}

/**
 * Serialize analysis results to JSON format.
 */
function serializeResults(results: PositionAnalysis[], config: Config): object {
  return {
    timestamp: new Date().toISOString(),
    config: {
      probabilityThreshold: config.probabilityThreshold,
      eloLevel: config.eloLevel,
      sfDepth: config.sfDepth,
    },
    positions: results.map((r) => ({
      name: r.name,
      fen: r.fen,
      evaluations: {
        baselineSF: Math.round(r.baselineSF * 10000) / 10000,
        baselineMaia: Math.round(r.baselineMaia * 10000) / 10000,
        ewMaia: Math.round(r.ewMaia * 10000) / 10000,
        ewSF: Math.round(r.ewSF * 10000) / 10000,
      },
      moveRecommendations: {
        sfBestMove: r.sfBestMove,
        maiaMostLikely: r.maiaMostLikely,
        maiaMostLikelyProb: Math.round(r.maiaMostLikelyProb * 10000) / 10000,
        ewBestMove_SF: r.ewBestMove_SF,
        ewBestMoveValue_SF: Math.round(r.ewBestMoveValue_SF * 10000) / 10000,
        ewBestMove_Maia: r.ewBestMove_Maia,
        ewBestMoveValue_Maia: Math.round(r.ewBestMoveValue_Maia * 10000) / 10000,
      },
      // Per-move EW values for all explored candidate moves (using SF at leaves)
      moveEWValues_SF: Object.fromEntries(
        Object.entries(r.moveEWValues_SF).map(([move, ew]) => [
          move,
          Math.round(ew * 10000) / 10000,
        ])
      ),
      // Per-move EW values for all explored candidate moves (using Maia at leaves)
      moveEWValues_Maia: Object.fromEntries(
        Object.entries(r.moveEWValues_Maia).map(([move, ew]) => [
          move,
          Math.round(ew * 10000) / 10000,
        ])
      ),
      stats: {
        nodesExplored: r.nodesExplored,
        maxDepthReached: r.maxDepthReached,
        coverageAchieved: Math.round(r.coverageAchieved * 10000) / 10000,
        uniquePositions: r.uniquePositions,
        timeMs: r.timeMs,
        treeBuildMs: r.treeBuildMs,
        sfEvalMs: r.sfEvalMs,
      },
      tree: serializeTree(r.tree),
    })),
  };
}

/**
 * Save results to JSON file.
 */
function saveResults(
  results: PositionAnalysis[],
  config: Config,
  outputPath: string
): void {
  const data = serializeResults(results, config);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`${c.green}✓${c.reset} Results saved to: ${outputPath}`);
}

/**
 * Load FENs from a file (one FEN per line, optionally with name after |)
 * Format: FEN | Name (name is optional)
 * Lines starting with # are comments
 */
function loadFensFromFile(
  filePath: string
): Array<{ name: string; fen: string }> {
  const content = fs.readFileSync(filePath, "utf-8");
  const positions: Array<{ name: string; fen: string }> = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const parts = trimmed.split("|").map((p) => p.trim());
    const fen = parts[0];
    const name = parts[1] || `Position ${positions.length + 1}`;

    positions.push({ name, fen });
  }

  return positions;
}

// -----------------------------------------------------------------------------
// CLI argument parsing
// -----------------------------------------------------------------------------

interface ParsedArgs {
  config: Config;
  customFen: string | null;
  fensFile: string | null;
  outputFile: string | null;
  printTree: boolean;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  let customFen: string | null = null;
  let fensFile: string | null = null;
  let outputFile: string | null = null;
  const printTree = args.includes("--print-tree");

  const getArg = (name: string): string | undefined => {
    const idx = args.indexOf(name);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  // Parse configuration options
  if (getArg("--threshold"))
    config.probabilityThreshold = parseFloat(getArg("--threshold")!);
  if (getArg("--elo")) config.eloLevel = parseInt(getArg("--elo")!, 10);
  if (getArg("--sf-depth"))
    config.sfDepth = parseInt(getArg("--sf-depth")!, 10);
  if (getArg("--fen")) customFen = getArg("--fen")!;
  if (getArg("--fens-file")) fensFile = getArg("--fens-file")!;
  if (getArg("--output") || getArg("-o"))
    outputFile = getArg("--output") || getArg("-o")!;

  // Show help
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
${c.bright}Expected Winrate Methods Comparison${c.reset}

Compare four evaluation methods for chess positions:
1. Baseline Stockfish - SF winrate in the base position
2. Baseline Maia - Maia value in the base position
3. Expected WR (Maia) - Tree search with Maia probs + Maia leaf values
4. Expected WR (SF) - Tree search with Maia probs + SF leaf values

${c.bright}Usage:${c.reset}
  npx tsx scripts/compare-ew-methods.ts [options]

${c.bright}Options:${c.reset}
  --fen "FEN"          Analyze a specific position (in quotes)
  --fens-file FILE     Load positions from file (one FEN per line, optionally: FEN | Name)
  --output, -o FILE    Save results to JSON file (includes full trees)
  --threshold N        Min cumulative probability to explore (default: 0.01 = 1%)
  --elo N              Maia ELO level (default: 1500)
  --sf-depth N         Stockfish search depth (default: 10)
  --print-tree         Print probability tree for each position (for debugging)
  --help, -h           Show this help

${c.bright}Examples:${c.reset}
  npx tsx scripts/compare-ew-methods.ts
  npx tsx scripts/compare-ew-methods.ts --threshold 0.005 --sf-depth 12
  npx tsx scripts/compare-ew-methods.ts --fen "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"
  npx tsx scripts/compare-ew-methods.ts --fens-file positions.txt -o results.json

${c.bright}FENs file format:${c.reset}
  # This is a comment
  rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 | Starting position
  rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1 | After 1.e4
`);
    process.exit(0);
  }

  return { config, customFen, fensFile, outputFile, printTree };
}

// -----------------------------------------------------------------------------
// Main entry point
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(
    `${c.bright}${c.cyan}╔══════════════════════════════════════════════════════════╗${c.reset}`
  );
  console.log(
    `${c.bright}${c.cyan}║    Expected Winrate Methods Comparison                   ║${c.reset}`
  );
  console.log(
    `${c.bright}${c.cyan}╚══════════════════════════════════════════════════════════╝${c.reset}`
  );

  const { config, customFen, fensFile, outputFile, printTree } = parseArgs();

  // Display configuration
  console.log(`\n${c.dim}Configuration:${c.reset}`);
  console.log(`  Probability threshold: ${percent(config.probabilityThreshold)}`);
  console.log(`  ELO level: ${config.eloLevel}`);
  console.log(`  SF depth: ${config.sfDepth}`);
  if (outputFile) {
    console.log(`  Output file: ${outputFile}`);
  }

  // Initialize engines
  console.log(`\n${c.cyan}ℹ${c.reset} Initializing engines...`);

  const modelPath = path.resolve(process.cwd(), "public/maia2/maia_rapid.onnx");
  const maia = new NodeMaia(modelPath);
  await maia.init();
  console.log(`${c.green}✓${c.reset} Maia loaded`);

  const stockfish = new NodeStockfish();
  await stockfish.init();
  console.log(`${c.green}✓${c.reset} Stockfish loaded`);

  // Determine which positions to analyze (priority: fensFile > customFen > defaults)
  let positions: Array<{ name: string; fen: string }>;

  if (fensFile) {
    positions = loadFensFromFile(fensFile);
    console.log(
      `${c.green}✓${c.reset} Loaded ${positions.length} positions from ${fensFile}`
    );
  } else if (customFen) {
    positions = [{ name: "Custom position", fen: customFen }];
  } else {
    positions = TEST_POSITIONS;
  }

  // Analyze each position
  const results: PositionAnalysis[] = [];

  for (const pos of positions) {
    console.log(`\n${c.cyan}ℹ${c.reset} Analyzing: ${pos.name}...`);

    const result = await analyzePosition(
      maia,
      stockfish,
      pos.name,
      pos.fen,
      config
    );
    results.push(result);

    // Print the probability tree if requested (for debugging)
    if (printTree) {
      console.log(
        `\n${c.bright}${c.magenta}─── Probability Tree ───${c.reset}`
      );
      printProbabilityTree(result.tree, "", 4);
      console.log();
    }

    displayResult(result);
  }

  // Display summary if multiple positions
  if (results.length > 1) {
    displaySummary(results);
  }

  // Save results to file if requested
  if (outputFile) {
    saveResults(results, config, outputFile);
  }

  // Cleanup
  maia.destroy();
  stockfish.destroy();

  console.log(`\n${c.green}Done!${c.reset}\n`);
}

// Run the main function
main().catch((err) => {
  console.error(`${c.red}Error:${c.reset}`, err);
  process.exit(1);
});
