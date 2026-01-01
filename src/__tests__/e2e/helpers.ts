/**
 * Shared E2E Test Helpers
 *
 * Common utilities for e2e tests to avoid duplication and ensure consistency.
 *
 * KEY CONCEPTS:
 * - Playwright Page: Browser tab instance for interacting with the app
 * - data-testid: HTML attributes used to reliably select elements in tests
 * - Timeouts: Longer waits for async operations like engine initialization
 * - Console filtering: Ignore expected warnings while catching real errors
 */
import { expect, type Page } from '@playwright/test'

// Environment-aware timeouts (CI environments may be slower)
const isCI = !!process.env.CI

// Engine initialization timeout - allows time for first-time WASM/ONNX download (~165MB)
export const ENGINE_INIT_TIMEOUT = isCI ? 180000 : 120000 // 3 min CI, 2 min local

// Evaluation timeout - time for engine to evaluate a single position
export const EVAL_TIMEOUT = isCI ? 90000 : 60000 // 90s CI, 60s local

// Expected Winrate calculation timeout - time to build and evaluate full EW tree
export const EW_CALC_TIMEOUT = isCI ? 90000 : 60000 // 90s CI, 60s local

// Test URL with fast engine settings (sfDepth=1 for quick evaluations)
export const TEST_URL = '/?sfDepth=1'

// Sample PGN for testing - Ruy Lopez opening, 6 half-moves
export const SAMPLE_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6'

// Winrate validation ranges for normal chess positions
// Opening/middlegame positions shouldn't heavily favor either side
export const MIN_REASONABLE_SF_WINRATE = 30 // Stockfish winrate floor for normal positions
export const MAX_REASONABLE_SF_WINRATE = 70 // Stockfish winrate ceiling for normal positions
export const MIN_REASONABLE_MAIA_VALUE = 20 // Maia can have wider range due to human-like eval
export const MAX_REASONABLE_MAIA_VALUE = 80 // Maia ceiling for opening positions

/**
 * Wait for both Stockfish and Maia engines to be ready.
 * Engines need time to download WASM/ONNX files on first run (~165MB total).
 */
export async function waitForEnginesReady(page: Page): Promise<void> {
  await expect(page.getByTestId('sf-status')).toContainText(/ready/i, {
    timeout: ENGINE_INIT_TIMEOUT,
  })
  await expect(page.getByTestId('maia-status')).toContainText(/ready/i, {
    timeout: ENGINE_INIT_TIMEOUT,
  })
}

/**
 * Load a PGN and wait for Stockfish evaluation to appear.
 * Fills the PGN input, clicks load, and waits for centipawn display.
 */
export async function loadPgnAndWaitForEval(page: Page, pgn: string): Promise<void> {
  await page.getByTestId('pgn-input').fill(pgn)
  await page.getByTestId('load-pgn-button').click()
  await expect(page.getByTestId('sf-cp')).toBeVisible({ timeout: EVAL_TIMEOUT })
}

/**
 * Calculate Expected Winrate and wait for results.
 * Clicks the analyze button and waits for the results section to appear.
 */
export async function calculateEWAndWait(page: Page): Promise<void> {
  await page.getByTestId('ew-analyze-button').click()
  await expect(page.getByTestId('ew-results')).toBeVisible({ timeout: EW_CALC_TIMEOUT })
}

/**
 * Filter function for console messages.
 * Returns true if the message should be IGNORED (not counted as error).
 *
 * These patterns are expected during normal operation and are not bugs:
 */
export function shouldIgnoreConsoleMessage(text: string): boolean {
  const ignoredPatterns = [
    // Browser security - expected in dev without proper CORS headers
    'CORS',
    // Required for Stockfish WASM multi-threading - expected warning
    'SharedArrayBuffer',
    // Engine debug logging - intentional console output
    'Maia value:',
    'Maia:',
    'Stockfish',
    // React dev tools prompt - not an error
    'Download the React DevTools',
    // Network errors for optional resources (favicons, etc.)
    'net::ERR',
    '404',
    'Failed to load resource',
    // React development warnings - not test failures
    'Warning:',
    // Next.js SSR hydration warnings - expected in dev
    'Hydration',
    // ONNX runtime informational messages
    'onnxruntime',
    // WebAssembly compilation messages
    'WebAssembly',
  ]
  return ignoredPatterns.some((pattern) => text.includes(pattern))
}

/**
 * Set up console error tracking for a page.
 * Returns an array that will be populated with non-ignored errors.
 * Call this in beforeAll, check the array in tests or afterAll.
 */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      if (!shouldIgnoreConsoleMessage(text)) {
        errors.push(text)
      }
    }
  })
  return errors
}

/**
 * Log any console errors that were collected during tests.
 * Call this in afterAll to ensure errors are visible even if tests pass.
 */
export function logCollectedErrors(errors: string[]): void {
  if (errors.length > 0) {
    console.warn('Console errors detected during tests:', errors)
  }
}
