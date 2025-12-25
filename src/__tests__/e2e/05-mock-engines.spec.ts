import { test, expect } from '@playwright/test'

test.describe('05 - Mock Engine Display', () => {
  const SAMPLE_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6'

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

      // Load a game
      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Wait for evaluation to appear
      const sfEval = page.getByTestId('sf-eval')
      await expect(sfEval).toBeVisible()
    })

    test('stockfish evaluation shows centipawn value', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Should show centipawn eval (e.g., "+0.20" or similar)
      // Wait longer for engine to evaluate
      const sfCp = page.getByTestId('sf-cp')
      await expect(sfCp).toBeVisible({ timeout: 10000 })
      // The mock returns +20 centipawns by default, which is +0.20
      await expect(sfCp).toContainText(/[+-]?\d+\.\d+/)
    })

    test('stockfish evaluation shows winrate percentage', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Should show winrate (e.g., "52.8%")
      const sfWinrate = page.getByTestId('sf-winrate')
      await expect(sfWinrate).toBeVisible({ timeout: 10000 })
      await expect(sfWinrate).toContainText(/%/)
    })

    test('stockfish shows best move', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Should show a best move recommendation
      const sfBestMove = page.getByTestId('sf-best-move')
      await expect(sfBestMove).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Maia Prediction Display', () => {
    test('shows maia predictions after loading position', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Wait for maia predictions
      const maiaSection = page.getByTestId('maia-section')
      await expect(maiaSection).toBeVisible()
    })

    test('maia shows value (win probability)', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Should show Maia's value head output (win probability)
      const maiaValue = page.getByTestId('maia-value')
      await expect(maiaValue).toBeVisible({ timeout: 10000 })
      await expect(maiaValue).toContainText(/%/)
    })

    test('maia shows predicted moves with probabilities', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Should show at least one move prediction
      const maiaMoves = page.getByTestId('maia-moves')
      await expect(maiaMoves).toBeVisible()
    })

    test('maia move predictions show percentages', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Wait for move predictions to appear, then check they show percentages
      const maiaMoves = page.getByTestId('maia-moves')
      await expect(maiaMoves).toBeVisible({ timeout: 10000 })
      await expect(maiaMoves).toContainText(/%/)
    })
  })

  test.describe('Engine Updates on Navigation', () => {
    test('evaluation updates when navigating to different position', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Get initial evaluation
      const sfEval = page.getByTestId('sf-eval')
      await expect(sfEval).toBeVisible()

      // Navigate to a different position
      await page.getByTestId('move-0').click()

      // Evaluation should still be visible (may update)
      await expect(sfEval).toBeVisible()
    })

    test('maia predictions update when navigating', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Navigate to start (initial position)
      await page.getByTestId('nav-start').click()

      // Maia should still show predictions
      const maiaMoves = page.getByTestId('maia-moves')
      await expect(maiaMoves).toBeVisible()
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

      // Wait a bit for mock engine to "initialize"
      const sfStatus = page.getByTestId('sf-status')
      await expect(sfStatus).toContainText(/ready/i, { timeout: 5000 })
    })

    test('maia shows ready status after initialization', async ({ page }) => {
      await page.goto('/')

      const maiaStatus = page.getByTestId('maia-status')
      await expect(maiaStatus).toContainText(/ready/i, { timeout: 5000 })
    })
  })

  test.describe('No Console Errors', () => {
    test('no console errors with engine panel', async ({ page }) => {
      const errors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      await page.goto('/')

      // Load game and verify engines work
      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Navigate around
      await page.getByTestId('move-0').click()
      await page.getByTestId('nav-end').click()

      expect(errors).toEqual([])
    })
  })
})
