/**
 * E2E Tests for Engine Display (Phase 8)
 *
 * Tests verify that the engine panel displays correctly
 * and that evaluations are shown after loading positions.
 *
 * Optimized: Uses shared page to avoid repeated engine initialization.
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import {
  TEST_URL,
  SAMPLE_PGN,
  EVAL_TIMEOUT,
  waitForEnginesReady,
  loadPgnAndWaitForEval,
  trackConsoleErrors,
  logCollectedErrors,
} from './helpers'

test.describe('05 - Engine Display', () => {
  // Simple visibility tests - no engine initialization needed
  test.describe('Engine Panel Visibility', () => {
    test('engine panel and sections are visible', async ({ page }) => {
      await page.goto(TEST_URL)

      await expect(page.getByTestId('engine-panel')).toBeVisible()
      await expect(page.getByTestId('stockfish-section')).toBeVisible()
      await expect(page.getByTestId('maia-section')).toBeVisible()
    })

    test('engine status indicators are visible', async ({ page }) => {
      await page.goto(TEST_URL)

      await expect(page.getByTestId('sf-status')).toBeVisible()
      await expect(page.getByTestId('maia-status')).toBeVisible()
    })
  })

  // Engine-dependent tests - share a single page to avoid repeated init
  test.describe('Engine Evaluation Tests', () => {
    // Run serially since tests share page state
    test.describe.configure({ mode: 'serial' })

    let context: BrowserContext
    let page: Page
    let consoleErrors: string[]

    test.beforeAll(async ({ browser }) => {
      context = await browser.newContext()
      page = await context.newPage()
      consoleErrors = trackConsoleErrors(page)

      await page.goto(TEST_URL)
      await waitForEnginesReady(page)
    })

    test.afterAll(async () => {
      logCollectedErrors(consoleErrors)
      await context.close()
    })

    test('engines show ready status after initialization', async () => {
      await expect(page.getByTestId('sf-status')).toContainText(/ready/i)
      await expect(page.getByTestId('maia-status')).toContainText(/ready/i)
    })

    test('stockfish shows evaluation after loading position', async () => {
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      // Eval section visible
      await expect(page.getByTestId('sf-eval')).toBeVisible()

      // Shows centipawn value
      const sfCp = page.getByTestId('sf-cp')
      await expect(sfCp).toBeVisible()
      await expect(sfCp).toContainText(/[+-]?\d+\.\d+|M\d+/)

      // Shows winrate percentage
      const sfWinrate = page.getByTestId('sf-winrate')
      await expect(sfWinrate).toBeVisible()
      await expect(sfWinrate).toContainText(/%/)

      // Shows best move
      await expect(page.getByTestId('sf-best-move')).toBeVisible()
    })

    test('maia shows predictions after loading position', async () => {
      // Position already loaded from previous test
      const maiaSection = page.getByTestId('maia-section')
      await expect(maiaSection).toBeVisible()

      // Shows value (win probability)
      const maiaValue = page.getByTestId('maia-value')
      await expect(maiaValue).toBeVisible()
      await expect(maiaValue).toContainText(/%/)

      // Shows predicted moves with percentages
      const maiaMoves = page.getByTestId('maia-moves')
      await expect(maiaMoves).toBeVisible()
      await expect(maiaMoves).toContainText(/%/)
    })

    test('evaluations update when navigating', async () => {
      const sfEval = page.getByTestId('sf-eval')
      const maiaMoves = page.getByTestId('maia-moves')

      // Game was loaded in previous test - go to start first
      await page.getByTestId('nav-start').click()
      await expect(maiaMoves).toBeVisible({ timeout: EVAL_TIMEOUT })

      // Navigate to end
      await page.getByTestId('nav-end').click()
      await expect(sfEval).toBeVisible({ timeout: EVAL_TIMEOUT })

      // Click a specific move
      await page.getByTestId('move-0').click()
      await expect(sfEval).toBeVisible({ timeout: EVAL_TIMEOUT })
    })

    test('no console errors during engine operations', async () => {
      expect(consoleErrors).toEqual([])
    })
  })
})
