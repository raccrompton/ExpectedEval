#!/usr/bin/env npx tsx
/**
 * Maia Value Comparison Script
 *
 * This script compares two approaches to evaluating positions:
 *
 * 1. STATIC VALUE: Just call Maia's value head directly on the position
 *    - Fast, single inference
 *    - Value head trained on game outcomes
 *
 * 2. TREE-SEARCHED VALUE: Build a probability tree with Maia move probs,
 *    then evaluate leaves with Maia value head, and weight by probabilities
 *    - More computation (multiple inferences)
 *    - Explicit reasoning about likely continuations
 *
 * The question: Does tree search add meaningful accuracy, or is Maia's
 * static value already "good enough"?
 *
 * Usage:
 *   npx tsx scripts/compare-maia-values.ts
 *   npx tsx scripts/compare-maia-values.ts --depth 3
 *   npx tsx scripts/compare-maia-values.ts --threshold 0.1
 *
 * @example
 * npm run compare-maia
 */

import * as path from 'path'

// Import Node.js Maia implementation
import { NodeMaia } from '../src/core/engine/maia.node'

// Import chessops for move application
import { Chess } from 'chessops/chess'
import { parseFen, makeFen } from 'chessops/fen'
import { parseUci } from 'chessops/util'

// -----------------------------------------------------------------------------
// ANSI colors for pretty output
// -----------------------------------------------------------------------------
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

// -----------------------------------------------------------------------------
// Test positions - diverse set covering different game phases
// -----------------------------------------------------------------------------
const TEST_POSITIONS = [
  {
    name: 'Starting position',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  },
  {
    name: 'After 1.e4',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  },
  {
    name: 'Sicilian Defense (1.e4 c5)',
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  },
  {
    name: 'Italian Game',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
  },
  {
    name: "Queen's Gambit",
    fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 1 3',
  },
  {
    name: 'Middlegame - Complex',
    fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7',
  },
  {
    name: 'Middlegame - Attacking',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
  },
  {
    name: 'Endgame - Rook',
    fen: '8/5pk1/5p1p/8/8/5P1P/5PK1/4R3 w - - 0 1',
  },
  {
    name: 'Endgame - Pawn',
    fen: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1',
  },
  {
    name: 'Tactical - Pin',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
  },
]

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------
interface Config {
  // How many plies deep to search in tree mode
  maxDepth: number

  // Minimum probability to explore a move (prune below this)
  probabilityThreshold: number

  // ELO level for Maia predictions
  eloLevel: number
}

const DEFAULT_CONFIG: Config = {
  maxDepth: 2,
  probabilityThreshold: 0.05, // 5%
  eloLevel: 1500,
}

// -----------------------------------------------------------------------------
// Tree node structure for tracking the search
// -----------------------------------------------------------------------------
interface TreeNode {
  fen: string
  move: string | null // null for root
  probability: number // probability of reaching this node
  maiaValue: number | null // Maia's static value (from side-to-move perspective)
  normalizedValue: number | null // Value normalized to ROOT player's perspective
  children: TreeNode[]
}

// -----------------------------------------------------------------------------
// Core comparison logic
// -----------------------------------------------------------------------------

/**
 * Get whose turn it is from FEN
 */
function getTurn(fen: string): 'w' | 'b' {
  return fen.split(' ')[1] as 'w' | 'b'
}

/**
 * Apply a UCI move to a FEN and return the new FEN.
 */
function applyMove(fen: string, uciMove: string): string {
  const setup = parseFen(fen)
  if (setup.isErr) {
    throw new Error(`Invalid FEN: ${fen}`)
  }

  const chess = Chess.fromSetup(setup.value)
  if (chess.isErr) {
    throw new Error(`Invalid position: ${chess.error}`)
  }

  const pos = chess.value
  const move = parseUci(uciMove)
  if (!move) {
    throw new Error(`Invalid UCI move: ${uciMove}`)
  }

  pos.play(move)
  return makeFen(pos.toSetup())
}

/**
 * Build a probability tree using Maia predictions.
 *
 * At each node:
 * 1. Get Maia's move probabilities
 * 2. For moves above threshold, recursively expand
 * 3. Store Maia's value at each node
 * 4. Normalize values to root player's perspective
 *
 * IMPORTANT: Maia's value is always from the side-to-move's perspective.
 * We need to normalize all values to the ROOT player's perspective for
 * meaningful comparisons.
 */
