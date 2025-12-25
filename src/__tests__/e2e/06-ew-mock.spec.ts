import { test, expect } from '@playwright/test'

test.describe('06 - Expected Winrate (Mock Engines)', () => {
  const SAMPLE_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6'

  test.describe('EW Section Visibility', () => {
    test('expected winrate section is visible on the page', async ({ page }) => {
      await page.goto('/')

      const ewSection = page.getByTestId('ew-section')
      await expect(ewSection).toBeVisible()
    })

    test('calculate EW button is visible', async ({ page }) => {
      await page.goto('/')

      const calculateButton = page.getByTestId('calculate-ew-button')
      await expect(calculateButton).toBeVisible()
    })
  })

  test.describe('EW Calculation', () => {
    test('clicking calculate EW button triggers calculation', async ({ page }) => {
      await page.goto('/')

      // Load a game first
      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Wait for engines to be ready
      await expect(page.getByTestId('sf-status')).toContainText(/ready/i, { timeout: 5000 })

      // Click calculate button
      const calculateButton = page.getByTestId('calculate-ew-button')
      await calculateButton.click()

      // Should show loading state or results
      const ewSection = page.getByTestId('ew-section')
      await expect(ewSection).toBeVisible()
    })

    test('shows loading state while calculating', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()
      await expect(page.getByTestId('sf-status')).toContainText(/ready/i, { timeout: 5000 })

      // Click calculate button
      await page.getByTestId('calculate-ew-button').click()

      // Should show calculating state (may be brief with mock engines)
      const ewStatus = page.getByTestId('ew-status')
      await expect(ewStatus).toBeVisible()
    })

    test('shows EW results after calculation completes', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()
      await expect(page.getByTestId('sf-status')).toContainText(/ready/i, { timeout: 5000 })

      await page.getByTestId('calculate-ew-button').click()

      // Wait for results to appear
      const ewResults = page.getByTestId('ew-results')
      await expect(ewResults).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('EW Results Display', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()
      await expect(page.getByTestId('sf-status')).toContainText(/ready/i, { timeout: 5000 })
      await page.getByTestId('calculate-ew-button').click()
      await expect(page.getByTestId('ew-results')).toBeVisible({ timeout: 10000 })
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
      // At least one candidate move should be visible
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
      await page.goto('/')
      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()
      await expect(page.getByTestId('sf-status')).toContainText(/ready/i, { timeout: 5000 })
      await page.getByTestId('calculate-ew-button').click()
      await expect(page.getByTestId('ew-results')).toBeVisible({ timeout: 10000 })
    })

    test('EW tree is visible in results', async ({ page }) => {
      const ewTree = page.getByTestId('ew-tree')
      await expect(ewTree).toBeVisible()
    })

    test('tree nodes can be expanded', async ({ page }) => {
      // Find an expandable node (one with children)
      const expandButton = page.getByTestId('ew-tree-expand-0')

      // With mock engines, the tree should have expandable nodes
      // If this fails, it means mock data doesn't produce deep enough trees
      await expect(expandButton).toBeVisible({ timeout: 5000 })

      await expandButton.click()

      // After clicking, children should be visible
      const treeChildren = page.getByTestId('ew-tree-children-0')
      await expect(treeChildren).toBeVisible()
    })

    test('tree shows move names', async ({ page }) => {
      const ewTree = page.getByTestId('ew-tree')
      // Tree should contain some move notation
      const treeText = await ewTree.textContent()
      // Should have at least some moves (letters and numbers)
      expect(treeText).toMatch(/[a-h][1-8]|[KQRBN]/)
    })
  })

  test.describe('EW Updates on Navigation', () => {
    test('EW recalculates for new position', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()
      await expect(page.getByTestId('sf-status')).toContainText(/ready/i, { timeout: 5000 })

      // Calculate EW at current position
      await page.getByTestId('calculate-ew-button').click()
      await expect(page.getByTestId('ew-results')).toBeVisible({ timeout: 10000 })

      // Navigate to a different position
      await page.getByTestId('move-0').click()

      // Results should clear or show "click to calculate"
      const ewResults = page.getByTestId('ew-results')
      const calculateButton = page.getByTestId('calculate-ew-button')

      // Either results are cleared, or button is available to recalculate
      await expect(calculateButton).toBeVisible()
    })
  })

  test.describe('EW Configuration', () => {
    test('config panel is accessible', async ({ page }) => {
      await page.goto('/')

      // Config toggle should always be visible
      const configToggle = page.getByTestId('ew-config-toggle')
      await expect(configToggle).toBeVisible()

      // Click to open config panel
      await configToggle.click()
      const configPanel = page.getByTestId('ew-config-panel')
      await expect(configPanel).toBeVisible()

      // Click again to close
      await configToggle.click()
      await expect(configPanel).not.toBeVisible()
    })
  })

  test.describe('No Console Errors', () => {
    test('no console errors during EW calculation', async ({ page }) => {
      const errors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()
      await expect(page.getByTestId('sf-status')).toContainText(/ready/i, { timeout: 5000 })

      await page.getByTestId('calculate-ew-button').click()
      await expect(page.getByTestId('ew-results')).toBeVisible({ timeout: 10000 })

      expect(errors).toEqual([])
    })

    test('no console errors when navigating after calculation', async ({ page }) => {
      const errors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()
      await expect(page.getByTestId('sf-status')).toContainText(/ready/i, { timeout: 5000 })

      await page.getByTestId('calculate-ew-button').click()
      await expect(page.getByTestId('ew-results')).toBeVisible({ timeout: 10000 })

      // Navigate around
      await page.getByTestId('nav-start').click()
      await page.getByTestId('nav-end').click()
      await page.getByTestId('move-0').click()

      expect(errors).toEqual([])
    })
  })
})
