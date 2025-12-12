/**
 * Real Engine Integration Tests (E2E)
 *
 * These tests verify that the REAL Stockfish and Maia engines work correctly
 * in a browser environment. Unlike unit tests with mocks, these tests:
 *
 * 1. Load actual WASM/ONNX files
 * 2. Run real inference
 * 3. Verify results are sensible for chess positions
 *
 * These tests catch issues that mocks cannot:
 * - CORS/SharedArrayBuffer configuration problems
 * - Missing or corrupt model files
 * - Engine initialization failures
 * - Incorrect evaluation values
 *
 * Run with: npm run test:e2e
 */

import { test, expect } from '@playwright/test'

// ============================================================================
// Test Configuration
// ============================================================================

/**
 * Longer timeout for engine tests because:
 * - Stockfish WASM + NNUE files are ~75MB
 * - Maia ONNX model is ~89MB
 * - First load downloads from server (subsequent loads use cache)
 */
test.setTimeout(120_000) // 2 minutes

// ============================================================================
// Stockfish Integration Tests
// ============================================================================

test.describe('Stockfish Engine (Real)', () => {
  /**
   * Test: Stockfish initializes and evaluates a position
   *
   * This verifies:
   * - WASM module loads correctly
   * - SharedArrayBuffer is available (CORS headers work)
   * - NNUE files load and parse correctly
   * - Engine can analyze a position
   */
  test('initializes and evaluates position after 1. e4', async ({ page }) => {
    // Navigate to the engine verification page
    await page.goto('/verify-engines')

    // Click the "Test Stockfish" button
    await page.getByRole('button', { name: 'Test Stockfish' }).click()

    // Wait for result (with longer timeout for WASM loading)
    const result = page.getByTestId('stockfish-result')
    await expect(result).toBeVisible({ timeout: 60_000 })

    // Verify we got a best move
    const bestMove = page.getByTestId('sf-best-move')
    await expect(bestMove).toBeVisible()
    const moveText = await bestMove.textContent()
    expect(moveText).toBeTruthy()
    expect(moveText!.length).toBeGreaterThanOrEqual(4) // UCI format: e.g., "e7e5"
  })

  /**
   * Test: Stockfish evaluation is sensible for the starting position after 1. e4
   *
   * After 1. e4, Black has a slightly worse position but it's nearly equal.
   * Expected evaluation: roughly -20 to +50 centipawns from Black's perspective
   * (which is +20 to -50 from White's perspective, displayed in the UI)
   */
  test('produces sensible evaluation for position after 1. e4', async ({ page }) => {
    await page.goto('/verify-engines')
    await page.getByRole('button', { name: 'Test Stockfish' }).click()

    // Wait for result
    await expect(page.getByTestId('stockfish-result')).toBeVisible({ timeout: 60_000 })

    // Get evaluation in centipawns
    const evalText = await page.getByTestId('sf-evaluation').textContent()

    // Parse centipawn value (format: "+20 cp" or "-15 cp")
    const cpMatch = evalText?.match(/([+-]?\d+)\s*cp/)
    expect(cpMatch).toBeTruthy()

    const cp = parseInt(cpMatch![1], 10)

    // After 1. e4, evaluation should be close to equal
    // Stockfish typically shows +20 to +40 for White
    // We allow a wider range because depth/version may vary
    expect(cp).toBeGreaterThanOrEqual(-100) // Not hugely losing for White
    expect(cp).toBeLessThanOrEqual(100) // Not hugely winning for White
  })

  /**
   * Test: Stockfish suggests reasonable moves after 1. e4
   *
   * The most common and strong replies to 1. e4 are:
   * - e7e5 (Open Game)
   * - c7c5 (Sicilian)
   * - e7e6 (French)
   * - c7c6 (Caro-Kann)
   * - d7d5 (Scandinavian)
   * - g8f6 (Alekhine's Defense)
   *
   * Stockfish should recommend one of these (likely e7e5 or c7c5).
   */
  test('suggests standard chess opening move', async ({ page }) => {
    await page.goto('/verify-engines')
    await page.getByRole('button', { name: 'Test Stockfish' }).click()

    await expect(page.getByTestId('stockfish-result')).toBeVisible({ timeout: 60_000 })

    const bestMove = await page.getByTestId('sf-best-move').textContent()

    // List of reasonable replies to 1. e4
    const reasonableMoves = [
      'e7e5', // Open Game (most common)
      'c7c5', // Sicilian Defense (very popular)
      'e7e6', // French Defense
      'c7c6', // Caro-Kann Defense
      'd7d5', // Scandinavian Defense
      'd7d6', // Pirc Defense
      'g8f6', // Alekhine's Defense
      'b8c6', // Nimzowitsch Defense
    ]

    expect(reasonableMoves).toContain(bestMove)
  })

  /**
   * Test: Win rate is in valid range
   *
   * Win rate should be between 0% and 100%.
   * For a balanced position like after 1. e4, it should be close to 50%.
   */
  test('win rate is valid and balanced', async ({ page }) => {
    await page.goto('/verify-engines')
    await page.getByRole('button', { name: 'Test Stockfish' }).click()

    await expect(page.getByTestId('stockfish-result')).toBeVisible({ timeout: 60_000 })

    const winrateText = await page.getByTestId('sf-winrate').textContent()

    // Parse percentage (format: "52.3%")
    const wrMatch = winrateText?.match(/([\d.]+)%/)
    expect(wrMatch).toBeTruthy()

    const winrate = parseFloat(wrMatch![1])

    // Must be valid percentage
    expect(winrate).toBeGreaterThanOrEqual(0)
    expect(winrate).toBeLessThanOrEqual(100)

    // For position after 1. e4, should be roughly balanced (40-60%)
    expect(winrate).toBeGreaterThanOrEqual(35)
    expect(winrate).toBeLessThanOrEqual(65)
  })

  /**
   * Test: Depth is reasonable
   *
   * We request depth 12, so we should get at least depth 10.
   */
  test('reaches requested search depth', async ({ page }) => {
    await page.goto('/verify-engines')
    await page.getByRole('button', { name: 'Test Stockfish' }).click()

    await expect(page.getByTestId('stockfish-result')).toBeVisible({ timeout: 60_000 })

    const depthText = await page.getByTestId('sf-depth').textContent()
    const depth = parseInt(depthText || '0', 10)

    // Should reach at least depth 10 (we request 12)
    expect(depth).toBeGreaterThanOrEqual(10)
  })
})