async function buildTree(
  maia: NodeMaia,
  fen: string,
  config: Config,
  depth: number = 0,
  cumulativeProb: number = 1.0,
  rootTurn?: 'w' | 'b',
): Promise<TreeNode> {
  // Get Maia's prediction for this position
  const prediction = await maia.predict(fen, { eloLevel: config.eloLevel })

  // Track whose turn it was at the root
  const currentTurn = getTurn(fen)
  const actualRootTurn = rootTurn ?? currentTurn

  // Normalize value to root player's perspective
  // If it's root player's turn, value is correct as-is
  // If it's opponent's turn, flip the value (1 - value)
  const normalizedValue =
    currentTurn === actualRootTurn
      ? prediction.value
      : 1 - prediction.value

  const node: TreeNode = {
    fen,
    move: null,
    probability: cumulativeProb,
    maiaValue: prediction.value,
    normalizedValue,
    children: [],
  }

  // Stop if we've reached max depth
  if (depth >= config.maxDepth) {
    return node
  }

  // Expand children for significant moves
  const significantMoves = Object.entries(prediction.policy).filter(
    ([_, prob]) => prob >= config.probabilityThreshold,
  )

  for (const [move, prob] of significantMoves) {
    try {
      const childFen = applyMove(fen, move)
      const childCumulativeProb = cumulativeProb * prob

      // Only expand if cumulative probability is still significant
      if (childCumulativeProb >= config.probabilityThreshold * 0.1) {
        const childNode = await buildTree(
          maia,
          childFen,
          config,
          depth + 1,
          childCumulativeProb,
          actualRootTurn, // Pass down the root turn
        )
        childNode.move = move
        childNode.probability = childCumulativeProb
        node.children.push(childNode)
      }
    } catch {
      // Skip invalid moves (shouldn't happen but be safe)
      continue
    }
  }

  return node
}

/**
 * Calculate tree-searched expected value.
 *
 * Formula: Σ(leaf_value × leaf_prob) + Σ(node_value × uncovered_prob)
 *
 * - For leaves (nodes with no children), use their normalized value weighted by probability
 * - For internal nodes, account for "uncovered" probability mass (moves we didn't explore)
 *
 * IMPORTANT: Uses normalizedValue (from root player's perspective) not raw maiaValue
 */
function calculateTreeValue(node: TreeNode): number {
  // If this is a leaf node (no children), return weighted value
  if (node.children.length === 0) {
    return (node.normalizedValue ?? 0.5) * node.probability
  }

  // Sum up children's contributions
  let childSum = 0
  let exploredProb = 0

  for (const child of node.children) {
    childSum += calculateTreeValue(child)
    // Track how much probability mass we explored from this node
    exploredProb += child.probability / node.probability
  }

  // Account for unexplored probability mass at this node
  const unexploredProb = Math.max(0, 1 - exploredProb)
  const uncoveredMass = unexploredProb * node.probability
  const uncoveredContribution = (node.normalizedValue ?? 0.5) * uncoveredMass

  return childSum + uncoveredContribution
}

/**
 * Count total nodes in tree (for stats)
 */
function countNodes(node: TreeNode): number {
  let count = 1
  for (const child of node.children) {
    count += countNodes(child)
  }
  return count
}

/**
 * Compare static value vs tree-searched value for a position.
 */
async function comparePosition(
  maia: NodeMaia,
  name: string,
  fen: string,
  config: Config,
): Promise<{
  name: string
  staticValue: number
  treeValue: number
  difference: number
  nodeCount: number
  timeMs: number
}> {
  const start = Date.now()

  // Get static value (just one Maia call)
  const staticPrediction = await maia.predict(fen, { eloLevel: config.eloLevel })
  const staticValue = staticPrediction.value

  // Build tree and calculate tree-searched value
  const tree = await buildTree(maia, fen, config)
  const treeValue = calculateTreeValue(tree)

  const elapsed = Date.now() - start
  const nodeCount = countNodes(tree)

  return {
    name,
    staticValue,
    treeValue,
    difference: treeValue - staticValue,
    nodeCount,
    timeMs: elapsed,
  }
}

// -----------------------------------------------------------------------------
// CLI and main
// -----------------------------------------------------------------------------

