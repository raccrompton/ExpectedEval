#!/usr/bin/env npx tsx
/**
 * Engine Test Script - Verify Stockfish and Maia work in Node.js
 *
 * This script tests the Node.js engine implementations to verify that
 * Phase 2 (Engine Integration) is working correctly without needing
 * a browser.
 *
 * Usage:
 *   npx tsx scripts/test-engines.ts              # Test both engines
 *   npx tsx scripts/test-engines.ts --maia       # Test only Maia
 *   npx tsx scripts/test-engines.ts --stockfish  # Test only Stockfish
 *   npx tsx scripts/test-engines.ts --fen "..."  # Test with custom FEN
 *
 * Requirements:
 *   - Maia model file at: public/maia2/maia_rapid.onnx
 *   - Stockfish binary in PATH (install via: brew install stockfish)
 *
 * Exit codes:
 *   0 - All tests passed
 *   1 - Some tests failed
 *
 * @example
 * # Run all tests
 * npm run test:engines
 *
 * # Test with a specific position
 * npx tsx scripts/test-engines.ts --fen "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4"
 */

import * as path from 'path'
import * as fs from 'fs'

// Import Node.js engine implementations
import { NodeMaia } from '../src/core/engine/maia.node'
import { NodeStockfish } from '../src/core/engine/stockfish.node'

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
}

/**
 * Pretty print a success message
 */
function success(msg: string): void {
  console.log(`${colors.green}✓${colors.reset} ${msg}`)
}

/**
 * Pretty print an error message
 */
function error(msg: string): void {
  console.log(`${colors.red}✗${colors.reset} ${msg}`)
}

/**
 * Pretty print an info message
 */
function info(msg: string): void {
  console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`)
}

/**
 * Pretty print a section header
 */
function header(msg: string): void {
  console.log(`\n${colors.bright}${colors.blue}═══ ${msg} ═══${colors.reset}\n`)
}

/**
 * Format a number as percentage
 */
function percent(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

/**
 * Test positions to evaluate
 */
const TEST_POSITIONS = [
  {
    name: 'Starting position',
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
 * Parse command line arguments
 */
function parseArgs(): {
  testMaia: boolean
  testStockfish: boolean
  customFen: string | null
  verbose: boolean
} {
  const args = process.argv.slice(2)

  // Default: test both
  let testMaia = true
  let testStockfish = true
  let customFen: string | null = null
  let verbose = false

  // Check for specific flags
  if (args.includes('--maia') || args.includes('-m')) {
    testMaia = true
    testStockfish = false
  }
  if (args.includes('--stockfish') || args.includes('-s')) {
    testMaia = false
    testStockfish = true
  }
  if (args.includes('--both') || args.includes('-b')) {
    testMaia = true
    testStockfish = true
  }
  if (args.includes('--verbose') || args.includes('-v')) {
    verbose = true
  }

  // Check for custom FEN
  const fenIndex = args.indexOf('--fen')
  if (fenIndex !== -1 && args[fenIndex + 1]) {
    customFen = args[fenIndex + 1]
  }

  // Help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${colors.bright}Engine Test Script${colors.reset}

Test Stockfish and Maia engines in Node.js environment.

${colors.bright}Usage:${colors.reset}
  npx tsx scripts/test-engines.ts [options]

${colors.bright}Options:${colors.reset}
  --maia, -m        Test only Maia engine
  --stockfish, -s   Test only Stockfish engine
  --both, -b        Test both engines (default)
  --fen "..."       Test with a custom FEN position
  --verbose, -v     Show detailed output
  --help, -h        Show this help message

${colors.bright}Examples:${colors.reset}
  npx tsx scripts/test-engines.ts
  npx tsx scripts/test-engines.ts --maia --verbose
  npx tsx scripts/test-engines.ts --fen "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"

${colors.bright}Requirements:${colors.reset}
  - Maia: Model file at public/maia2/maia_rapid.onnx
  - Stockfish: Binary in PATH (brew install stockfish)
`)
    process.exit(0)
  }

  return { testMaia, testStockfish, customFen, verbose }
}

/**
 * Test the Maia engine
 */
async function testMaia(
  positions: typeof TEST_POSITIONS,
  verbose: boolean,
): Promise<boolean> {
  header('Testing Maia Engine (onnxruntime-node)')

  // Check if model file exists
  const modelPath = path.resolve(
    process.cwd(),
    'public/maia2/maia_rapid.onnx',
  )

  if (!fs.existsSync(modelPath)) {
    error(`Model file not found at: ${modelPath}`)
    info('Make sure the Maia ONNX model is in public/maia2/maia_rapid.onnx')
    return false
  }

  info(`Model path: ${modelPath}`)
  const fileSize = fs.statSync(modelPath).size
  info(`Model size: ${(fileSize / 1024 / 1024).toFixed(1)} MB`)

  // Initialize Maia
  const maia = new NodeMaia(modelPath)

  try {
    info('Initializing Maia...')
    const initStart = Date.now()
    await maia.init()
    const initTime = Date.now() - initStart
    success(`Maia initialized in ${initTime}ms`)

    // Test each position
    let allPassed = true
    for (const pos of positions) {
      console.log(`\n${colors.dim}Testing: ${pos.name}${colors.reset}`)
      if (verbose) {
        console.log(`  FEN: ${pos.fen}`)
        console.log(`  ${pos.description}`)
      }

      try {
        const start = Date.now()
        const result = await maia.predict(pos.fen, { eloLevel: 1500 })
        const elapsed = Date.now() - start

        // Get top 3 moves
        const topMoves = Object.entries(result.policy)
          .slice(0, 3)
          .map(([move, prob]) => `${move} (${percent(prob)})`)
          .join(', ')

        success(`${pos.name}: ${elapsed}ms`)
        console.log(`    Win probability: ${percent(result.value)}`)
        console.log(`    Top moves: ${topMoves}`)

        // Sanity checks
        if (Object.keys(result.policy).length === 0) {
          error('  No moves returned!')
          allPassed = false
        }

        // Check probabilities sum to ~1
        const totalProb = Object.values(result.policy).reduce(
          (a, b) => a + b,
          0,
        )
        if (Math.abs(totalProb - 1.0) > 0.01) {
          error(`  Probabilities don't sum to 1: ${totalProb}`)
          allPassed = false
        }
      } catch (err) {
        error(`${pos.name}: ${err}`)
        allPassed = false
      }
    }

    // Cleanup
    maia.destroy()

    return allPassed
  } catch (err) {
    error(`Maia initialization failed: ${err}`)
    return false
  }
}

