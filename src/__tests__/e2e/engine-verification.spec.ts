/**
 * E2E Tests for Engine Verification
 *
 * These tests verify that the real Stockfish and Maia engines
 * work correctly in the browser by automating the verify-engines page.
 */

import { test, expect } from '@playwright/test'

// Test positions
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

test.describe('Engine Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the verification page
    await page.goto('/verify-engines')
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Engine Verification')
  })

  test('Stockfish loads and evaluates position', async ({ page }) => {
    // Click Test Stockfish button
    await page.click('button:has-text("Test Stockfish")')

    // Wait for result (up to 30 seconds for WASM loading)
    await expect(page.locator('[data-testid="stockfish-result"]')).toBeVisible({ timeout: 30000 })

    // Verify we got results
    const bestMove = await page.locator('[data-testid="sf-best-move"]').textContent()
    const evaluation = await page.locator('[data-testid="sf-evaluation"]').textContent()
    const winrate = await page.locator('[data-testid="sf-winrate"]').textContent()
    const depth = await page.locator('[data-testid="sf-depth"]').textContent()

    console.log('Stockfish Results:')
    console.log(`  Best Move: ${bestMove}`)
    console.log(`  Evaluation: ${evaluation}`)
    console.log(`  Win Rate: ${winrate}`)
    console.log(`  Depth: ${depth}`)

    // Basic sanity checks
    expect(bestMove).toBeTruthy()
    expect(bestMove?.length).toBeGreaterThanOrEqual(4) // UCI move like "e2e4"
    expect(evaluation).toContain('cp')
    expect(winrate).toContain('%')
  })

  test('Maia loads and predicts moves', async ({ page }) => {
    // Click Test Maia button
    await page.click('button:has-text("Test Maia")')

    // Wait for result (up to 60 seconds for ONNX model loading)
    await expect(page.locator('[data-testid="maia-result"]')).toBeVisible({ timeout: 60000 })

    // Verify we got results
    const winProb = await page.locator('[data-testid="maia-winprob"]').textContent()
    const topMove = await page.locator('[data-testid="maia-move-0-uci"]').textContent()
    const topProb = await page.locator('[data-testid="maia-move-0-prob"]').textContent()

    console.log('Maia Results:')
    console.log(`  Win Probability: ${winProb}`)
    console.log(`  Top Move: ${topMove}`)
    console.log(`  Top Move Probability: ${topProb}`)

    // Basic sanity checks
    expect(winProb).toContain('%')
    expect(topMove).toBeTruthy()
    expect(topMove?.length).toBeGreaterThanOrEqual(4) // UCI move like "e2e4"
    expect(topProb).toContain('%')

    // Check win probability is reasonable (between 20% and 80% for equal positions)
    const winProbNum = parseFloat(winProb?.replace('%', '') || '0')
    console.log(`  Win Probability (parsed): ${winProbNum}%`)

    // For starting position (White to move), expect roughly equal
    // Allow wide range since model behavior may vary
    expect(winProbNum).toBeGreaterThan(10)
    expect(winProbNum).toBeLessThan(90)
  })

  test('Maia value output sanity check', async ({ page }) => {
    // This test captures console logs to verify the raw model output

    const consoleLogs: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      if (text.includes('Maia value:')) {
        consoleLogs.push(text)
      }
    })

    // Click Test Maia button
    await page.click('button:has-text("Test Maia")')

    // Wait for result
    await expect(page.locator('[data-testid="maia-result"]')).toBeVisible({ timeout: 60000 })

    // Check we captured the debug log
    expect(consoleLogs.length).toBeGreaterThan(0)

    const maiaLog = consoleLogs[0]
    console.log('Captured Maia debug log:', maiaLog)

    // Parse the log: "Maia value: raw=X.XXXX, winProb=X.XXXX, isBlackTurn=false"
    const rawMatch = maiaLog.match(/raw=(-?\d+\.\d+)/)
    const winProbMatch = maiaLog.match(/winProb=(\d+\.\d+)/)
    const isBlackMatch = maiaLog.match(/isBlackTurn=(true|false)/)

    expect(rawMatch).toBeTruthy()
    expect(winProbMatch).toBeTruthy()
    expect(isBlackMatch).toBeTruthy()

    const rawValue = parseFloat(rawMatch![1])
    const winProb = parseFloat(winProbMatch![1])
    const isBlackTurn = isBlackMatch![1] === 'true'

    console.log('Parsed values:')
    console.log(`  Raw model output: ${rawValue}`)
    console.log(`  Win probability: ${winProb}`)
    console.log(`  Is Black's turn: ${isBlackTurn}`)

    // For starting position (White to move), raw value should be close to 0
    // Since board is not mirrored for White, we expect straightforward interpretation
    if (!isBlackTurn) {
      // White to move - expect raw value reasonably close to 0 for equal position
      console.log(`  Expected: raw value close to 0 for equal starting position`)
      // Allow wider range since model may have quirks
      expect(Math.abs(rawValue)).toBeLessThan(1.0)
    }
  })
})