function parseArgs(): Config {
  const args = process.argv.slice(2)
  const config = { ...DEFAULT_CONFIG }

  // Parse --depth
  const depthIdx = args.indexOf('--depth')
  if (depthIdx !== -1 && args[depthIdx + 1]) {
    config.maxDepth = parseInt(args[depthIdx + 1], 10)
  }

  // Parse --threshold
  const thresholdIdx = args.indexOf('--threshold')
  if (thresholdIdx !== -1 && args[thresholdIdx + 1]) {
    config.probabilityThreshold = parseFloat(args[thresholdIdx + 1])
  }

  // Parse --elo
  const eloIdx = args.indexOf('--elo')
  if (eloIdx !== -1 && args[eloIdx + 1]) {
    config.eloLevel = parseInt(args[eloIdx + 1], 10)
  }

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${colors.bright}Maia Value Comparison Script${colors.reset}

Compares Maia's static value head vs tree-searched expected value.

${colors.bright}Usage:${colors.reset}
  npx tsx scripts/compare-maia-values.ts [options]

${colors.bright}Options:${colors.reset}
  --depth N       Tree search depth (default: 2)
  --threshold N   Probability threshold to explore (default: 0.05)
  --elo N         ELO level for Maia (default: 1500)
  --help, -h      Show this help

${colors.bright}Example:${colors.reset}
  npx tsx scripts/compare-maia-values.ts --depth 3 --threshold 0.1
`)
    process.exit(0)
  }

  return config
}

async function main(): Promise<void> {
  console.log(
    `\n${colors.bright}${colors.cyan}╔══════════════════════════════════════════════════════════╗${colors.reset}`,
  )
  console.log(
    `${colors.bright}${colors.cyan}║   Maia Value Comparison: Static vs Tree-Searched         ║${colors.reset}`,
  )
  console.log(
    `${colors.bright}${colors.cyan}╚══════════════════════════════════════════════════════════╝${colors.reset}`,
  )

  const config = parseArgs()

  console.log(`\n${colors.dim}Configuration:${colors.reset}`)
  console.log(`  Max depth: ${config.maxDepth}`)
  console.log(`  Probability threshold: ${(config.probabilityThreshold * 100).toFixed(1)}%`)
  console.log(`  ELO level: ${config.eloLevel}`)

  // Initialize Maia
  const modelPath = path.resolve(process.cwd(), 'public/maia2/maia_rapid.onnx')
  console.log(`\n${colors.cyan}ℹ${colors.reset} Loading Maia model...`)

  const maia = new NodeMaia(modelPath)
  await maia.init()
  console.log(`${colors.green}✓${colors.reset} Maia loaded\n`)

  // Run comparisons
  console.log(
    `${colors.bright}${colors.blue}═══ Results ═══${colors.reset}\n`,
  )

  const results: Awaited<ReturnType<typeof comparePosition>>[] = []

  for (const pos of TEST_POSITIONS) {
    const result = await comparePosition(maia, pos.name, pos.fen, config)
    results.push(result)

    // Format difference with color
    const diffAbs = Math.abs(result.difference)
    const diffStr = (result.difference >= 0 ? '+' : '') + (result.difference * 100).toFixed(2) + '%'
    let diffColor = colors.dim
    if (diffAbs > 0.05) diffColor = colors.yellow
    if (diffAbs > 0.1) diffColor = colors.red

    console.log(`${colors.bright}${result.name}${colors.reset}`)
    console.log(
      `  Static:  ${(result.staticValue * 100).toFixed(1)}%` +
        `  │  Tree:  ${(result.treeValue * 100).toFixed(1)}%` +
        `  │  Diff: ${diffColor}${diffStr}${colors.reset}` +
        `  │  Nodes: ${result.nodeCount}` +
        `  │  ${result.timeMs}ms`,
    )
    console.log()
  }

  // Summary statistics
  console.log(
    `${colors.bright}${colors.blue}═══ Summary ═══${colors.reset}\n`,
  )

  const differences = results.map((r) => r.difference)
  const absDifferences = differences.map(Math.abs)

  const avgDiff = differences.reduce((a, b) => a + b, 0) / differences.length
  const avgAbsDiff = absDifferences.reduce((a, b) => a + b, 0) / absDifferences.length
  const maxAbsDiff = Math.max(...absDifferences)
  const minAbsDiff = Math.min(...absDifferences)

  console.log(`Average difference:     ${(avgDiff * 100).toFixed(2)}%`)
  console.log(`Average |difference|:   ${(avgAbsDiff * 100).toFixed(2)}%`)
  console.log(`Max |difference|:       ${(maxAbsDiff * 100).toFixed(2)}%`)
  console.log(`Min |difference|:       ${(minAbsDiff * 100).toFixed(2)}%`)

  // Interpretation
  console.log(`\n${colors.bright}Interpretation:${colors.reset}`)
  if (avgAbsDiff < 0.02) {
    console.log(
      `${colors.green}✓${colors.reset} Tree search makes very little difference (<2%).`,
    )
    console.log(`  Maia's static value head is likely "good enough" for most uses.`)
  } else if (avgAbsDiff < 0.05) {
    console.log(
      `${colors.yellow}~${colors.reset} Tree search makes a small difference (2-5%).`,
    )
    console.log(`  Tree search adds some value, but static evaluation is reasonable.`)
  } else {
    console.log(
      `${colors.red}!${colors.reset} Tree search makes a meaningful difference (>5%).`,
    )
    console.log(`  Explicit tree search significantly improves evaluation accuracy.`)
  }

  // Cleanup
  maia.destroy()

  console.log(`\n${colors.green}Done!${colors.reset}\n`)
}

main().catch((err) => {
  console.error(`${colors.red}Error:${colors.reset}`, err)
  process.exit(1)
})
