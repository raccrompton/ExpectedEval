#!/usr/bin/env npx tsx
/**
 * Test Timing Report
 *
 * Parses JSON test results and displays timing summaries.
 * Usage: npx tsx scripts/test-timing-report.ts [--unit | --e2e | --all]
 */

import * as fs from 'fs'
import * as path from 'path'

const TEST_RESULTS_DIR = path.join(__dirname, '../test-results')

interface UnitTestResult {
  numTotalTests: number
  numPassedTests: number
  numFailedTests: number
  startTime: number
  testResults: Array<{
    name: string
    startTime: number
    endTime: number
    status: string
    assertionResults: Array<{
      fullName: string
      duration: number
      status: string
    }>
  }>
}

interface E2ETestResult {
  stats: {
    startTime: string
    duration: number
  }
  suites: Array<{
    title: string
    file: string
    specs: Array<{
      title: string
      ok: boolean
      tests: Array<{
        projectName: string
        duration: number
        status: string
      }>
    }>
  }>
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  const mins = Math.floor(ms / 60000)
  const secs = ((ms % 60000) / 1000).toFixed(1)
  return `${mins}m ${secs}s`
}

function parseUnitTests(): void {
  const filePath = path.join(TEST_RESULTS_DIR, 'unit-tests.json')
  if (!fs.existsSync(filePath)) {
    console.log('No unit test results found. Run: npm run test:run')
    return
  }

  const data: UnitTestResult = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const totalDuration = data.testResults.reduce(
    (sum, r) => sum + (r.endTime - r.startTime),
    0
  )

  console.log('\n📋 UNIT TEST TIMING REPORT')
  console.log('═'.repeat(60))
  console.log(
    `Total: ${data.numPassedTests}/${data.numTotalTests} passed in ${formatDuration(totalDuration)}`
  )
  console.log(`Run at: ${new Date(data.startTime).toLocaleString()}`)
  console.log('')

  // Sort by duration (slowest first)
  const suiteTimings = data.testResults
    .map((r) => ({
      name: path.basename(r.name),
      duration: r.endTime - r.startTime,
      testCount: r.assertionResults.length,
      status: r.status,
    }))
    .sort((a, b) => b.duration - a.duration)

  console.log('Test Suites (slowest first):')
  console.log('─'.repeat(60))
  for (const suite of suiteTimings) {
    const status = suite.status === 'passed' ? '✓' : '✗'
    console.log(
      `${status} ${formatDuration(suite.duration).padStart(8)} │ ${suite.testCount.toString().padStart(3)} tests │ ${suite.name}`
    )
  }

  // Find slowest individual tests
  const allTests = data.testResults.flatMap((r) =>
    r.assertionResults.map((t) => ({
      name: t.fullName,
      duration: t.duration,
      file: path.basename(r.name),
    }))
  )
  const slowestTests = allTests.sort((a, b) => b.duration - a.duration).slice(0, 10)

  if (slowestTests.length > 0 && slowestTests[0].duration > 10) {
    console.log('')
    console.log('Slowest Individual Tests:')
    console.log('─'.repeat(60))
    for (const test of slowestTests) {
      console.log(`  ${formatDuration(test.duration).padStart(8)} │ ${test.name}`)
    }
  }
}

function parseE2ETests(): void {
  const filePath = path.join(TEST_RESULTS_DIR, 'e2e-tests.json')
  if (!fs.existsSync(filePath)) {
    console.log('No E2E test results found. Run: npm run test:e2e')
    return
  }

  const data: E2ETestResult = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

  console.log('\n🎭 E2E TEST TIMING REPORT')
  console.log('═'.repeat(60))
  console.log(`Total duration: ${formatDuration(data.stats.duration)}`)
  console.log(`Run at: ${new Date(data.stats.startTime).toLocaleString()}`)
  console.log('')

  // Collect all specs with timing
  const specTimings: Array<{
    title: string
    file: string
    duration: number
    ok: boolean
  }> = []

  for (const suite of data.suites) {
    for (const spec of suite.specs) {
      const totalDuration = spec.tests.reduce((sum, t) => sum + t.duration, 0)
      specTimings.push({
        title: spec.title,
        file: path.basename(suite.file),
        duration: totalDuration,
        ok: spec.ok,
      })
    }
  }

  // Sort by duration (slowest first)
  specTimings.sort((a, b) => b.duration - a.duration)

  console.log('Test Specs (slowest first):')
  console.log('─'.repeat(60))
  for (const spec of specTimings.slice(0, 20)) {
    const status = spec.ok ? '✓' : '✗'
    const title = spec.title.length > 45 ? spec.title.slice(0, 42) + '...' : spec.title
    console.log(`${status} ${formatDuration(spec.duration).padStart(8)} │ ${title}`)
  }

  if (specTimings.length > 20) {
    console.log(`  ... and ${specTimings.length - 20} more tests`)
  }
}

// Main
const args = process.argv.slice(2)
const showUnit = args.includes('--unit') || args.includes('--all') || args.length === 0
const showE2E = args.includes('--e2e') || args.includes('--all') || args.length === 0

if (showUnit) parseUnitTests()
if (showE2E) parseE2ETests()

console.log('')