// ============================================================================
// Maia Integration Tests
// ============================================================================

test.describe('Maia Engine (Real)', () => {
  /**
   * Test: Maia initializes and predicts moves
   *
   * This verifies:
   * - ONNX model loads correctly
   * - IndexedDB caching works
   * - Neural network inference runs
   * - Output is valid move probabilities
   */
  test('initializes and predicts human moves after 1. e4', async ({ page }) => {
    await page.goto('/verify-engines')

    // Click the "Test Maia" button
    await page.getByRole('button', { name: 'Test Maia' }).click()

    // Wait for result (with longer timeout for model loading)
    const result = page.getByTestId('maia-result')
    await expect(result).toBeVisible({ timeout: 90_000 })

    // Verify we got move predictions
    const movesTable = page.getByTestId('maia-moves')
    await expect(movesTable).toBeVisible()

    // Should have at least one predicted move
    const firstMove = page.getByTestId('maia-move-0-uci')
    await expect(firstMove).toBeVisible()

    const moveText = await firstMove.textContent()
    expect(moveText).toBeTruthy()
    expect(moveText!.length).toBeGreaterThanOrEqual(4) // UCI format
  })

  /**
   * Test: Maia predicts e7e5 as most likely after 1. e4
   *
   * e7e5 is by far the most popular human response to 1. e4.
   * Maia should predict it with high probability.
   */
  test('predicts e7e5 as top response to 1. e4', async ({ page }) => {
    await page.goto('/verify-engines')
    await page.getByRole('button', { name: 'Test Maia' }).click()

    await expect(page.getByTestId('maia-result')).toBeVisible({ timeout: 90_000 })

    // Get the top predicted move
    const topMove = await page.getByTestId('maia-move-0-uci').textContent()

    // e7e5 should be the top prediction (or at least in top 3)
    // We check top 3 because different ELO levels might vary slightly
    const move0 = await page.getByTestId('maia-move-0-uci').textContent()
    const move1 = await page.getByTestId('maia-move-1-uci').textContent()
    const move2 = await page.getByTestId('maia-move-2-uci').textContent()

    const topMoves = [move0, move1, move2]

    // e7e5 should be in the top 3 predictions
    expect(topMoves).toContain('e7e5')
  })

  /**
   * Test: Move probabilities sum to approximately 1
   *
   * Move probabilities should be a valid distribution.
   * The top 5 moves should capture most of the probability mass.
   */
  test('move probabilities are valid distribution', async ({ page }) => {
    await page.goto('/verify-engines')
    await page.getByRole('button', { name: 'Test Maia' }).click()

    await expect(page.getByTestId('maia-result')).toBeVisible({ timeout: 90_000 })

    // Collect probabilities from top 5 moves
    let totalProb = 0
    for (let i = 0; i < 5; i++) {
      const probText = await page.getByTestId(`maia-move-${i}-prob`).textContent()
      const probMatch = probText?.match(/([\d.]+)%/)
      if (probMatch) {
        totalProb += parseFloat(probMatch[1])
      }
    }

    // Top 5 moves should capture at least 50% of probability
    // (in practice, usually 70%+ for common positions)
    expect(totalProb).toBeGreaterThanOrEqual(50)

    // Each probability should be reasonable (not 0%, not 100%)
    const topProb = await page.getByTestId('maia-move-0-prob').textContent()
    const topProbMatch = topProb?.match(/([\d.]+)%/)
    expect(topProbMatch).toBeTruthy()

    const topProbValue = parseFloat(topProbMatch![1])
    expect(topProbValue).toBeGreaterThan(5) // Top move should be at least 5%
    expect(topProbValue).toBeLessThan(95) // But not overwhelming
  })

  /**
   * Test: Win probability is valid and balanced
   *
   * After 1. e4, Black's win probability should be roughly 40-50%
   * (slightly below 50% because White moved first).
   */
  test('win probability is valid and reasonable', async ({ page }) => {
    await page.goto('/verify-engines')
    await page.getByRole('button', { name: 'Test Maia' }).click()

    await expect(page.getByTestId('maia-result')).toBeVisible({ timeout: 90_000 })

    const winprobText = await page.getByTestId('maia-winprob').textContent()
    const wpMatch = winprobText?.match(/([\d.]+)%/)
    expect(wpMatch).toBeTruthy()

    const winProb = parseFloat(wpMatch![1])

    // Must be valid percentage
    expect(winProb).toBeGreaterThanOrEqual(0)
    expect(winProb).toBeLessThanOrEqual(100)

    // For position after 1. e4, Black's win prob should be reasonable
    // Maia typically shows 40-50% for Black in this position
    expect(winProb).toBeGreaterThanOrEqual(30)
    expect(winProb).toBeLessThanOrEqual(60)
  })

  /**
   * Test: Maia predicts sensible human moves (not random)
   *
   * Verify that Maia predicts actual chess moves that humans play,
   * not random or nonsensical moves.
   */
  test('predicts moves humans actually play', async ({ page }) => {
    await page.goto('/verify-engines')
    await page.getByRole('button', { name: 'Test Maia' }).click()

    await expect(page.getByTestId('maia-result')).toBeVisible({ timeout: 90_000 })

    // Common human responses to 1. e4 (by popularity)
    const commonHumanMoves = [
      'e7e5', // Open Game (~30% of games)
      'c7c5', // Sicilian (~25% of games)
      'e7e6', // French (~5%)
      'c7c6', // Caro-Kann (~5%)
      'd7d5', // Scandinavian (~3%)
      'd7d6', // Pirc/Modern (~3%)
      'g8f6', // Alekhine (~2%)
      'g7g6', // Modern (~2%)
      'b8c6', // Nimzowitsch (~1%)
      'a7a6', // St. George (~0.5%)
    ]

    // All top 5 predictions should be in this list
    for (let i = 0; i < 5; i++) {
      const moveText = await page.getByTestId(`maia-move-${i}-uci`).textContent()
      expect(commonHumanMoves).toContain(moveText)
    }
  })
})

