import { test, expect } from '@playwright/test'

/**
 * Filter function for console messages.
 * Returns true if the message should be IGNORED (not counted as error).
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

test.describe('01 - Minimal Page', () => {
  test('page loads at /', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
  })

  test('shows ExpectedEval header', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('ExpectedEval')
  })

  test('no console errors', async ({ page }) => {
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
    await page.waitForLoadState('networkidle')

    expect(errors).toEqual([])
  })
})
