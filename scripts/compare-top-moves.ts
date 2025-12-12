#!/usr/bin/env npx tsx
/**
 * Compare Top Moves by Different Evaluation Methods
 *
 * Shows whether the four evaluation methods recommend different best moves:
 * 1. SF Baseline - Move with highest Stockfish eval
 * 2. Maia Baseline - Move with highest Maia probability (human-likely)
 * 3. EW(Maia) - Move with highest Expected Winrate using Maia leaf values
 * 4. EW(SF) - Move with highest Expected Winrate using SF leaf values
 */

import * as path from 'path'
import * as fs from 'fs'
import { NodeMaia } from '../src/core/engine/maia.node'
import { NodeStockfish } from '../src/core/engine/stockfish.node'
import { Chess } from 'chessops/chess'
import { parseFen, makeFen } from 'chessops/fen'
import { parseUci, makeUci } from 'chessops/util'

// ANSI colors
const c = {
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

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2)

  const getArg = (name: string): string | undefined => {
    const idx = args.indexOf(name)
    return idx !== -1 ? args[idx + 1] : undefined
  }

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${c.bright}Top Moves Comparison by Evaluation Method${c.reset}

Compare which move each evaluation method recommends:
1. SF Baseline - Move with highest Stockfish eval
2. Maia Baseline - Move humans most likely play
3. EW(Maia) - Best expected winrate using Maia leaf values
4. EW(SF) - Best expected winrate using SF leaf values

${c.bright}Usage:${c.reset}
  npx tsx scripts/compare-top-moves.ts [options]

${c.bright}Options:${c.reset}
  --fen "FEN"          Analyze a specific position
  --fens-file FILE     Load positions from file (FEN | Name per line)
  --output, -o FILE    Save results to JSON file
  --min-cumulative N   Min cumulative prob to explore (default: 0.02)
  --coverage N         Coverage target per node (default: 0.95)
  --elo N              Maia ELO level (default: 1500)
  --sf-depth N         Stockfish depth (default: 8)
  --top N              Show top N moves (default: 6)
  --help, -h           Show this help

${c.bright}Examples:${c.reset}
  npx tsx scripts/compare-top-moves.ts --fen "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
  npx tsx scripts/compare-top-moves.ts --fens-file test-positions.txt --min-cumulative 0.01
  npx tsx scripts/compare-top-moves.ts --fen "..." --sf-depth 12 --elo 1900
