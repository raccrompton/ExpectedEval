#!/usr/bin/env npx tsx
/**
 * Expected Winrate Test Script - Test EW algorithm in Node.js
 *
 * This script tests the full Expected Winrate algorithm with real
 * Node.js engines (Stockfish + Maia) to generate baseline values
 * for browser comparison.
 *
 * Usage:
 *   npx tsx scripts/test-ew.ts              # Test EW for starting position
 *   npx tsx scripts/test-ew.ts --verbose    # Show detailed output
 *   npx tsx scripts/test-ew.ts --fen "..."  # Test with custom FEN
 *
 * Requirements:
 *   - Maia model file at: public/maia2/maia_rapid.onnx
 *   - Stockfish binary in PATH (install via: brew install stockfish)
 *
 * @example
 * # Run EW test
 * npm run test:ew
 */

import * as path from 'path'
import * as fs from 'fs'

// Import Node.js engine implementations
import { NodeMaia } from '../src/core/engine/maia.node'
import { NodeStockfish } from '../src/core/engine/stockfish.node'

// Import EW algorithm
import { calculateExpectedWinrate } from '../src/core/analysis/expectedWinrate'

// ANSI color codes for pretty output
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

function success(msg: string): void {
  console.log(`${colors.green}✓${colors.reset} ${msg}`)
}

function error(msg: string): void {
  console.log(`${colors.red}✗${colors.reset} ${msg}`)
}