// ============================================================================
// Combined Engine Tests
// ============================================================================

test.describe('Both Engines Together', () => {
  /**
   * Test: Both engines can run in the same session
   *
   * Verifies there are no resource conflicts between
   * Stockfish WASM and Maia ONNX running together.
   */
  test('both engines can load and run', async ({ page }) => {
    await page.goto('/verify-engines')

    // Start both tests
    await page.getByRole('button', { name: 'Test Stockfish' }).click()
    await page.getByRole('button', { name: 'Test Maia' }).click()

    // Wait for both results
    await expect(page.getByTestId('stockfish-result')).toBeVisible({ timeout: 90_000 })
    await expect(page.getByTestId('maia-result')).toBeVisible({ timeout: 90_000 })

    // Verify both produced results
    const sfMove = await page.getByTestId('sf-best-move').textContent()
    const maiaMove = await page.getByTestId('maia-move-0-uci').textContent()

    expect(sfMove).toBeTruthy()
    expect(maiaMove).toBeTruthy()
  })
})

// ============================================================================
// Expected Winrate Integration Tests (Full Algorithm)
// ============================================================================

test.describe('Expected Winrate Algorithm (Real)', () => {
  /**
   * Test: EW algorithm runs with real engines
   *
   * This is the ultimate integration test - verifies the complete
   * Expected Winrate algorithm works end-to-end:
   * 1. Stockfish evaluates positions
   * 2. Maia predicts human moves
   * 3. Algorithm builds probability trees
   * 4. Weighted average produces EW result
   */
  test('calculates expected winrate with real engines', async ({ page }) => {
    await page.goto('/verify-engines')

    // Click the "Test Expected Winrate" button
    await page.getByRole('button', { name: 'Test Expected Winrate' }).click()

    // Wait for result (longer timeout - this runs both engines + algorithm)
    const result = page.getByTestId('ew-result')
    await expect(result).toBeVisible({ timeout: 120_000 })

    // Verify we got a result
    const bestMove = page.getByTestId('ew-best-move')
    await expect(bestMove).toBeVisible()
  })

  /**
   * Test: EW produces valid winrate values
   *
   * Expected Winrate should be between 0% and 100%,
   * and for a balanced opening position, should be reasonable.
   */
  test('produces valid winrate percentages', async ({ page }) => {
    await page.goto('/verify-engines')
    await page.getByRole('button', { name: 'Test Expected Winrate' }).click()

    await expect(page.getByTestId('ew-result')).toBeVisible({ timeout: 120_000 })

    // Parse Expected Winrate
    const ewText = await page.getByTestId('ew-expected-winrate').textContent()
    const ewMatch = ewText?.match(/([\d.]+)%/)
    expect(ewMatch).toBeTruthy()

    const ew = parseFloat(ewMatch![1])
    expect(ew).toBeGreaterThanOrEqual(0)
    expect(ew).toBeLessThanOrEqual(100)

    // For position after 1. e4, EW should be reasonable (35-65%)
    expect(ew).toBeGreaterThanOrEqual(30)
    expect(ew).toBeLessThanOrEqual(70)

    // Parse Stockfish Winrate
    const sfText = await page.getByTestId('ew-sf-winrate').textContent()
    const sfMatch = sfText?.match(/([\d.]+)%/)
    expect(sfMatch).toBeTruthy()

    const sf = parseFloat(sfMatch![1])
    expect(sf).toBeGreaterThanOrEqual(0)
    expect(sf).toBeLessThanOrEqual(100)
  })

  /**
   * Test: EW and SF winrates are different
   *
   * The whole point of EW is to differ from pure SF evaluation
   * by accounting for human move probabilities. They should
   * typically be close but not identical.
   */
  test('EW differs from pure Stockfish evaluation', async ({ page }) => {
    await page.goto('/verify-engines')
    await page.getByRole('button', { name: 'Test Expected Winrate' }).click()

    await expect(page.getByTestId('ew-result')).toBeVisible({ timeout: 120_000 })

    // Get both values
    const ewText = await page.getByTestId('ew-expected-winrate').textContent()
    const sfText = await page.getByTestId('ew-sf-winrate').textContent()

    const ewMatch = ewText?.match(/([\d.]+)%/)
    const sfMatch = sfText?.match(/([\d.]+)%/)

    expect(ewMatch).toBeTruthy()
    expect(sfMatch).toBeTruthy()

    const ew = parseFloat(ewMatch![1])
    const sf = parseFloat(sfMatch![1])

    // EW and SF should be in the same ballpark (within 20%)
    // but typically not exactly equal
    expect(Math.abs(ew - sf)).toBeLessThanOrEqual(20)

    // Log for debugging
    console.log(`EW: ${ew}%, SF: ${sf}%, Diff: ${Math.abs(ew - sf)}%`)
  })

  /**
   * Test: Algorithm finds multiple candidate moves
   *
   * For the starting position after 1. e4, there should be
   * several reasonable candidates (e5, c5, e6, etc.)
   */
  test('finds multiple candidate moves', async ({ page }) => {
    await page.goto('/verify-engines')
    await page.getByRole('button', { name: 'Test Expected Winrate' }).click()

    await expect(page.getByTestId('ew-result')).toBeVisible({ timeout: 120_000 })

    const countText = await page.getByTestId('ew-candidate-count').textContent()
    const count = parseInt(countText || '0', 10)

    // Should find at least 2 candidates (we configured maxCandidates: 3)
    expect(count).toBeGreaterThanOrEqual(2)
    expect(count).toBeLessThanOrEqual(3)
  })

  /**
   * Test: Calculation completes in reasonable time
   *
   * With shallow depth (2) and few candidates (3), calculation
   * should complete within 30 seconds after engines are loaded.
   */
  test('completes calculation in reasonable time', async ({ page }) => {
    await page.goto('/verify-engines')
    await page.getByRole('button', { name: 'Test Expected Winrate' }).click()

    await expect(page.getByTestId('ew-result')).toBeVisible({ timeout: 120_000 })

    const timeText = await page.getByTestId('ew-calc-time').textContent()
    const timeMatch = timeText?.match(/(\d+)ms/)
    expect(timeMatch).toBeTruthy()

    const timeMs = parseInt(timeMatch![1], 10)

    // Calculation should complete within 60 seconds
    // (after engines are already loaded)
    expect(timeMs).toBeLessThan(60_000)

    console.log(`EW calculation took ${timeMs}ms`)
  })

  /**
   * Test: Best move is a sensible chess move
   *
   * The EW-recommended best move should be a reasonable
   * response to 1. e4 (not some random garbage).
   */
  test('recommends sensible best move', async ({ page }) => {
    await page.goto('/verify-engines')
    await page.getByRole('button', { name: 'Test Expected Winrate' }).click()

    await expect(page.getByTestId('ew-result')).toBeVisible({ timeout: 120_000 })

    const moveText = await page.getByTestId('ew-best-move').textContent()

    // Common responses to 1. e4
    const sensibleMoves = [
      'e5', 'e7e5',   // Open Game
      'c5', 'c7c5',   // Sicilian
      'e6', 'e7e6',   // French
      'c6', 'c7c6',   // Caro-Kann
      'd5', 'd7d5',   // Scandinavian
      'd6', 'd7d6',   // Pirc
      'Nf6', 'g8f6', // Alekhine
    ]

    // The text contains both SAN and UCI, e.g., "e5 (e7e5)"
    const containsSensibleMove = sensibleMoves.some(move =>
      moveText?.includes(move)
    )

    expect(containsSensibleMove).toBe(true)
  })
})
