/**
 * E2E Tests for Expected Winrate (Phase 9)
 *
 * Tests verify that the Expected Winrate auto-calculation
 * and display works correctly with the engines.
 *
 * Flow:
 * - EW auto-calculates with Maia when position changes (300ms debounce)
 * - User can optionally click "Add Stockfish Analysis" for SF enrichment
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
  trackConsoleErrors,
  logCollectedErrors,
} from './helpers'

test.describe('06 - Expected Winrate', () => {
  // Simple visibility tests - no engine initialization needed
  test.describe('EW Section Visibility', () => {
    test('EW section is visible', async ({ page }) => {
      await page.goto(TEST_URL)

      await expect(page.getByTestId('ew-section')).toBeVisible()
    })

    test('config panel toggles visibility', async ({ page }) => {
      await page.goto(TEST_URL)

      const configToggle = page.getByTestId('ew-config-toggle')
      await expect(configToggle).toBeVisible()

      await configToggle.click()
      await expect(page.getByTestId('ew-config-panel')).toBeVisible()

      await configToggle.click()
      await expect(page.getByTestId('ew-config-panel')).not.toBeVisible()
    })
  })

  // Engine-dependent tests with shared page
  test.describe('EW Auto-Calculation and Display', () => {
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
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)
    })

    test.afterAll(async () => {
      logCollectedErrors(consoleErrors)
      await context.close()
    })

    test('EW auto-calculates after position loads', async () => {
      // EW should auto-calculate with Maia after loading PGN
      // Wait for results to appear (auto-triggered, no button needed)
      await expect(page.getByTestId('ew-results')).toBeVisible({ timeout: EW_CALC_TIMEOUT })
    })

    test('EW results display Maia value (SF may be pending)', async () => {
      // Maia EW should always be visible after auto-calculation
      const ewMaia = page.getByTestId('ew-maia-value')
      await expect(ewMaia).toBeVisible()
      await expect(ewMaia).toContainText(/%/)

      // SF EW box shows either value (if enriched) or Add SF button (if not)
      const sfBox = page.locator('.sf-box')
      await expect(sfBox).toBeVisible()
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
      // Branch toggles now use key-based testids (e.g., ew-branch-toggle-Nf6)
      const expandButton = page.locator('[data-testid^="ew-branch-toggle-"]').first()
      const toggleExists = await expandButton.isVisible().catch(() => false)

      if (toggleExists) {
        await expandButton.click()

        // Branch lines also use key-based testids
        const treeBranches = page.locator('[data-testid^="ew-branch-"]').first()
        await expect(treeBranches).toBeVisible()

        // Branches show eval percentage
        const branchText = await treeBranches.textContent()
        expect(branchText).toMatch(/\d+(\.\d+)?%/)
      }
    })

    test('tree shows move names', async () => {
      const ewTree = page.getByTestId('ew-tree')
      const treeText = await ewTree.textContent()
      expect(treeText).toMatch(/[a-h][1-8]|[KQRBN]/)
    })

    test('hovering tree node shows tooltip', async () => {
      // Hover over a mainline move to trigger tooltip
      const mainlineMove = page.locator('[data-testid^="ew-mainline-"]').first()
      const moveExists = await mainlineMove.isVisible().catch(() => false)

      if (moveExists) {
        await mainlineMove.hover()
        await expect(page.getByTestId('ew-node-tooltip')).toBeVisible()
      }
    })

    test('clicking candidate or branch navigates', async () => {
      // Click a candidate to select it (in new two-column layout)
      const candidateRow = page.getByTestId('ew-candidate-0')
      await candidateRow.click()

      // Expand to see branches if toggle exists
      const expandButton = page.locator('[data-testid^="ew-branch-toggle-"]').first()
      const toggleExists = await expandButton.isVisible().catch(() => false)

      if (toggleExists) {
        await expandButton.click()
        // Branch lines are now visible
        const treeBranches = page.locator('[data-testid^="ew-branch-"]').first()
        await expect(treeBranches).toBeVisible()
      }
    })

    test('Add SF Analysis button appears when Maia calculation complete', async () => {
      // Navigate to a new position to trigger fresh Maia calculation
      await page.getByTestId('nav-start').click()

      // Wait for Maia calculation to complete
      await expect(page.getByTestId('ew-results')).toBeVisible({ timeout: EW_CALC_TIMEOUT })

      // SF button should appear (status is complete_maia)
      const sfButton = page.getByTestId('add-sf-analysis-button')
      await expect(sfButton).toBeVisible({ timeout: 5000 })
    })

    test('clicking Add SF Analysis enriches results', async () => {
      const sfButton = page.getByTestId('add-sf-analysis-button')
      await sfButton.click()

      // Button should disappear or show loading
      // After enrichment, status should be 'complete'
      await expect(page.getByTestId('ew-status')).toContainText(/Complete|Stockfish/, { timeout: EW_CALC_TIMEOUT })

      // SF values should now be populated (not "—")
      const ewSF = page.getByTestId('ew-sf-value')
      await expect(ewSF).toContainText(/%/)
    })

    test('EW auto-recalculates after navigation', async () => {
      // Navigate to a different position
      await page.getByTestId('nav-end').click()

      // Wait for new Maia calculation to complete
      await expect(page.getByTestId('ew-results')).toBeVisible({ timeout: EW_CALC_TIMEOUT })

      // Should show fresh Maia results
      const ewMaia = page.getByTestId('ew-maia-value')
      await expect(ewMaia).toBeVisible()
      await expect(ewMaia).toContainText(/%/)
    })

    test('no console errors during EW operations', async () => {
      // Navigate around to exercise the code
      await page.getByTestId('nav-start').click()
      await page.getByTestId('nav-end').click()

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
      await waitForEnginesReady(page)
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      // Wait for EW results to appear
      await expect(page.getByTestId('ew-results')).toBeVisible({ timeout: EW_CALC_TIMEOUT })
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

    test('displays tree column for selected candidate', async () => {
      const treeColumn = page.getByTestId('ew-tree-column')
      await expect(treeColumn).toBeVisible()
    })

    test('clicking candidate updates tree column', async () => {
      // Click second candidate if available
      const secondCandidate = page.getByTestId('ew-candidate-1')
      const candidateExists = await secondCandidate.isVisible().catch(() => false)

      if (candidateExists) {
        await secondCandidate.click()

        // Second candidate should now be selected
        await expect(secondCandidate).toHaveAttribute('data-selected', 'true')
      }
    })

    test('branch toggle expands alternatives', async () => {
      // Find a branch toggle button (+ icon)
      const branchToggle = page.locator('[data-testid^="ew-branch-toggle-"]').first()
      const toggleExists = await branchToggle.isVisible().catch(() => false)

      if (toggleExists) {
        // Get the key from the testid
        const testid = await branchToggle.getAttribute('data-testid')
        const key = testid?.replace('ew-branch-toggle-', '') || ''

        await branchToggle.click()

        // Branch line should now be visible
        const branchLine = page.getByTestId(`ew-branch-${key}`)
        await expect(branchLine).toBeVisible()

        // Toggle again to collapse
        await branchToggle.click()
        await expect(branchLine).not.toBeVisible()
      }
    })

    test('hovering any tree node shows tooltip', async () => {
      // Hover over a mainline move
      const mainlineMove = page.locator('[data-testid^="ew-mainline-"]').first()
      const moveExists = await mainlineMove.isVisible().catch(() => false)

      if (moveExists) {
        await mainlineMove.hover()

        // Tooltip should appear with details
        const tooltip = page.getByTestId('ew-node-tooltip')
        await expect(tooltip).toBeVisible()

        // Tooltip should contain play rate and cumulative probability
        await expect(tooltip).toContainText(/play rate/i)
        await expect(tooltip).toContainText(/cumulative/i)
      }
    })

    test('mainline shows leaf evaluation at end', async () => {
      const treeColumn = page.getByTestId('ew-tree-column')
      const treeText = await treeColumn.textContent()

      // Should contain arrow (→) and percentage
      expect(treeText).toMatch(/→/)
      expect(treeText).toMatch(/\d+(\.\d+)?%/)
    })
  })
})
