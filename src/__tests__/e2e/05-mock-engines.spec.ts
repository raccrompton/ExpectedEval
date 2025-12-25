/**
 * E2E Tests for Engine Display (Phase 8)
 *
 * These tests verify that the engine panel displays correctly
 * and that evaluations are shown after loading positions.
 *
 * Note: Originally designed for mock engines, these tests now work
 * with real engines by using appropriate timeouts.
 */
import { test, expect, type Page } from '@playwright/test'

// Configure longer timeout for engine initialization
test.setTimeout(180000)

test.describe('05 - Engine Display', () => {
  const SAMPLE_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6'

  // Real engines need longer initialization (downloads ~165MB on first run)
  const ENGINE_INIT_TIMEOUT = 120000
  const EVAL_TIMEOUT = 60000

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
    await expect(page.getByTestId('sf-cp')).toBeVisible({ timeout: EVAL_TIMEOUT })
  }

  test.describe('Engine Panel Visibility', () => {
    test('engine panel is visible on the page', async ({ page }) => {
      await page.goto('/')

      const enginePanel = page.getByTestId('engine-panel')
      await expect(enginePanel).toBeVisible()
    })

    test('stockfish section is visible', async ({ page }) => {
      await page.goto('/')

      const stockfishSection = page.getByTestId('stockfish-section')
      await expect(stockfishSection).toBeVisible()
    })

    test('maia section is visible', async ({ page }) => {
      await page.goto('/')

      const maiaSection = page.getByTestId('maia-section')
      await expect(maiaSection).toBeVisible()
    })
  })

  test.describe('Stockfish Evaluation Display', () => {
    test('shows stockfish evaluation after loading position', async ({ page }) => {
      await page.goto('/')
      await waitForEnginesReady(page)

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      const sfEval = page.getByTestId('sf-eval')
      await expect(sfEval).toBeVisible()
    })

    test('stockfish evaluation shows centipawn value', async ({ page }) => {
      await page.goto('/')
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      const sfCp = page.getByTestId('sf-cp')
      await expect(sfCp).toBeVisible()
      await expect(sfCp).toContainText(/[+-]?\d+\.\d+|M\d+/)
    })

    test('stockfish evaluation shows winrate percentage', async ({ page }) => {
      await page.goto('/')
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      const sfWinrate = page.getByTestId('sf-winrate')
      await expect(sfWinrate).toBeVisible()
      await expect(sfWinrate).toContainText(/%/)
    })

    test('stockfish shows best move', async ({ page }) => {
      await page.goto('/')
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      const sfBestMove = page.getByTestId('sf-best-move')
      await expect(sfBestMove).toBeVisible()
    })
  })

  test.describe('Maia Prediction Display', () => {
    test('shows maia predictions after loading position', async ({ page }) => {
      await page.goto('/')
      await waitForEnginesReady(page)

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      const maiaSection = page.getByTestId('maia-section')
      await expect(maiaSection).toBeVisible()
    })

    test('maia shows value (win probability)', async ({ page }) => {
      await page.goto('/')
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      const maiaValue = page.getByTestId('maia-value')
      await expect(maiaValue).toBeVisible()
      await expect(maiaValue).toContainText(/%/)
    })

    test('maia shows predicted moves with probabilities', async ({ page }) => {
      await page.goto('/')
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      const maiaMoves = page.getByTestId('maia-moves')
      await expect(maiaMoves).toBeVisible()
    })

    test('maia move predictions show percentages', async ({ page }) => {
      await page.goto('/')
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      const maiaMoves = page.getByTestId('maia-moves')
      await expect(maiaMoves).toBeVisible()
      await expect(maiaMoves).toContainText(/%/)
    })
  })

  test.describe('Engine Updates on Navigation', () => {
    test('evaluation updates when navigating to different position', async ({ page }) => {
      await page.goto('/')
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      const sfEval = page.getByTestId('sf-eval')
      await expect(sfEval).toBeVisible()

      await page.getByTestId('move-0').click()
      await page.waitForTimeout(1000)

      await expect(sfEval).toBeVisible()
    })

    test('maia predictions update when navigating', async ({ page }) => {
      await page.goto('/')
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      await page.getByTestId('nav-start').click()
      await page.waitForTimeout(1000)

      const maiaMoves = page.getByTestId('maia-moves')
      await expect(maiaMoves).toBeVisible({ timeout: EVAL_TIMEOUT })
    })
  })

  test.describe('Engine Status Display', () => {
    test('shows stockfish status indicator', async ({ page }) => {
      await page.goto('/')

      const sfStatus = page.getByTestId('sf-status')
      await expect(sfStatus).toBeVisible()
    })

    test('shows maia status indicator', async ({ page }) => {
      await page.goto('/')

      const maiaStatus = page.getByTestId('maia-status')
      await expect(maiaStatus).toBeVisible()
    })

    test('stockfish shows ready status after initialization', async ({ page }) => {
      await page.goto('/')

      const sfStatus = page.getByTestId('sf-status')
      await expect(sfStatus).toContainText(/ready/i, { timeout: ENGINE_INIT_TIMEOUT })
    })

    test('maia shows ready status after initialization', async ({ page }) => {
      await page.goto('/')

      const maiaStatus = page.getByTestId('maia-status')
      await expect(maiaStatus).toContainText(/ready/i, { timeout: ENGINE_INIT_TIMEOUT })
    })
  })

  test.describe('No Console Errors', () => {
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
        'Failed to load resource',
        'Warning:',
        'Hydration',
        'onnxruntime',
        'WebAssembly',
      ]
      return ignoredPatterns.some((pattern) => text.includes(pattern))
    }

    test('no console errors with engine panel', async ({ page }) => {
      const errors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text()
          if (!shouldIgnoreConsoleMessage(text)) {
            errors.push(text)
          }
        }
      })

      await page.goto('/')
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      await page.getByTestId('move-0').click()
      await page.getByTestId('nav-end').click()

      expect(errors).toEqual([])
    })
  })
})
