/**
 * E2E Tests for Real Engine Integration (Phase 10)
 *
 * These tests verify that the real Stockfish and Maia engines
 * load and evaluate positions correctly in the browser.
 *
 * Focuses on:
 * - Engine initialization and ready states
 * - Realistic evaluation values and ranges
 * - Performance within acceptable timeouts
 *
 * Optimized: Uses shared page to avoid repeated engine initialization.
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import {
  TEST_URL,
  SAMPLE_PGN,
  ENGINE_INIT_TIMEOUT,
  EVAL_TIMEOUT,
  MIN_REASONABLE_SF_WINRATE,
  MAX_REASONABLE_SF_WINRATE,
  MIN_REASONABLE_MAIA_VALUE,
  MAX_REASONABLE_MAIA_VALUE,
  waitForEnginesReady,
  loadPgnAndWaitForEval,
  trackConsoleErrors,
  logCollectedErrors,
} from './helpers'

test.describe('07 - Real Engine Integration', () => {
  // Run serially since tests share page state
  test.describe.configure({ mode: 'serial' })

  let context: BrowserContext
  let page: Page
  let consoleErrors: string[]
  let initStartTime: number

  test.beforeAll(async ({ browser }) => {
    initStartTime = Date.now()
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

  test.describe('Engine Initialization', () => {
    test('both engines initialize and show ready status', async () => {
      await expect(page.getByTestId('sf-status')).toContainText(/ready/i)
      await expect(page.getByTestId('maia-status')).toContainText(/ready/i)
    })

    test('engines initialize within acceptable timeout', async () => {
      const initTime = Date.now() - initStartTime
      console.log(`Engine initialization time: ${initTime}ms`)
      expect(initTime).toBeLessThan(ENGINE_INIT_TIMEOUT)
    })
  })

  test.describe('Stockfish Evaluation Quality', () => {
    test('stockfish provides valid centipawn evaluation', async () => {
      await loadPgnAndWaitForEval(page, '1. e4')

      const sfCp = page.getByTestId('sf-cp')
      const cpText = await sfCp.textContent()
      expect(cpText).toBeTruthy()
      expect(cpText).toMatch(/[+-]?\d+\.\d+/)
    })

    test('stockfish winrate is in reasonable range for normal positions', async () => {
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      const sfWinrate = page.getByTestId('sf-winrate')
      const winrateText = await sfWinrate.textContent()
      // Now displays WDL (Win/Draw/Loss) in format W/D/L
      expect(winrateText).toMatch(/\d+\/\d+\/\d+/)

      // Parse WDL format: win/draw/loss
      const match = winrateText?.match(/(\d+)\/(\d+)\/(\d+)/)
      if (match) {
        const win = parseInt(match[1])
        const draw = parseInt(match[2])
        const loss = parseInt(match[3])
        // In equal positions, neither win nor loss should be extreme
        // High draw percentage is expected for normal opening positions
        expect(win + draw + loss).toBeGreaterThanOrEqual(99)
        expect(win + draw + loss).toBeLessThanOrEqual(101)
        // Neither side should have a decisive advantage (win or loss > 50%)
        expect(win).toBeLessThan(50)
        expect(loss).toBeLessThan(50)
      }
    })

    test('stockfish provides best move recommendation', async () => {
      const sfBestMove = page.getByTestId('sf-best-move')
      await expect(sfBestMove).toBeVisible()

      const moveText = await sfBestMove.textContent()
      expect(moveText).toBeTruthy()
      expect(moveText!.length).toBeGreaterThan(0)
    })

    test('stockfish evaluations are reasonable when Black is to move', async () => {
      // Load a position where Black is to move (after 1. e4)
      await loadPgnAndWaitForEval(page, '1. e4')

      // Get the centipawn evaluation - should be slightly negative from Black's perspective
      // (White just played e4, a good opening move, so Black is slightly behind)
      const sfCp = page.getByTestId('sf-cp')
      const cpText = await sfCp.textContent()
      expect(cpText).toBeTruthy()

      // Parse the centipawn value
      const match = cpText?.match(/([+-]?\d+\.\d+)/)
      expect(match).toBeTruthy()

      const cp = parseFloat(match![1])
      // From Black's perspective after 1. e4, evaluation should be around -0.5 to +0.5
      // NOT wildly positive like +3.0 or higher (which would indicate wrong perspective)
      expect(cp).toBeGreaterThan(-2.0) // Not losing badly
      expect(cp).toBeLessThan(1.0) // Not wildly winning (wrong perspective bug)
    })
  })

  test.describe('Maia Evaluation Quality', () => {
    test('maia provides move probabilities with percentages', async () => {
      const maiaMoves = page.getByTestId('maia-moves')
      await expect(maiaMoves).toBeVisible({ timeout: EVAL_TIMEOUT })

      const movesText = await maiaMoves.textContent()
      expect(movesText).toMatch(/%/)
    })

    test('maia value is in reasonable range for opening positions', async () => {
      const maiaValue = page.getByTestId('maia-value')
      await expect(maiaValue).toBeVisible({ timeout: EVAL_TIMEOUT })

      const valueText = await maiaValue.textContent()
      expect(valueText).toMatch(/%/)

      const match = valueText?.match(/(\d+(?:\.\d+)?)%/)
      if (match) {
        const value = parseFloat(match[1])
        expect(value).toBeGreaterThan(MIN_REASONABLE_MAIA_VALUE)
        expect(value).toBeLessThan(MAX_REASONABLE_MAIA_VALUE)
      }
    })
  })

  test.describe('Engine Updates on Navigation', () => {
    test('evaluations update when navigating through moves', async () => {
      // Reload SAMPLE_PGN to ensure we have a multi-move game (previous test may have loaded '1. e4')
      await loadPgnAndWaitForEval(page, SAMPLE_PGN)

      // Go to start first
      await page.getByTestId('nav-start').click()
      await expect(page.getByTestId('maia-moves')).toBeVisible({ timeout: EVAL_TIMEOUT })

      // Navigate forward
      await page.getByTestId('nav-forward').click()
      await expect(page.getByTestId('sf-eval')).toBeVisible({ timeout: EVAL_TIMEOUT })

      // Navigate to end (should work since SAMPLE_PGN has 6 half-moves)
      await page.getByTestId('nav-end').click()
      await expect(page.getByTestId('sf-eval')).toBeVisible({ timeout: EVAL_TIMEOUT })
      await expect(page.getByTestId('maia-moves')).toBeVisible({ timeout: EVAL_TIMEOUT })
    })
  })

  test.describe('Performance', () => {
    test('evaluation completes within reasonable time', async () => {
      // Navigate to start first, then measure time to go to end
      await page.getByTestId('nav-start').click()
      await expect(page.getByTestId('sf-cp')).toBeVisible({ timeout: EVAL_TIMEOUT })

      const startTime = Date.now()
      await page.getByTestId('nav-end').click()
      await expect(page.getByTestId('sf-cp')).toBeVisible({ timeout: EVAL_TIMEOUT })
      const evalTime = Date.now() - startTime

      console.log(`Evaluation time: ${evalTime}ms`)
      expect(evalTime).toBeLessThan(EVAL_TIMEOUT)
    })
  })

  test.describe('Error Handling', () => {
    test('no critical console errors during engine operations', async () => {
      expect(consoleErrors).toEqual([])
    })
  })
})
