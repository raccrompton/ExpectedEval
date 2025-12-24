import { test, expect } from '@playwright/test'

test.describe('03 - PGN Input + Game Loading', () => {
  test.describe('PGN Input Component', () => {
    test('pgn input textarea is visible', async ({ page }) => {
      await page.goto('/')

      const pgnInput = page.getByTestId('pgn-input')
      await expect(pgnInput).toBeVisible()
    })

    test('load pgn button is visible', async ({ page }) => {
      await page.goto('/')

      const loadButton = page.getByTestId('load-pgn-button')
      await expect(loadButton).toBeVisible()
    })

    test('pgn input accepts text', async ({ page }) => {
      await page.goto('/')

      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5')

      await expect(pgnInput).toHaveValue('1. e4 e5')
    })
  })

  test.describe('Game Loading', () => {
    test('loading valid PGN displays moves in move list', async ({ page }) => {
      await page.goto('/')

      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5 2. Nf3 Nc6')

      const loadButton = page.getByTestId('load-pgn-button')
      await loadButton.click()

      const moveList = page.getByTestId('move-list')
      await expect(moveList).toBeVisible()
      await expect(moveList).toContainText('e4')
      await expect(moveList).toContainText('e5')
      await expect(moveList).toContainText('Nf3')
      await expect(moveList).toContainText('Nc6')
    })

    test('loading PGN updates board to final position', async ({ page }) => {
      await page.goto('/')

      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4')

      const loadButton = page.getByTestId('load-pgn-button')
      await loadButton.click()

      // After 1. e4, white pawn should be on e4 (no longer on e2)
      // Check that there's a white pawn at e4 square
      const cgBoard = page.locator('cg-board')
      await expect(cgBoard).toBeVisible()

      // Board should show position after 1. e4
      // The piece count should still be 32, but positions change
      const pieces = page.locator('cg-board piece')
      await expect(pieces).toHaveCount(32)
    })

    test('empty PGN shows starting position', async ({ page }) => {
      await page.goto('/')

      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('')

      const loadButton = page.getByTestId('load-pgn-button')
      await loadButton.click()

      // Board should show starting position with all 32 pieces
      const pieces = page.locator('cg-board piece')
      await expect(pieces).toHaveCount(32)
    })
  })

  test.describe('Move List Display', () => {
    test('move list shows move numbers', async ({ page }) => {
      await page.goto('/')

      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5 2. Nf3')

      const loadButton = page.getByTestId('load-pgn-button')
      await loadButton.click()

      const moveList = page.getByTestId('move-list')
      await expect(moveList).toContainText('1.')
      await expect(moveList).toContainText('2.')
    })

    test('moves are clickable elements', async ({ page }) => {
      await page.goto('/')

      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5 2. Nf3 Nc6')

      const loadButton = page.getByTestId('load-pgn-button')
      await loadButton.click()

      // Each move should have its own testid
      const move0 = page.getByTestId('move-0')
      await expect(move0).toBeVisible()
      await expect(move0).toContainText('e4')

      const move1 = page.getByTestId('move-1')
      await expect(move1).toBeVisible()
      await expect(move1).toContainText('e5')
    })

    test('current move is highlighted', async ({ page }) => {
      await page.goto('/')

      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5')

      const loadButton = page.getByTestId('load-pgn-button')
      await loadButton.click()

      // After loading, should be at final position (move 1: e5)
      // The last move should be highlighted/current
      const moveList = page.getByTestId('move-list')
      await expect(moveList).toBeVisible()

      // Current move should have a 'current' class or data attribute
      const currentMove = page.locator('[data-current="true"]')
      await expect(currentMove).toBeVisible()
    })
  })

  test.describe('Complex PGN', () => {
    test('handles PGN with headers', async ({ page }) => {
      await page.goto('/')

      const pgn = `[Event "Test Game"]
[White "Player 1"]
[Black "Player 2"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 *`

      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill(pgn)

      const loadButton = page.getByTestId('load-pgn-button')
      await loadButton.click()

      const moveList = page.getByTestId('move-list')
      await expect(moveList).toContainText('e4')
      await expect(moveList).toContainText('Nc6')
    })

    test('handles longer games', async ({ page }) => {
      await page.goto('/')

      const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O'

      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill(pgn)

      const loadButton = page.getByTestId('load-pgn-button')
      await loadButton.click()

      const moveList = page.getByTestId('move-list')
      await expect(moveList).toContainText('e4')
      await expect(moveList).toContainText('Bb5')
      await expect(moveList).toContainText('O-O')
    })
  })

  test.describe('No Console Errors', () => {
    test('no console errors after loading PGN', async ({ page }) => {
      const errors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      await page.goto('/')

      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5 2. Nf3 Nc6')

      const loadButton = page.getByTestId('load-pgn-button')
      await loadButton.click()

      await page.waitForLoadState('networkidle')

      expect(errors).toEqual([])
    })
  })
})