function info(msg: string): void {
  console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`)
}

function header(msg: string): void {
  console.log(`\n${colors.bright}${colors.magenta}═══ ${msg} ═══${colors.reset}\n`)
}

function percent(n: number | null): string {
  if (n === null) return '—'
  return `${(n * 100).toFixed(1)}%`
}

/**
 * Test positions - same as verify-engines.tsx
 */
const TEST_POSITIONS = [
  {
    name: 'Starting Position',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    description: 'Initial chess position - White to move',
  },
  {
    name: 'After 1.e4',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    description: 'Position after 1.e4 - Black to move',
  },
  {
    name: 'Italian Game',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    description: 'Italian Game position - White to move',
  },
  {
    name: 'Sicilian Defense',
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
    description: 'Sicilian Defense - White to move',
  },
]

/**
 * EW configuration - same as verify-engines.tsx
 */
const EW_CONFIG = {
  maxDepth: 2,
  maxCandidates: 3,
  stockfishDepth: 10,
  probabilityThreshold: 0.10,
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
  verbose: boolean
  customFen: string | null
  positionIndex: number | null
} {
  const args = process.argv.slice(2)
  let verbose = false
  let customFen: string | null = null
  let positionIndex: number | null = null

  if (args.includes('--verbose') || args.includes('-v')) {
    verbose = true
  }

  const fenIndex = args.indexOf('--fen')
  if (fenIndex !== -1 && args[fenIndex + 1]) {
    customFen = args[fenIndex + 1]
  }

  const posIndex = args.indexOf('--position')
  if (posIndex !== -1 && args[posIndex + 1]) {
    positionIndex = parseInt(args[posIndex + 1], 10)
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${colors.bright}Expected Winrate Test Script${colors.reset}

Test the EW algorithm in Node.js environment.

${colors.bright}Usage:${colors.reset}
  npx tsx scripts/test-ew.ts [options]

${colors.bright}Options:${colors.reset}
  --verbose, -v       Show detailed output
  --fen "..."         Test with a custom FEN position
  --position N        Test only position N (0-3)
  --help, -h          Show this help message

${colors.bright}Examples:${colors.reset}
  npx tsx scripts/test-ew.ts
  npx tsx scripts/test-ew.ts --verbose
  npx tsx scripts/test-ew.ts --position 0
`)
    process.exit(0)
  }

  return { verbose, customFen, positionIndex }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log(
    `\n${colors.bright}${colors.magenta}╔══════════════════════════════════════════╗${colors.reset}`,
  )
  console.log(
    `${colors.bright}${colors.magenta}║   Expected Winrate Algorithm Test        ║${colors.reset}`,
  )
  console.log(
    `${colors.bright}${colors.magenta}╚══════════════════════════════════════════╝${colors.reset}`,
  )

  const { verbose, customFen, positionIndex } = parseArgs()

  // Initialize engines
  header('Initializing Engines')

  const modelPath = path.resolve(process.cwd(), 'public/maia2/maia_rapid.onnx')
  if (!fs.existsSync(modelPath)) {
    error(`Model file not found at: ${modelPath}`)
    process.exit(1)
  }

  const maia = new NodeMaia(modelPath)
  const stockfish = new NodeStockfish()

  info('Initializing Maia...')
  await maia.init()
  success('Maia initialized')

  info('Initializing Stockfish...')
  await stockfish.init()
  success('Stockfish initialized')

  // Build test positions
  let positions = [...TEST_POSITIONS]
  if (customFen) {
    positions = [{
      name: 'Custom position',
      fen: customFen,
      description: 'User-provided FEN',
    }]
  } else if (positionIndex !== null && positionIndex >= 0 && positionIndex < TEST_POSITIONS.length) {
    positions = [TEST_POSITIONS[positionIndex]]
  }

  // Run EW algorithm for each position
  header('Running Expected Winrate Algorithm')

  info(`Config: maxDepth=${EW_CONFIG.maxDepth}, maxCandidates=${EW_CONFIG.maxCandidates}, sfDepth=${EW_CONFIG.stockfishDepth}`)

  const results: Array<{
    name: string
    fen: string
    bestMove: string
    bestMoveSan: string
    expectedWinrate: number | null
    stockfishWinrate: number | null
    candidateCount: number
    calculationTimeMs: number
  }> = []

  for (const pos of positions) {
    console.log(`\n${colors.dim}Testing: ${pos.name}${colors.reset}`)
    if (verbose) {
      console.log(`  FEN: ${pos.fen}`)
    }

    try {
      const start = Date.now()
      const result = await calculateExpectedWinrate(
        pos.fen,
        EW_CONFIG,
        stockfish,
        maia,
        verbose ? (progress) => {
          console.log(`  [${progress.phase}] ${progress.message}`)
        } : undefined
      )
      const elapsed = Date.now() - start

      const best = result.candidates[0]

      success(`${pos.name}: ${elapsed}ms`)
      console.log(`    Best Move: ${best.san} (${best.move})`)
      console.log(`    Expected Winrate: ${percent(best.expectedWinrateSF)}`)
      console.log(`    Stockfish Winrate: ${percent(best.stockfishWinrate)}`)
      console.log(`    Candidates: ${result.candidates.length}`)

      if (verbose) {
        console.log(`    All candidates:`)
        for (const c of result.candidates) {
          console.log(`      - ${c.san}: EW=${percent(c.expectedWinrateSF)}, SF=${percent(c.stockfishWinrate)}, prob=${percent(c.probability)}`)
        }
      }

      results.push({
        name: pos.name,
        fen: pos.fen,
        bestMove: best.move,
        bestMoveSan: best.san,
        expectedWinrate: best.expectedWinrateSF,
        stockfishWinrate: best.stockfishWinrate,
        candidateCount: result.candidates.length,
        calculationTimeMs: elapsed,
      })
    } catch (err) {
      error(`${pos.name}: ${err}`)
    }
  }

  // Cleanup
  maia.destroy()
  stockfish.destroy()

  // Print baseline data for copy-paste into verify-engines.tsx
  header('Baseline Data for verify-engines.tsx')

  console.log('const EXPECTED_EW_BY_POSITION = [')
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    console.log(`  // Position ${i}: ${r.name}`)
    console.log(`  {`)
    console.log(`    nodeJsResult: {`)
    console.log(`      bestMove: '${r.bestMove}',`)
    console.log(`      bestMoveSan: '${r.bestMoveSan}',`)
    console.log(`      expectedWinrate: ${r.expectedWinrate?.toFixed(3) ?? 'null'},`)
    console.log(`      stockfishWinrate: ${r.stockfishWinrate?.toFixed(3) ?? 'null'},`)
    console.log(`      candidateCount: ${r.candidateCount},`)
    console.log(`    },`)
    console.log(`  },`)
  }
  console.log(']')

  // Summary
  header('Summary')
  success(`Tested ${results.length} positions`)
  console.log(`\n${colors.green}${colors.bright}EW algorithm test complete!${colors.reset}\n`)
}

// Run main
main().catch((err) => {
  error(`Unexpected error: ${err}`)
  process.exit(1)
})
