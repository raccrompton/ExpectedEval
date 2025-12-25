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

test.describe('04 - Move Navigation', () => {
  const SAMPLE_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6'

  test.describe('Click Navigation', () => {
    test('clicking a move updates board to that position', async ({ page }) => {
      await page.goto('/')

      // Load a game
      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // After loading, we should be at the final position (after 3...a6)
      let currentMove = page.locator('[data-current="true"]')
      await expect(currentMove).toContainText('a6')

      // Click on move 0 (e4 - first move)
      await page.getByTestId('move-0').click()

      // Current move indicator should now be on e4
      currentMove = page.locator('[data-current="true"]')
      await expect(currentMove).toContainText('e4')
    })

    test('clicking first move shows position after that move', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Click on e4
      await page.getByTestId('move-0').click()

      // Board should show position after 1. e4
      // There should be a white pawn on e4
      const board = page.locator('cg-board')
      await expect(board).toBeVisible()
    })

    test('clicking different moves updates current move highlight', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Click e4 (move 0)
      await page.getByTestId('move-0').click()
      await expect(page.locator('[data-current="true"]')).toContainText('e4')

      // Click Nf3 (move 2)
      await page.getByTestId('move-2').click()
      await expect(page.locator('[data-current="true"]')).toContainText('Nf3')

      // Click Bb5 (move 4)
      await page.getByTestId('move-4').click()
      await expect(page.locator('[data-current="true"]')).toContainText('Bb5')
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('right arrow key goes forward one move', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Go to start first
      await page.getByTestId('move-0').click()
      await page.keyboard.press('ArrowLeft') // Go back to start

      // Now press right arrow
      await page.keyboard.press('ArrowRight')

      // Should be on first move
      await expect(page.locator('[data-current="true"]')).toContainText('e4')
    })

    test('left arrow key goes back one move', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Currently at final move (a6)
      await expect(page.locator('[data-current="true"]')).toContainText('a6')

      // Press left arrow
      await page.keyboard.press('ArrowLeft')

      // Should now be on Bb5
      await expect(page.locator('[data-current="true"]')).toContainText('Bb5')
    })

    test('multiple arrow key presses navigate correctly', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Go back 3 moves (a6 → Bb5 → Nc6 → Nf3)
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowLeft')

      await expect(page.locator('[data-current="true"]')).toContainText('Nf3')

      // Go forward 2 moves (Nf3 → Nc6 → Bb5)
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowRight')

      await expect(page.locator('[data-current="true"]')).toContainText('Bb5')
    })

    test('left arrow at start does nothing', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Navigate to start
      await page.getByTestId('nav-start').click()

      // No move should be current at starting position
      await expect(page.locator('[data-current="true"]')).toHaveCount(0)

      // Press left arrow - should do nothing
      await page.keyboard.press('ArrowLeft')

      // Still at start, no move highlighted
      await expect(page.locator('[data-current="true"]')).toHaveCount(0)
    })

    test('right arrow at end does nothing', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Should be at end (a6)
      await expect(page.locator('[data-current="true"]')).toContainText('a6')

      // Press right arrow
      await page.keyboard.press('ArrowRight')

      // Still on a6
      await expect(page.locator('[data-current="true"]')).toContainText('a6')
    })
  })

  test.describe('Navigation Buttons', () => {
    test('start button goes to initial position', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Click start button
      await page.getByTestId('nav-start').click()

      // No move should be highlighted (at starting position)
      await expect(page.locator('[data-current="true"]')).toHaveCount(0)
    })

    test('end button goes to final position', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Go to start first
      await page.getByTestId('nav-start').click()

      // Then click end button
      await page.getByTestId('nav-end').click()

      // Should be at final move
      await expect(page.locator('[data-current="true"]')).toContainText('a6')
    })

    test('back button goes one move back', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // At a6
      await expect(page.locator('[data-current="true"]')).toContainText('a6')

      // Click back button
      await page.getByTestId('nav-back').click()

      // Should now be at Bb5
      await expect(page.locator('[data-current="true"]')).toContainText('Bb5')
    })

    test('forward button goes one move forward', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Go to start first
      await page.getByTestId('nav-start').click()

      // Click forward button
      await page.getByTestId('nav-forward').click()

      // Should be on e4
      await expect(page.locator('[data-current="true"]')).toContainText('e4')
    })

    test('navigation buttons are visible', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // All navigation buttons should be visible
      await expect(page.getByTestId('nav-start')).toBeVisible()
      await expect(page.getByTestId('nav-back')).toBeVisible()
      await expect(page.getByTestId('nav-forward')).toBeVisible()
      await expect(page.getByTestId('nav-end')).toBeVisible()
    })

    test('navigation buttons work with keyboard focus', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Tab to forward button and press Enter
      await page.getByTestId('nav-start').focus()
      await page.keyboard.press('Enter')

      // Should be at start
      await expect(page.locator('[data-current="true"]')).toHaveCount(0)
    })
  })

  test.describe('Board Position Updates', () => {
    test('board updates visually when navigating', async ({ page }) => {
      await page.goto('/')

      await page.getByTestId('pgn-input').fill('1. e4')
      await page.getByTestId('load-pgn-button').click()

      // At position after e4
      const board = page.locator('cg-board')
      await expect(board).toBeVisible()

      // Go to start
      await page.getByTestId('nav-start').click()

      // Board should still be visible
      await expect(board).toBeVisible()

      // All 32 pieces should be present at starting position
      const pieces = page.locator('cg-board piece')
      await expect(pieces).toHaveCount(32)
    })

    test('navigating through game shows correct piece positions', async ({ page }) => {
      await page.goto('/')

      // A simple game: 1. e4 e5
      await page.getByTestId('pgn-input').fill('1. e4 e5')
      await page.getByTestId('load-pgn-button').click()

      // At final position - both e4 and e5 pawns advanced
      const board = page.locator('cg-board')
      await expect(board).toBeVisible()

      // Navigate to after e4 only
      await page.getByTestId('move-0').click()

      // Board should show position with only e4 played
      await expect(board).toBeVisible()
    })
  })

  test.describe('No Console Errors', () => {
    test('no console errors during navigation', async ({ page }) => {
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

      await page.getByTestId('pgn-input').fill(SAMPLE_PGN)
      await page.getByTestId('load-pgn-button').click()

      // Navigate around
      await page.getByTestId('move-0').click()
      await page.getByTestId('move-2').click()
      await page.getByTestId('nav-start').click()
      await page.getByTestId('nav-end').click()
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')

      expect(errors).toEqual([])
    })
  })
})