`)
    process.exit(0)
  }

  return {
    config: {
      minCumulativeProb: parseFloat(getArg('--min-cumulative') ?? '0.02'),
      coverageTarget: parseFloat(getArg('--coverage') ?? '0.95'),
      eloLevel: parseInt(getArg('--elo') ?? '1500', 10),
      sfDepth: parseInt(getArg('--sf-depth') ?? '8', 10),
    },
    customFen: getArg('--fen') ?? null,
    fensFile: getArg('--fens-file') ?? null,
    outputFile: getArg('--output') ?? getArg('-o') ?? null,
    topN: parseInt(getArg('--top') ?? '6', 10),
  }
}

// Configuration (will be set from CLI args)
let CONFIG = {
  minCumulativeProb: 0.02,
  coverageTarget: 0.95,
  eloLevel: 1500,
  sfDepth: 8,
}

// Tree node for EW calculation
interface TreeNode {
  fen: string
  move: string | null
  moveProb: number
  cumulativeProb: number
  maiaValue: number | null
  sfWinrate: number | null
  children: TreeNode[]
  isLeaf: boolean
  unexploredMass: number
}

// Result for a single move
interface MoveAnalysis {
  move: string
  sfEval: number        // Stockfish eval after this move
  maiaProb: number      // Maia probability of playing this move
  ewMaia: number        // Expected Winrate (Maia values) for this move's subtree
  ewSF: number          // Expected Winrate (SF values) for this move's subtree
  nodes: number         // Number of nodes in subtree
  maxDepth: number      // Max depth reached in subtree
}

// Utility functions
function getTurn(fen: string): 'w' | 'b' {
  return fen.split(' ')[1] as 'w' | 'b'
}

function applyMove(fen: string, uciMove: string): string {
  const setup = parseFen(fen)
  if (!setup.isOk) throw new Error(`Invalid FEN: ${fen}`)
  const chess = Chess.fromSetup(setup.value)
  if (!chess.isOk) throw new Error(`Invalid position`)
  const pos = chess.value
  const move = parseUci(uciMove)
  if (!move) throw new Error(`Invalid UCI move: ${uciMove}`)
  pos.play(move)
  return makeFen(pos.toSetup())
}

function percent(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

// Build probability tree for a single candidate move
async function buildSubtree(
  maia: NodeMaia,
  fen: string,
  rootTurn: 'w' | 'b',
  depth: number = 0,
  cumulativeProb: number = 1.0,
): Promise<TreeNode> {
  const maiaPrediction = await maia.predict(fen, { eloLevel: CONFIG.eloLevel })
  const normalizedMaiaValue = rootTurn === 'w' ? maiaPrediction.value : 1 - maiaPrediction.value

  const node: TreeNode = {
    fen,
    move: null,
    moveProb: 1.0,
    cumulativeProb,
    maiaValue: normalizedMaiaValue,
    sfWinrate: null,
    children: [],
    isLeaf: true,
    unexploredMass: 0,
  }

  if (cumulativeProb < CONFIG.minCumulativeProb) {
    return node
  }

  const significantMoves = Object.entries(maiaPrediction.policy)
    .filter(([_, prob]) => cumulativeProb * prob >= CONFIG.minCumulativeProb)
    .sort((a, b) => b[1] - a[1])

  let exploredProb = 0

  for (const [move, prob] of significantMoves) {
    if (exploredProb >= CONFIG.coverageTarget) break

    try {
      const childFen = applyMove(fen, move)
      const childCumulativeProb = cumulativeProb * prob
      const childNode = await buildSubtree(maia, childFen, rootTurn, depth + 1, childCumulativeProb)
      childNode.move = move
      childNode.moveProb = prob
      childNode.cumulativeProb = childCumulativeProb
      node.children.push(childNode)
      node.isLeaf = false
      exploredProb += prob
    } catch {
      continue
    }
  }

  node.unexploredMass = Math.max(0, 1 - exploredProb) * cumulativeProb
  return node
}

// Collect positions for SF evaluation
function collectPositions(node: TreeNode, positions: Set<string> = new Set()): Set<string> {
  if (node.isLeaf || node.unexploredMass > 0) {
    positions.add(node.fen)
  }
  for (const child of node.children) {
    collectPositions(child, positions)
  }
  return positions
}

// Populate SF winrates in tree
function populateSFWinrates(
  node: TreeNode,
  sfResults: Map<string, number>,
  rootTurn: 'w' | 'b',
): void {
  const currentTurn = getTurn(node.fen)
  const sfWinrate = sfResults.get(node.fen)
  if (sfWinrate !== undefined) {
    node.sfWinrate = currentTurn === rootTurn ? sfWinrate : 1 - sfWinrate
  }
  for (const child of node.children) {
    populateSFWinrates(child, sfResults, rootTurn)
  }
}

// Calculate EW using Maia values
function calculateEW_Maia(node: TreeNode): number {
  if (node.isLeaf || node.children.length === 0) {
    return (node.maiaValue ?? 0.5) * node.cumulativeProb
  }
  let total = 0
  for (const child of node.children) {
    total += calculateEW_Maia(child)
  }
  total += (node.maiaValue ?? 0.5) * node.unexploredMass
  return total
}

// Calculate EW using SF values
function calculateEW_SF(node: TreeNode): number {
  if (node.isLeaf || node.children.length === 0) {
    return (node.sfWinrate ?? 0.5) * node.cumulativeProb
  }
  let total = 0
  for (const child of node.children) {
    total += calculateEW_SF(child)
  }
  total += (node.sfWinrate ?? 0.5) * node.unexploredMass
  return total
}

// Count nodes in tree
function countNodes(node: TreeNode): number {
  let count = 1
  for (const child of node.children) {
    count += countNodes(child)
  }
  return count
}

// Find max depth in tree
function findMaxDepth(node: TreeNode): number {
  if (node.children.length === 0) return 0
  return 1 + Math.max(...node.children.map(findMaxDepth))
}

// Analyze all candidate moves for a position
async function analyzePosition(
  maia: NodeMaia,
  stockfish: NodeStockfish,
  name: string,
  fen: string,
): Promise<{ name: string; fen: string; moves: MoveAnalysis[] }> {
  const rootTurn = getTurn(fen)

  // Get Maia predictions for the root position
  const maiaPrediction = await maia.predict(fen, { eloLevel: CONFIG.eloLevel })

  // Get SF evaluation for all moves
  const sfResult = await stockfish.evaluate(fen, { depth: CONFIG.sfDepth, multiPv: 10 })

  // Get top moves by Maia probability (top 5)
  const topMaiaMovesRaw = Object.entries(maiaPrediction.policy)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Combine unique moves from both SF and Maia top lists
  const candidateMoves = new Set<string>()
  for (const [move] of topMaiaMovesRaw) {
    candidateMoves.add(move)
  }
  // Add SF top moves if available
  if (sfResult.moveWinrates) {
    const sfTopMoves = Object.entries(sfResult.moveWinrates)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    for (const [move] of sfTopMoves) {
      candidateMoves.add(move)
    }
  }

  const moveAnalyses: MoveAnalysis[] = []
  const allPositionsToEval = new Set<string>()

  // Build subtrees for each candidate move
  const subtrees = new Map<string, TreeNode>()

  for (const move of candidateMoves) {
    try {
      const childFen = applyMove(fen, move)
      const subtree = await buildSubtree(maia, childFen, rootTurn, 1, 1.0)
      subtree.move = move
      subtrees.set(move, subtree)

      // Collect positions needing SF eval
      collectPositions(subtree, allPositionsToEval)
      allPositionsToEval.add(childFen) // Also need the immediate child position
    } catch {
      continue
    }
  }

  // Batch evaluate all positions with SF
  const sfResults = new Map<string, number>()
  for (const evalFen of allPositionsToEval) {
    const result = await stockfish.evaluate(evalFen, { depth: CONFIG.sfDepth })
    sfResults.set(evalFen, result.winrate)
  }

  // Calculate metrics for each move
  for (const move of candidateMoves) {
    const subtree = subtrees.get(move)
    if (!subtree) continue

    const childFen = applyMove(fen, move)
    const childTurn = getTurn(childFen)

    // SF eval for this move (from root player's perspective)
    const sfEvalRaw = sfResults.get(childFen) ?? 0.5
    const sfEval = childTurn === rootTurn ? sfEvalRaw : 1 - sfEvalRaw

    // Maia probability
    const maiaProb = maiaPrediction.policy[move] ?? 0

    // Populate SF winrates in subtree
    populateSFWinrates(subtree, sfResults, rootTurn)

    // Calculate EW for this move's subtree
    const ewMaia = calculateEW_Maia(subtree)
    const ewSF = calculateEW_SF(subtree)

    moveAnalyses.push({
      move,
      sfEval,
      maiaProb,
      ewMaia,
      ewSF,
      nodes: countNodes(subtree),
      maxDepth: findMaxDepth(subtree),
    })
  }

  // Sort by EW(SF) for display
  moveAnalyses.sort((a, b) => b.ewSF - a.ewSF)

  return { name, fen, moves: moveAnalyses }
}

// Display results
function displayResults(result: { name: string; fen: string; moves: MoveAnalysis[] }, topN: number = 6): void {
  console.log(`\n${c.bright}${c.blue}═══ ${result.name} ═══${c.reset}`)
  console.log(`${c.dim}FEN: ${result.fen}${c.reset}\n`)

  // Find best move by each method
  const bestBySF = [...result.moves].sort((a, b) => b.sfEval - a.sfEval)[0]
  const bestByMaia = [...result.moves].sort((a, b) => b.maiaProb - a.maiaProb)[0]
  const bestByEWMaia = [...result.moves].sort((a, b) => b.ewMaia - a.ewMaia)[0]
  const bestByEWSF = [...result.moves].sort((a, b) => b.ewSF - a.ewSF)[0]

  // Header
  console.log(`${c.bright}Top Moves Comparison:${c.reset}`)
  console.log('─'.repeat(90))
  console.log(
    `${'Move'.padEnd(8)} ${'SF Eval'.padStart(10)} ${'Maia Prob'.padStart(11)} ${'EW(Maia)'.padStart(10)} ${'EW(SF)'.padStart(10)} ${'Nodes'.padStart(6)} ${'Depth'.padStart(6)}   Best By`
  )
  console.log('─'.repeat(90))

  for (const m of result.moves.slice(0, topN)) {
    const badges: string[] = []
    if (m.move === bestBySF?.move) badges.push(`${c.cyan}SF${c.reset}`)
    if (m.move === bestByMaia?.move) badges.push(`${c.magenta}Maia${c.reset}`)
    if (m.move === bestByEWMaia?.move) badges.push(`${c.yellow}EW(M)${c.reset}`)
    if (m.move === bestByEWSF?.move) badges.push(`${c.green}EW(S)${c.reset}`)

    const badgeStr = badges.length > 0 ? badges.join(' ') : ''

    console.log(
      `${m.move.padEnd(8)} ${percent(m.sfEval).padStart(10)} ${percent(m.maiaProb).padStart(11)} ${percent(m.ewMaia).padStart(10)} ${percent(m.ewSF).padStart(10)} ${m.nodes.toString().padStart(6)} ${m.maxDepth.toString().padStart(6)}   ${badgeStr}`
    )
  }
  console.log('─'.repeat(90))

  // Summary: Do methods agree?
  const allSame = bestBySF?.move === bestByMaia?.move &&
                  bestByMaia?.move === bestByEWMaia?.move &&
                  bestByEWMaia?.move === bestByEWSF?.move

  const ewAgree = bestByEWMaia?.move === bestByEWSF?.move
  const baselineAgree = bestBySF?.move === bestByMaia?.move

  console.log(`\n${c.bright}Best Move by Method:${c.reset}`)
  console.log(`  ${c.cyan}SF Baseline:${c.reset}  ${bestBySF?.move} (${percent(bestBySF?.sfEval ?? 0)})`)
  console.log(`  ${c.magenta}Maia (human):${c.reset} ${bestByMaia?.move} (${percent(bestByMaia?.maiaProb ?? 0)} prob)`)
  console.log(`  ${c.yellow}EW(Maia):${c.reset}     ${bestByEWMaia?.move} (${percent(bestByEWMaia?.ewMaia ?? 0)})`)
  console.log(`  ${c.green}EW(SF):${c.reset}       ${bestByEWSF?.move} (${percent(bestByEWSF?.ewSF ?? 0)})`)

  if (allSame) {
    console.log(`\n  ${c.green}✓ All methods agree on best move: ${bestBySF?.move}${c.reset}`)
  } else if (ewAgree && !baselineAgree) {
    console.log(`\n  ${c.yellow}⚡ EW methods agree (${bestByEWSF?.move}), but baselines differ${c.reset}`)
  } else if (!ewAgree && baselineAgree) {
    console.log(`\n  ${c.yellow}⚡ Baselines agree (${bestBySF?.move}), but EW methods differ${c.reset}`)
  } else {
    console.log(`\n  ${c.red}✗ Methods disagree on best move${c.reset}`)
  }
}

// Result type for JSON output
interface PositionResult {
  name: string
  fen: string
  moves: MoveAnalysis[]
  bestMoves: {
    sfBaseline: string
    maiaBaseline: string
    ewMaia: string
    ewSF: string
  }
  agreement: 'all' | 'ew_only' | 'baseline_only' | 'none'
}

// Save results to JSON
function saveResults(
  results: PositionResult[],
  config: typeof CONFIG,
  outputPath: string,
): void {
  const data = {
    timestamp: new Date().toISOString(),
    config: {
      minCumulativeProb: config.minCumulativeProb,
      coverageTarget: config.coverageTarget,
      eloLevel: config.eloLevel,
      sfDepth: config.sfDepth,
    },
    positions: results,
  }
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2))
  console.log(`${c.green}✓${c.reset} Results saved to: ${outputPath}`)
}

// Main
async function main(): Promise<void> {
  const { config, customFen, fensFile, outputFile, topN } = parseArgs()

  // Set global config from CLI args
  CONFIG = config

  console.log(`${c.bright}${c.cyan}╔══════════════════════════════════════════════════════════╗${c.reset}`)
  console.log(`${c.bright}${c.cyan}║    Top Moves Comparison by Evaluation Method             ║${c.reset}`)
  console.log(`${c.bright}${c.cyan}╚══════════════════════════════════════════════════════════╝${c.reset}`)

  // Display configuration
  console.log(`\n${c.dim}Configuration:${c.reset}`)
  console.log(`  Min cumulative prob: ${percent(CONFIG.minCumulativeProb)}`)
  console.log(`  Coverage target: ${percent(CONFIG.coverageTarget)}`)
  console.log(`  ELO level: ${CONFIG.eloLevel}`)
  console.log(`  SF depth: ${CONFIG.sfDepth}`)

  // Initialize engines
  console.log(`\n${c.cyan}ℹ${c.reset} Initializing engines...`)

  const modelPath = path.resolve(process.cwd(), 'public/maia2/maia_rapid.onnx')
  const maia = new NodeMaia(modelPath)
  await maia.init()
  console.log(`${c.green}✓${c.reset} Maia loaded`)

  const stockfish = new NodeStockfish()
  await stockfish.init()
  console.log(`${c.green}✓${c.reset} Stockfish loaded`)

  // Determine positions to analyze (priority: customFen > fensFile > defaults)
  let positions: Array<{ name: string; fen: string }>

  if (customFen) {
    positions = [{ name: 'Custom position', fen: customFen }]
  } else if (fensFile) {
    const content = fs.readFileSync(fensFile, 'utf-8')
    positions = []
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const parts = trimmed.split('|').map(p => p.trim())
      positions.push({ name: parts[1] || `Position ${positions.length + 1}`, fen: parts[0] })
    }
    console.log(`${c.green}✓${c.reset} Loaded ${positions.length} positions from ${fensFile}`)
  } else {
    // Default test positions
    positions = [
      { name: 'Starting position', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
      { name: 'Sicilian Defense', fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2' },
    ]
  }

  // Analyze each position
  const allResults: PositionResult[] = []

  for (const pos of positions) {
    console.log(`\n${c.cyan}ℹ${c.reset} Analyzing: ${pos.name}...`)
    const result = await analyzePosition(maia, stockfish, pos.name, pos.fen)
    displayResults(result, topN)

    // Collect for JSON output
    if (outputFile) {
      const bestBySF = [...result.moves].sort((a, b) => b.sfEval - a.sfEval)[0]
      const bestByMaia = [...result.moves].sort((a, b) => b.maiaProb - a.maiaProb)[0]
      const bestByEWMaia = [...result.moves].sort((a, b) => b.ewMaia - a.ewMaia)[0]
      const bestByEWSF = [...result.moves].sort((a, b) => b.ewSF - a.ewSF)[0]

      const allSame = bestBySF?.move === bestByMaia?.move &&
                      bestByMaia?.move === bestByEWMaia?.move &&
                      bestByEWMaia?.move === bestByEWSF?.move
      const ewAgree = bestByEWMaia?.move === bestByEWSF?.move
      const baselineAgree = bestBySF?.move === bestByMaia?.move

      allResults.push({
        name: result.name,
        fen: result.fen,
        moves: result.moves,
        bestMoves: {
          sfBaseline: bestBySF?.move ?? '',
          maiaBaseline: bestByMaia?.move ?? '',
          ewMaia: bestByEWMaia?.move ?? '',
          ewSF: bestByEWSF?.move ?? '',
        },
        agreement: allSame ? 'all' : ewAgree ? 'ew_only' : baselineAgree ? 'baseline_only' : 'none',
      })
    }
  }

  // Save results if output file specified
  if (outputFile) {
    saveResults(allResults, CONFIG, outputFile)
  }

  // Cleanup
  maia.destroy()
  stockfish.destroy()
  console.log(`\n${c.green}Done!${c.reset}\n`)
}

main().catch(err => {
  console.error(`${c.red}Error:${c.reset}`, err)
  process.exit(1)
})
