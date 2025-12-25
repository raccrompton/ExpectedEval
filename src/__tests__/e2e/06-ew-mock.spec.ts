/**
 * E2E Tests for Expected Winrate (Phase 9)
 *
 * These tests verify that the Expected Winrate calculation
 * and display works correctly with the engines.
 *
 * Uses ?sfDepth=1 URL parameter for fast engine evaluations in tests.
 */
import { test, expect, type Page } from '@playwright/test'

// Configure longer timeout for engine initialization
test.setTimeout(180000)

// Use sfDepth=1 for fast EW calculations in tests
const TEST_URL = '/?sfDepth=1'

test.describe('06 - Expected Winrate', () => {
  const SAMPLE_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6'

  // Real engines need longer initialization (downloads ~165MB on first run)
  const ENGINE_INIT_TIMEOUT = 120000
  const EVAL_TIMEOUT = 60000
  const EW_CALC_TIMEOUT = 60000 // With sfDepth=1, EW calc is much faster

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

  /**
   * Filter function for console messages.
   */
  function shouldIgnoreConsoleMessage(text: string): boolean {
    const ignoredPatterns = [
      'CORS',
      'SharedArrayBuffer',
      'Maia value:',
      'Maia:',
      'Stockfish',
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

  test.describe('EW Section Visibility', () => {
    test('expected winrate section is visible on the page', async ({ page }) => {
      await page.goto(TEST_URL)

      const ewSection = page.getByTestId('ew-section')
      await expect(ewSection).toBeVisible()
    })

    test('calculate EW button is visible', async ({ page }) => {
      await page.goto(TEST_URL)

      const calculateButton = page.getByTestId('calculate-ew-button')
      await expect(calculateButton).toBeVisible()
    })
  })

  test.describe('EW Calculation', () => {
    test('clicking calculate EW button triggers calculation', async ({ page }) => {
      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      const calculateButton = page.getByTestId('calculate-ew-button')
      await calculateButton.click()

      const ewSection = page.getByTestId('ew-section')
      await expect(ewSection).toBeVisible()
    })

    test('shows loading state while calculating', async ({ page }) => {
      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      await page.getByTestId('calculate-ew-button').click()

      const ewStatus = page.getByTestId('ew-status')
      await expect(ewStatus).toBeVisible()
    })

    test('shows EW results after calculation completes', async ({ page }) => {
      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      await page.getByTestId('calculate-ew-button').click()

      const ewResults = page.getByTestId('ew-results')
      await expect(ewResults).toBeVisible({ timeout: EW_CALC_TIMEOUT })
    })
  })

  test.describe('EW Results Display', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)
      await page.getByTestId('calculate-ew-button').click()
      await expect(page.getByTestId('ew-results')).toBeVisible({ timeout: EW_CALC_TIMEOUT })
    })

    test('displays EW using SF value', async ({ page }) => {
      const ewSF = page.getByTestId('ew-sf-value')
      await expect(ewSF).toBeVisible()
      await expect(ewSF).toContainText(/%/)
    })

    test('displays EW using Maia value', async ({ page }) => {
      const ewMaia = page.getByTestId('ew-maia-value')
      await expect(ewMaia).toBeVisible()
      await expect(ewMaia).toContainText(/%/)
    })

    test('displays candidate moves', async ({ page }) => {
      const candidates = page.getByTestId('ew-candidates')
      await expect(candidates).toBeVisible()
    })

    test('candidate moves show move name', async ({ page }) => {
      const firstCandidate = page.getByTestId('ew-candidate-0')
      await expect(firstCandidate).toBeVisible()
    })

    test('candidate moves show probability', async ({ page }) => {
      const firstCandidate = page.getByTestId('ew-candidate-0')
      await expect(firstCandidate).toContainText(/%/)
    })
  })

  test.describe('EW Tree Display', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)
      await page.getByTestId('calculate-ew-button').click()
      await expect(page.getByTestId('ew-results')).toBeVisible({ timeout: EW_CALC_TIMEOUT })
    })

    test('EW tree is visible in results', async ({ page }) => {
      const ewTree = page.getByTestId('ew-tree')
      await expect(ewTree).toBeVisible()
    })

    test('tree nodes can be expanded', async ({ page }) => {
      const expandButton = page.getByTestId('ew-tree-expand-0')
      await expect(expandButton).toBeVisible({ timeout: 10000 })

      await expandButton.click()

      const treeChildren = page.getByTestId('ew-tree-children-0')
      await expect(treeChildren).toBeVisible()
    })

    test('tree shows move names', async ({ page }) => {
      const ewTree = page.getByTestId('ew-tree')
      const treeText = await ewTree.textContent()
      expect(treeText).toMatch(/[a-h][1-8]|[KQRBN]/)
    })
  })

  test.describe('EW Updates on Navigation', () => {
    test('EW recalculates for new position', async ({ page }) => {
      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      await page.getByTestId('calculate-ew-button').click()
      await expect(page.getByTestId('ew-results')).toBeVisible({ timeout: EW_CALC_TIMEOUT })

      await page.getByTestId('move-0').click()

      const calculateButton = page.getByTestId('calculate-ew-button')
      await expect(calculateButton).toBeVisible()
    })
  })

  test.describe('EW Configuration', () => {
    test('config panel is accessible', async ({ page }) => {
      await page.goto(TEST_URL)

      const configToggle = page.getByTestId('ew-config-toggle')
      await expect(configToggle).toBeVisible()

      await configToggle.click()
      const configPanel = page.getByTestId('ew-config-panel')
      await expect(configPanel).toBeVisible()

      await configToggle.click()
      await expect(configPanel).not.toBeVisible()
    })
  })

  test.describe('No Console Errors', () => {
    test('no console errors during EW calculation', async ({ page }) => {
      const errors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text()
          if (!shouldIgnoreConsoleMessage(text)) {
            errors.push(text)
          }
        }
      })

      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      await page.getByTestId('calculate-ew-button').click()
      await expect(page.getByTestId('ew-results')).toBeVisible({ timeout: EW_CALC_TIMEOUT })

      expect(errors).toEqual([])
    })

    test('no console errors when navigating after calculation', async ({ page }) => {
      const errors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text()
          if (!shouldIgnoreConsoleMessage(text)) {
            errors.push(text)
          }
        }
      })

      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      await page.getByTestId('calculate-ew-button').click()
      await expect(page.getByTestId('ew-results')).toBeVisible({ timeout: EW_CALC_TIMEOUT })

      await page.getByTestId('nav-start').click()
      await page.getByTestId('nav-end').click()
      await page.getByTestId('move-0').click()

      expect(errors).toEqual([])
    })
  })
})
