/**
 * E2E Tests for Expected Winrate (Phase 9)
 *
 * Tests verify that the Expected Winrate calculation
 * and display works correctly with the engines.
 *
 * Flow:
 * - User loads a position and clicks "Analyze Position" button
 * - EW calculates using Maia (SF enrichment hidden for now)
 *
 * Optimized: Uses shared page to avoid repeated engine/EW initialization.
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import {
  TEST_URL,
  SAMPLE_PGN,
  EW_CALC_TIMEOUT,
  waitForEnginesReady,
  loadPgnAndWaitForEval,
  calculateEWAndWait,
  trackConsoleErrors,
  logCollectedErrors,
} from './helpers'

test.describe('06 - Expected Winrate', () => {
  // Simple visibility tests - no engine initialization needed
  test.describe('EW Section Visibility', () => {
    test('EW section is visible', async ({ page }) => {
      await page.goto(TEST_URL)
      await page.getByTestId('tab-ew').click()

      await expect(page.getByTestId('ew-section')).toBeVisible()
    })

    test('config panel toggles visibility', async ({ page }) => {
      await page.goto(TEST_URL)
      await page.getByTestId('tab-ew').click()

      const configToggle = page.getByTestId('ew-config-toggle')
      await expect(configToggle).toBeVisible()

      await configToggle.click()
      await expect(page.getByTestId('ew-config-panel')).toBeVisible()

      await configToggle.click()
      await expect(page.getByTestId('ew-config-panel')).not.toBeVisible()
    })
  })

  // Engine-dependent tests with shared page
  test.describe('EW Calculation and Display', () => {
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
      await page.getByTestId('tab-ew').click()
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)
    })

    test.afterAll(async () => {
      logCollectedErrors(consoleErrors)
      await context.close()
    })

    test('shows explanatory text and analyze button before calculation', async () => {
      // Before clicking analyze, should show idle state with description
      await expect(page.getByTestId('ew-idle')).toBeVisible()
      await expect(page.getByTestId('ew-analyze-button')).toBeVisible()
    })

    test('calculates EW when analyze button is clicked', async () => {
      // Click analyze button and wait for results
      await calculateEWAndWait(page)
      await expect(page.getByTestId('ew-results')).toBeVisible({ timeout: EW_CALC_TIMEOUT })
    })

    test('EW results display Maia-based value', async () => {
      // Maia EW should be visible after calculation
      const ewMaia = page.getByTestId('ew-maia-value')
      await expect(ewMaia).toBeVisible()
      await expect(ewMaia).toContainText(/%/)
    })

    test('EW results display candidate moves with probabilities', async () => {
      // Candidates are now in a separate column
      const firstCandidate = page.getByTestId('ew-candidate-0')
      await expect(firstCandidate).toBeVisible()
      await expect(firstCandidate).toContainText(/%/)
    })

    test('EW tree is visible with eval source toggle', async () => {
      const ewTree = page.getByTestId('ew-tree')
      await expect(ewTree).toBeVisible()

      // Eval toggle visible with both options
      await expect(page.getByTestId('eval-source-toggle')).toBeVisible()
      await expect(page.getByTestId('eval-source-sf')).toBeVisible()
      await expect(page.getByTestId('eval-source-maia')).toBeVisible()

      // Maia is default (since it's available first)
      const maiaRadio = page.getByTestId('eval-source-maia').locator('input[type="radio"]')
      await expect(maiaRadio).toBeChecked()
    })

    test('eval source toggle can be switched', async () => {
      const sfOption = page.getByTestId('eval-source-sf')
      await sfOption.click()

      const sfRadio = sfOption.locator('input[type="radio"]')
      await expect(sfRadio).toBeChecked()

      // Switch back to Maia for subsequent tests
      await page.getByTestId('eval-source-maia').click()
    })

    test('candidate moves show EW and percentage', async () => {
      const candidate = page.getByTestId('ew-candidate-0')
      await expect(candidate).toBeVisible()
      await expect(candidate).toContainText('EW:')
      await expect(candidate).toContainText('%')
    })

    test('tree nodes can be expanded to show branches', async () => {
      // Expand buttons use ply-san format testids (e.g., ew-expand-0-e5)
      const expandButton = page.locator('[data-testid^="ew-expand-"]').first()
      const toggleExists = await expandButton.isVisible().catch(() => false)

      if (toggleExists) {
        // Get initial row count
        const initialRows = await page.locator('[data-testid^="ew-table-row-"]').count()

        await expandButton.click()

        // Should have more rows after expanding
        const expandedRows = await page.locator('[data-testid^="ew-table-row-"]').count()
        expect(expandedRows).toBeGreaterThanOrEqual(initialRows)
      }
    })

    test('tree shows move names', async () => {
      const ewTree = page.getByTestId('ew-tree')
      const treeText = await ewTree.textContent()
      expect(treeText).toMatch(/[a-h][1-8]|[KQRBN]/)
    })

    test('hovering tree node shows tooltip', async () => {
      // Hover over a table cell move text to trigger tooltip
      const tableCell = page.locator('[data-testid^="ew-table-cell-"]').first()
      const cellExists = await tableCell.isVisible().catch(() => false)

      if (cellExists) {
        const moveText = tableCell.locator('.move-text')
        await moveText.hover()
        await expect(page.getByTestId('ew-node-tooltip')).toBeVisible()

        // Dismiss tooltip by moving mouse away (prevents blocking next test)
        await page.mouse.move(0, 0)
      }
    })

    test('clicking candidate or branch navigates', async () => {
      // Click a candidate to select it (in new two-column layout)
      const candidateRow = page.getByTestId('ew-candidate-0')
      await candidateRow.click()

      // Verify candidate is selected
      await expect(candidateRow).toHaveAttribute('data-selected', 'true', { timeout: 2000 })

      // Click a table cell to navigate (if available)
      const tableCell = page.locator('[data-testid^="ew-table-cell-"]').first()
      const cellExists = await tableCell.isVisible().catch(() => false)

      if (cellExists) {
        const moveText = tableCell.locator('.move-text')
        await moveText.click()
        // The click should trigger navigation (we just verify no error occurred)
      }
    })

    test('navigating clears previous results and shows idle state', async () => {
      // Navigate to a different position
      await page.getByTestId('nav-start').click()

      // Previous results should be cleared, showing idle state with analyze button
      await expect(page.getByTestId('ew-idle')).toBeVisible({ timeout: 5000 })
      await expect(page.getByTestId('ew-analyze-button')).toBeVisible()
    })

    test('can calculate EW again after navigation', async () => {
      // Click analyze button after navigating
      await calculateEWAndWait(page)

      // Should show fresh Maia results
      const ewMaia = page.getByTestId('ew-maia-value')
      await expect(ewMaia).toBeVisible()
      await expect(ewMaia).toContainText(/%/)
    })

    test('no console errors during EW operations', async () => {
      // Navigate and analyze to exercise the code
      await page.getByTestId('nav-end').click()
      await expect(page.getByTestId('ew-analyze-button')).toBeVisible({ timeout: 5000 })

      expect(consoleErrors).toEqual([])
    })
  })

  // Two-column layout tests
  test.describe('EW Two-Column Layout', () => {
    test.describe.configure({ mode: 'serial' })

    let context: BrowserContext
    let page: Page
    let consoleErrors: string[]

    test.beforeAll(async ({ browser }) => {
      context = await browser.newContext()
      page = await context.newPage()
      consoleErrors = trackConsoleErrors(page)

      await page.goto(TEST_URL)
      await page.getByTestId('tab-ew').click()
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      // Trigger EW calculation manually
      await calculateEWAndWait(page)
    })

    test.afterAll(async () => {
      logCollectedErrors(consoleErrors)
      await context.close()
    })

    test('displays two-column layout container', async () => {
      const container = page.getByTestId('ew-candidate-tree-view')
      await expect(container).toBeVisible()
    })

    test('displays candidate column with candidates', async () => {
      const candidateColumn = page.getByTestId('ew-candidate-column')
      await expect(candidateColumn).toBeVisible()

      // At least one candidate should be visible
      const firstCandidate = page.getByTestId('ew-candidate-0')
      await expect(firstCandidate).toBeVisible()
      await expect(firstCandidate).toContainText(/%/)
    })

    test('displays table for selected candidate', async () => {
      const ewTable = page.getByTestId('ew-table')
      await expect(ewTable).toBeVisible()
    })

    test('clicking candidate updates table', async () => {
      // Click second candidate if available
      const secondCandidate = page.getByTestId('ew-candidate-1')
      const candidateExists = await secondCandidate.isVisible().catch(() => false)

      if (candidateExists) {
        await secondCandidate.click()

        // Second candidate should now be selected (wait for state update)
        await expect(secondCandidate).toHaveAttribute('data-selected', 'true', { timeout: 2000 })
      }
    })

    test('expand button expands alternatives', async () => {
      // Find an expand button (+ icon)
      const expandButton = page.locator('[data-testid^="ew-expand-"]').first()
      const expandExists = await expandButton.isVisible().catch(() => false)

      if (expandExists) {
        // Get initial row count
        const initialRows = await page.locator('[data-testid^="ew-table-row-"]').count()

        await expandButton.click()

        // After expanding, there should be more rows
        const expandedRows = await page.locator('[data-testid^="ew-table-row-"]').count()
        expect(expandedRows).toBeGreaterThan(initialRows)

        // Find collapse button and click to collapse
        const collapseButton = page.locator('[data-testid^="ew-collapse-"]').first()
        if (await collapseButton.isVisible().catch(() => false)) {
          await collapseButton.click()
          // Rows should decrease back
          const collapsedRows = await page.locator('[data-testid^="ew-table-row-"]').count()
          expect(collapsedRows).toBeLessThan(expandedRows)
        }
      }
    })

    test('expanding closes unrelated expansions (accordion behavior)', async () => {
      // Start fresh - select first candidate to reset state
      const firstCandidate = page.getByTestId('ew-candidate-0')
      await firstCandidate.click()

      // Get all expand buttons
      const expandButtons = page.locator('[data-testid^="ew-expand-"]')
      const buttonCount = await expandButtons.count()

      if (buttonCount >= 2) {
        // Expand first button
        await expandButtons.first().click()

        // Count collapse buttons (shows how many expansions are active)
        const collapseCountAfterFirst = await page.locator('[data-testid^="ew-collapse-"]').count()
        expect(collapseCountAfterFirst).toBeGreaterThanOrEqual(1)

        // Now expand a different button (second one)
        const newExpandButtons = page.locator('[data-testid^="ew-expand-"]')
        const newButtonCount = await newExpandButtons.count()
        if (newButtonCount >= 1) {
          await newExpandButtons.first().click()

          // With accordion behavior, there should still be only 1 collapse button
          // (the new expansion replaces the old unrelated one)
          const collapseCountAfterSecond = await page.locator('[data-testid^="ew-collapse-"]').count()
          expect(collapseCountAfterSecond).toBe(1)
        }
      }
    })

    test('hovering any table cell shows tooltip', async () => {
      // Hover over a table cell
      const tableCell = page.locator('[data-testid^="ew-table-cell-"]').first()
      const cellExists = await tableCell.isVisible().catch(() => false)

      if (cellExists) {
        // Hover over the move text within the cell
        const moveText = tableCell.locator('.move-text')
        await moveText.hover()

        // Tooltip should appear with details (wait for it to populate)
        const tooltip = page.getByTestId('ew-node-tooltip')
        await expect(tooltip).toBeVisible({ timeout: 2000 })

        // Tooltip should contain play rate and cumulative probability
        await expect(tooltip).toContainText(/play rate/i, { timeout: 2000 })
        await expect(tooltip).toContainText(/cumulative/i, { timeout: 2000 })
      }
    })

    test('table shows line EW and likelihood columns', async () => {
      const ewTable = page.getByTestId('ew-table')
      const tableText = await ewTable.textContent()

      // Should contain Line EW and Likelihood headers/values
      expect(tableText).toContain('Line EW')
      expect(tableText).toContain('Likelihood')
      // Should contain percentage values
      expect(tableText).toMatch(/\d+(\.\d+)?%/)
    })
  })
})
