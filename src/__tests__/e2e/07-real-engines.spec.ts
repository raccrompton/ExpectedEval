/**
 * E2E Tests for Real Engine Integration (Phase 10)
 *
 * These tests verify that the real Stockfish and Maia engines
 * load and evaluate positions correctly in the browser.
 *
 * Key differences from mock engine tests:
 * - Longer timeouts (engines need to download/initialize ~165MB of files)
 * - First run may take 30-60 seconds to download files
 * - Subsequent runs use cached files and are faster
 * - Actual engine evaluations (not fixed mock values)
 */
import { test, expect, type Page } from '@playwright/test'

// Configure longer timeout for all tests in this file
test.setTimeout(180000) // 3 minutes per test

// Use sfDepth=1 for fast engine evaluations in tests
const TEST_URL = '/?sfDepth=1'

test.describe('07 - Real Engine Integration', () => {
  const SAMPLE_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6'

  // Longer timeout for real engine initialization (downloads ~165MB on first run)
  const ENGINE_INIT_TIMEOUT = 120000 // 2 minutes for first-time download
  const EVAL_TIMEOUT = 30000 // 30 seconds for evaluation (faster with sfDepth=1)

  /**
   * Helper to wait for both engines to be ready
   */
  async function waitForEnginesReady(page: Page) {
    await expect(page.getByTestId('sf-status')).toContainText(/ready/i, {
      timeout: ENGINE_INIT_TIMEOUT,
    })
    await expect(page.getByTestId('maia-status')).toContainText(/ready/i, {
      timeout: ENGINE_INIT_TIMEOUT,
    })
  }

  /**
   * Helper to load a PGN and wait for evaluation
   */
  async function loadPgnAndWaitForEval(page: Page, pgn: string) {
    await page.getByTestId('pgn-input').fill(pgn)
    await page.getByTestId('load-pgn-button').click()

    // Wait for evaluation to appear (sf-cp will be visible when eval is done)
    await expect(page.getByTestId('sf-cp')).toBeVisible({ timeout: EVAL_TIMEOUT })
  }

  test.describe('Real Stockfish WASM', () => {
    test('stockfish loads and shows ready status', async ({ page }) => {
      await page.goto(TEST_URL)

      // Wait for Stockfish to fully initialize
      const sfStatus = page.getByTestId('sf-status')
      await expect(sfStatus).toContainText(/ready/i, { timeout: ENGINE_INIT_TIMEOUT })
    })

    test('stockfish provides real evaluation', async ({ page }) => {
      await page.goto(TEST_URL)
      await waitForEnginesReady(page)

      // Load a simple position
      await loadPgnAndWaitForEval(page, '1. e4')

      // Should show a centipawn value
      const sfCp = page.getByTestId('sf-cp')
      const cpText = await sfCp.textContent()
      expect(cpText).toBeTruthy()
      // Should show a number like "+0.20" or "-0.15"
      expect(cpText).toMatch(/[+-]?\d+\.\d+/)
    })

    test('stockfish provides best move recommendation', async ({ page }) => {
      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      // Best move should be visible
      const sfBestMove = page.getByTestId('sf-best-move')
      await expect(sfBestMove).toBeVisible()

      // Best move should be a valid chess move format
      const moveText = await sfBestMove.textContent()
      expect(moveText).toBeTruthy()
      expect(moveText!.length).toBeGreaterThan(0)
    })

    test('stockfish winrate is reasonable', async ({ page }) => {
      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      const sfWinrate = page.getByTestId('sf-winrate')
      await expect(sfWinrate).toBeVisible()

      // Winrate should be a percentage
      const winrateText = await sfWinrate.textContent()
      expect(winrateText).toMatch(/%/)

      // Winrate should be between 30% and 70% for normal positions
      const match = winrateText?.match(/(\d+(?:\.\d+)?)%/)
      if (match) {
        const winrate = parseFloat(match[1])
        expect(winrate).toBeGreaterThan(30)
        expect(winrate).toBeLessThan(70)
      }
    })

    test('stockfish evaluation updates when navigating', async ({ page }) => {
      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      // Evaluation should be visible
      const sfCp = page.getByTestId('sf-cp')
      await expect(sfCp).toBeVisible()

      // Navigate to start
      await page.getByTestId('nav-start').click()

      // Wait for new evaluation (may show "Evaluating..." briefly)
      await page.waitForTimeout(1000)
      await expect(sfCp).toBeVisible({ timeout: EVAL_TIMEOUT })

      // Evaluation should still be a valid number
      const cpText = await sfCp.textContent()
      expect(cpText).toMatch(/[+-]?\d+\.\d+|M\d+/)
    })
  })

  test.describe('Real Maia ONNX', () => {
    test('maia loads and shows ready status', async ({ page }) => {
      await page.goto(TEST_URL)

      // Wait for Maia to fully initialize
      const maiaStatus = page.getByTestId('maia-status')
      await expect(maiaStatus).toContainText(/ready/i, { timeout: ENGINE_INIT_TIMEOUT })
    })

    test('maia provides move probabilities', async ({ page }) => {
      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, '1. e4')

      // Wait for predictions
      const maiaMoves = page.getByTestId('maia-moves')
      await expect(maiaMoves).toBeVisible({ timeout: EVAL_TIMEOUT })

      // Should show moves with percentages
      const movesText = await maiaMoves.textContent()
      expect(movesText).toMatch(/%/)
    })

    test('maia provides value (win probability)', async ({ page }) => {
      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, '1. e4')

      const maiaValue = page.getByTestId('maia-value')
      await expect(maiaValue).toBeVisible({ timeout: EVAL_TIMEOUT })

      // Value should be a percentage
      const valueText = await maiaValue.textContent()
      expect(valueText).toMatch(/%/)

      // Value should be between 20% and 80% for opening positions
      // (Maia values can vary more than SF winrates)
      const match = valueText?.match(/(\d+(?:\.\d+)?)%/)
      if (match) {
        const value = parseFloat(match[1])
        expect(value).toBeGreaterThan(20)
        expect(value).toBeLessThan(80)
      }
    })

    test('maia predictions update when navigating', async ({ page }) => {
      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      // Get predictions at current position
      const maiaMoves = page.getByTestId('maia-moves')
      await expect(maiaMoves).toBeVisible()

      // Navigate to start
      await page.getByTestId('nav-start').click()

      // Wait for update
      await page.waitForTimeout(1000)

      // Predictions should still be visible
      await expect(maiaMoves).toBeVisible({ timeout: EVAL_TIMEOUT })
    })
  })

  test.describe('Both Engines Together', () => {
    test('both engines initialize successfully', async ({ page }) => {
      await page.goto(TEST_URL)
      await waitForEnginesReady(page)

      // Both should be ready
      await expect(page.getByTestId('sf-status')).toContainText(/ready/i)
      await expect(page.getByTestId('maia-status')).toContainText(/ready/i)
    })

    test('both engines evaluate same position', async ({ page }) => {
      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      // Both should show results
      await expect(page.getByTestId('sf-eval')).toBeVisible()
      await expect(page.getByTestId('maia-moves')).toBeVisible()
    })

    test('evaluations update on navigation', async ({ page }) => {
      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, '1. e4 e5 2. Nf3 Nc6 3. Bb5')

      // Both evals visible
      await expect(page.getByTestId('sf-cp')).toBeVisible()
      await expect(page.getByTestId('maia-value')).toBeVisible()

      // Navigate back
      await page.getByTestId('nav-back').click()
      await page.waitForTimeout(500)

      // Navigate forward
      await page.getByTestId('nav-forward').click()

      // Wait for evaluations to update
      await page.waitForTimeout(2000)

      // Both should still show results (use longer timeout for evaluation)
      await expect(page.getByTestId('sf-eval')).toBeVisible({ timeout: EVAL_TIMEOUT })
      await expect(page.getByTestId('maia-moves')).toBeVisible({ timeout: EVAL_TIMEOUT })
    })
  })

  test.describe('Error Handling', () => {
    /**
     * Filter function for console messages.
     * Returns true if the message should be IGNORED (not counted as error).
     */
    function shouldIgnoreConsoleMessage(text: string): boolean {
      const ignoredPatterns = [
        'CORS',
        'SharedArrayBuffer',
        'Maia value:', // Debug log from engine
        'Maia:', // Maia initialization logs
        'Stockfish', // Stockfish initialization logs
        'Download the React DevTools',
        'net::ERR',
        '404',
        'Failed to load resource', // Network issues
        'Warning:', // React warnings
        'Hydration', // Next.js hydration warnings
        'onnxruntime', // ONNX runtime logs
        'WebAssembly', // WASM-related logs
      ]
      return ignoredPatterns.some((pattern) => text.includes(pattern))
    }

    test('no critical console errors during initialization', async ({ page }) => {
      const criticalErrors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text()
          if (!shouldIgnoreConsoleMessage(text)) {
            criticalErrors.push(text)
          }
        }
      })

      await page.goto(TEST_URL)
      await waitForEnginesReady(page)

      expect(criticalErrors).toEqual([])
    })

    test('no critical console errors during evaluation', async ({ page }) => {
      const criticalErrors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text()
          if (!shouldIgnoreConsoleMessage(text)) {
            criticalErrors.push(text)
          }
        }
      })

      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      expect(criticalErrors).toEqual([])
    })
  })

  test.describe('Performance', () => {
    test('engines initialize within timeout', async ({ page }) => {
      const startTime = Date.now()

      await page.goto(TEST_URL)
      await waitForEnginesReady(page)

      const initTime = Date.now() - startTime
      console.log(`Engine initialization time: ${initTime}ms`)

      // Should initialize within the timeout (cached is faster)
      expect(initTime).toBeLessThan(ENGINE_INIT_TIMEOUT)
    })

    test('evaluation completes within reasonable time', async ({ page }) => {
      await page.goto(TEST_URL)
      await waitForEnginesReady(page)

      // Load PGN
      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      const startTime = Date.now()

      // Wait for evaluation
      await expect(page.getByTestId('sf-cp')).toBeVisible({ timeout: EVAL_TIMEOUT })

      const evalTime = Date.now() - startTime
      console.log(`Evaluation time: ${evalTime}ms`)

      // Evaluation should complete within timeout
      expect(evalTime).toBeLessThan(EVAL_TIMEOUT)
    })
  })
})
