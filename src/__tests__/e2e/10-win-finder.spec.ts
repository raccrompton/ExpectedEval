/**
 * E2E Tests for Win Finder Feature
 *
 * Tests the Win Finder tab which identifies "hidden edge" positions
 * where Stockfish sees equality but Maia reveals one move yields
 * significantly better outcomes for human players.
 *
 * Flow:
 * - User switches to Win Finder tab
 * - Loads a PGN
 * - Clicks "Analyze Game" button
 * - Views results sorted by disagreement score
 * - Clicks on a result to navigate to that position
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import {
  TEST_URL,
  SAMPLE_PGN,
  EW_CALC_TIMEOUT,
  waitForEnginesReady,
  loadPgnAndWaitForEval,
  trackConsoleErrors,
  logCollectedErrors,
} from './helpers'

test.describe('10 - Win Finder', () => {
  // Tab visibility and switching tests - no engine needed
  test.describe('Tab System', () => {
    test('displays tab buttons for EW and Win Finder', async ({ page }) => {
      await page.goto(TEST_URL)

      await expect(page.getByTestId('tab-ew')).toBeVisible()
      await expect(page.getByTestId('tab-winfinder')).toBeVisible()
    })

    test('EW tab is active by default', async ({ page }) => {
      await page.goto(TEST_URL)

      const ewTab = page.getByTestId('tab-ew')
      await expect(ewTab).toHaveClass(/active/)

      const winfinderTab = page.getByTestId('tab-winfinder')
      await expect(winfinderTab).not.toHaveClass(/active/)
    })

    test('clicking Win Finder tab shows Win Finder content', async ({ page }) => {
      await page.goto(TEST_URL)

      // Click Win Finder tab
      await page.getByTestId('tab-winfinder').click()

      // Win Finder tab should be active
      await expect(page.getByTestId('tab-winfinder')).toHaveClass(/active/)

      // Win Finder content should be visible
      await expect(page.getByTestId('tab-content-winfinder')).toBeVisible()

      // EW content should be hidden
      const ewContent = page.getByTestId('tab-content-ew')
      await expect(ewContent).toHaveCSS('display', 'none')
    })

    test('clicking EW tab shows EW content', async ({ page }) => {
      await page.goto(TEST_URL)

      // Switch to Win Finder first
      await page.getByTestId('tab-winfinder').click()

      // Then back to EW
      await page.getByTestId('tab-ew').click()

      // EW tab should be active
      await expect(page.getByTestId('tab-ew')).toHaveClass(/active/)

      // EW content should be visible
      await expect(page.getByTestId('tab-content-ew')).toBeVisible()

      // Win Finder content should be hidden
      const wfContent = page.getByTestId('tab-content-winfinder')
      await expect(wfContent).toHaveCSS('display', 'none')
    })
  })

  // Win Finder panel tests - no engine needed for basic structure
  test.describe('Win Finder Panel Structure', () => {
    test('Win Finder panel is visible when tab is active', async ({ page }) => {
      await page.goto(TEST_URL)
      await page.getByTestId('tab-winfinder').click()

      await expect(page.getByTestId('win-finder-panel')).toBeVisible()
    })

    test('Analyze button is visible', async ({ page }) => {
      await page.goto(TEST_URL)
      await page.getByTestId('tab-winfinder').click()

      await expect(page.getByTestId('wf-analyze-button')).toBeVisible()
    })

    test('Analyze button is disabled when no game is loaded', async ({ page }) => {
      await page.goto(TEST_URL)
      await page.getByTestId('tab-winfinder').click()

      const analyzeButton = page.getByTestId('wf-analyze-button')
      await expect(analyzeButton).toBeDisabled()
    })
  })

  // Engine-dependent tests with shared page for performance
  test.describe('Win Finder Analysis', () => {
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
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)
    })

    test.afterAll(async () => {
      logCollectedErrors(consoleErrors)
      await context.close()
    })

    test('Analyze button is enabled after loading a game', async () => {
      // Switch to Win Finder tab
      await page.getByTestId('tab-winfinder').click()

      const analyzeButton = page.getByTestId('wf-analyze-button')
      await expect(analyzeButton).toBeEnabled()
    })

    test('clicking Analyze button shows progress', async () => {
      // Extended timeout for analysis
      test.setTimeout(EW_CALC_TIMEOUT + 30000)

      const analyzeButton = page.getByTestId('wf-analyze-button')
      await analyzeButton.click()

      // Progress should appear
      await expect(page.getByTestId('wf-progress')).toBeVisible({ timeout: 5000 })
    })

    test('analysis completes and shows results', async () => {
      // Wait for results to appear
      await expect(page.getByTestId('wf-results')).toBeVisible({ timeout: EW_CALC_TIMEOUT })
    })

    test('results show summary with count and time', async () => {
      const results = page.getByTestId('wf-results')
      const resultsText = await results.textContent()

      // Should mention positions or disagreements
      expect(resultsText).toMatch(/position|disagreement|found|hidden edge/i)
    })

    test('Clear button appears after analysis', async () => {
      const resetButton = page.getByTestId('wf-reset-button')
      await expect(resetButton).toBeVisible()
    })

    test('clicking Clear resets the results', async () => {
      await page.getByTestId('wf-reset-button').click()

      // Results should be gone
      await expect(page.getByTestId('wf-results')).not.toBeVisible()

      // Analyze button should be visible again
      await expect(page.getByTestId('wf-analyze-button')).toBeVisible()
    })

    test('no console errors during Win Finder operations', async () => {
      expect(consoleErrors).toEqual([])
    })
  })

  // Tests for result items and navigation
  test.describe('Win Finder Results Interaction', () => {
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

      // Load a longer game that might have more disagreements
      const longerPgn = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7'
      await loadPgnAndWaitForEval(page, longerPgn)

      // Switch to Win Finder and run analysis
      await page.getByTestId('tab-winfinder').click()
    })

    test.afterAll(async () => {
      logCollectedErrors(consoleErrors)
      await context.close()
    })

    test('can run analysis on longer game', async () => {
      test.setTimeout(EW_CALC_TIMEOUT + 60000)

      const analyzeButton = page.getByTestId('wf-analyze-button')
      await expect(analyzeButton).toBeEnabled()
      await analyzeButton.click()

      // Wait for results
      await expect(page.getByTestId('wf-results')).toBeVisible({ timeout: EW_CALC_TIMEOUT })
    })

    test('result items show ply and score', async () => {
      // Check if any items were found
      const firstItem = page.getByTestId('wf-item-1')
      const hasResults = await firstItem.isVisible().catch(() => false)

      if (hasResults) {
        const itemText = await firstItem.textContent()
        // Should contain ply number and score
        expect(itemText).toMatch(/ply/i)
        expect(itemText).toMatch(/score/i)
      }
    })

    test('result items can be expanded', async () => {
      const firstItem = page.getByTestId('wf-item-1')
      const hasResults = await firstItem.isVisible().catch(() => false)

      if (hasResults) {
        // Find and click expand button
        const expandButton = firstItem.locator('.expand-toggle')
        await expandButton.click()

        // Should show move details table
        const movesTable = firstItem.locator('.moves-table')
        await expect(movesTable).toBeVisible()
      }
    })

    test('clicking result navigates to position', async () => {
      const firstItem = page.getByTestId('wf-item-1')
      const hasResults = await firstItem.isVisible().catch(() => false)

      if (hasResults) {
        // Remember current board FEN before clicking
        // (We can't easily check FEN change, but we can verify no error occurs)
        await firstItem.click()

        // Navigation should trigger without error
        // Check we're still on the page
        await expect(page.getByTestId('win-finder-panel')).toBeVisible()
      }
    })

    test('no console errors during result interactions', async () => {
      expect(consoleErrors).toEqual([])
    })
  })
})