/**
 * Test the Stockfish engine
 */
async function testStockfish(
  positions: typeof TEST_POSITIONS,
  verbose: boolean,
): Promise<boolean> {
  header('Testing Stockfish Engine (child process)')

  // Initialize Stockfish
  const sf = new NodeStockfish()

  try {
    info('Initializing Stockfish...')
    const initStart = Date.now()
    await sf.init()
    const initTime = Date.now() - initStart
    success(`Stockfish initialized in ${initTime}ms`)

    // Test each position
    let allPassed = true
    const testDepth = 10 // Lower depth for faster testing

    for (const pos of positions) {
      console.log(`\n${colors.dim}Testing: ${pos.name}${colors.reset}`)
      if (verbose) {
        console.log(`  FEN: ${pos.fen}`)
        console.log(`  ${pos.description}`)
      }

      try {
        const start = Date.now()
        const result = await sf.evaluate(pos.fen, { depth: testDepth })
        const elapsed = Date.now() - start

        // Format evaluation
        const evalStr = result.isMate
          ? `Mate in ${result.mateIn}`
          : `${result.cp > 0 ? '+' : ''}${(result.cp / 100).toFixed(2)}`

        success(`${pos.name}: ${elapsed}ms`)
        console.log(`    Best move: ${result.bestMove}`)
        console.log(`    Evaluation: ${evalStr} (${percent(result.winrate)} win)`)
        console.log(`    Depth: ${result.depth}`)

        if (verbose && result.moveEvaluations) {
          // Show top 3 moves
          const topMoves = Object.entries(result.moveEvaluations)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([move, cp]) => `${move} (${cp > 0 ? '+' : ''}${cp})`)
            .join(', ')
          console.log(`    Top moves: ${topMoves}`)
        }

        // Sanity checks
        if (!result.bestMove) {
          error('  No best move returned!')
          allPassed = false
        }
      } catch (err) {
        error(`${pos.name}: ${err}`)
        allPassed = false
      }
    }

    // Cleanup
    sf.destroy()

    return allPassed
  } catch (err) {
    error(`Stockfish initialization failed: ${err}`)
    info(
      'Make sure Stockfish is installed: brew install stockfish (macOS) or apt install stockfish (Linux)',
    )
    return false
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log(
    `\n${colors.bright}${colors.cyan}╔══════════════════════════════════════════╗${colors.reset}`,
  )
  console.log(
    `${colors.bright}${colors.cyan}║     Engine Integration Test Suite        ║${colors.reset}`,
  )
  console.log(
    `${colors.bright}${colors.cyan}╚══════════════════════════════════════════╝${colors.reset}`,
  )

  const { testMaia: shouldTestMaia, testStockfish: shouldTestStockfish, customFen, verbose } =
    parseArgs()

  // Build test positions
  let positions = [...TEST_POSITIONS]
  if (customFen) {
    positions = [
      {
        name: 'Custom position',
        fen: customFen,
        description: 'User-provided FEN',
      },
    ]
  }

  let maiaOk = true
  let sfOk = true

  // Run tests
  if (shouldTestMaia) {
    maiaOk = await testMaia(positions, verbose)
  }

  if (shouldTestStockfish) {
    sfOk = await testStockfish(positions, verbose)
  }

  // Summary
  header('Summary')

  if (shouldTestMaia) {
    if (maiaOk) {
      success('Maia: All tests passed')
    } else {
      error('Maia: Some tests failed')
    }
  }

  if (shouldTestStockfish) {
    if (sfOk) {
      success('Stockfish: All tests passed')
    } else {
      error('Stockfish: Some tests failed')
    }
  }

  // Exit with appropriate code
  const allPassed = maiaOk && sfOk
  if (allPassed) {
    console.log(
      `\n${colors.green}${colors.bright}All engine tests passed!${colors.reset}\n`,
    )
    process.exit(0)
  } else {
    console.log(
      `\n${colors.red}${colors.bright}Some engine tests failed.${colors.reset}\n`,
    )
    process.exit(1)
  }
}

// Run main
main().catch((err) => {
  error(`Unexpected error: ${err}`)
  process.exit(1)
})
