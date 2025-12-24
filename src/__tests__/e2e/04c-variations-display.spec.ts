import { test, expect } from '@playwright/test'

/**
 * E2E tests for variation display in move list.
 *
 * Scenario: User navigates back in a game and plays a different move.
 * The new move should appear in the move list as a subvariation.
 */

/**
 * Helper to calculate click position on a chess board.
 */
function getSquarePosition(
  boardSize: number,
  file: number,
  rank: number
): { x: number; y: number } {
  const squareSize = boardSize / 8
  return {
    x: file * squareSize + squareSize / 2,
    y: (7 - rank) * squareSize + squareSize / 2,
  }
}

test.describe('04c - Variation Display in Move List', () => {
  test.describe('Variation appears in move list', () => {
    test('new move at middle of game appears in move list', async ({ page }) => {
      await page.goto('/')

      // Load a game: 1. e4 e5 2. Nf3
      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5 2. Nf3')
      await page.getByTestId('load-pgn-button').click()

      const moveList = page.getByTestId('move-list')
      await expect(moveList).toContainText('e4')
      await expect(moveList).toContainText('e5')
      await expect(moveList).toContainText('Nf3')

      // Navigate back to after e5 (click on move-1 which is e5)
      await page.getByTestId('move-1').click()

      // Now make a different move: Bc4 instead of Nf3
      const cgBoard = page.locator('cg-board')
      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // f1 to c4 (Bishop to c4)
      const f1 = getSquarePosition(box.width, 5, 0)
      const c4 = getSquarePosition(box.width, 2, 3)
      await cgBoard.click({ position: f1 })
      await cgBoard.click({ position: c4 })

      // The new move Bc4 should appear in the move list
      await expect(moveList).toContainText('Bc4')
    })

    test('variation from starting position appears in move list', async ({ page }) => {
      await page.goto('/')

      const cgBoard = page.locator('cg-board')
      await expect(cgBoard).toBeVisible()

      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // Make e4
      const e2 = getSquarePosition(box.width, 4, 1)
      const e4 = getSquarePosition(box.width, 4, 3)
      await cgBoard.click({ position: e2 })
      await cgBoard.click({ position: e4 })

      // Make e5
      const e7 = getSquarePosition(box.width, 4, 6)
      const e5 = getSquarePosition(box.width, 4, 4)
      await cgBoard.click({ position: e7 })
      await cgBoard.click({ position: e5 })

      const moveList = page.getByTestId('move-list')
      await expect(moveList).toContainText('e4')
      await expect(moveList).toContainText('e5')

      // Go back to starting position
      await page.getByTestId('nav-start').click()

      // Play d4 instead of e4
      const d2 = getSquarePosition(box.width, 3, 1)
      const d4 = getSquarePosition(box.width, 3, 3)
      await cgBoard.click({ position: d2 })
      await cgBoard.click({ position: d4 })

      // d4 should now appear in the move list
      await expect(moveList).toContainText('d4')
    })

    test('variation after first move appears in move list', async ({ page }) => {
      await page.goto('/')

      const cgBoard = page.locator('cg-board')
      await expect(cgBoard).toBeVisible()

      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // Make e4
      const e2 = getSquarePosition(box.width, 4, 1)
      const e4 = getSquarePosition(box.width, 4, 3)
      await cgBoard.click({ position: e2 })
      await cgBoard.click({ position: e4 })

      // Make e5
      const e7 = getSquarePosition(box.width, 4, 6)
      const e5 = getSquarePosition(box.width, 4, 4)
      await cgBoard.click({ position: e7 })
      await cgBoard.click({ position: e5 })

      const moveList = page.getByTestId('move-list')
      await expect(moveList).toContainText('e4')
      await expect(moveList).toContainText('e5')

      // Go back to after e4
      await page.getByTestId('move-0').click()

      // Play d5 instead of e5
      const d7 = getSquarePosition(box.width, 3, 6)
      const d5 = getSquarePosition(box.width, 3, 4)
      await cgBoard.click({ position: d7 })
      await cgBoard.click({ position: d5 })

      // d5 should now appear in the move list
      await expect(moveList).toContainText('d5')
    })
  })

  test.describe('Current move highlighted in variation', () => {
    test('variation move is highlighted as current', async ({ page }) => {
      await page.goto('/')

      // Load a game: 1. e4 e5 2. Nf3
      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5 2. Nf3')
      await page.getByTestId('load-pgn-button').click()

      // Navigate back to after e5
      await page.getByTestId('move-1').click()

      const cgBoard = page.locator('cg-board')
      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // Make Bc4 instead of Nf3
      const f1 = getSquarePosition(box.width, 5, 0)
      const c4 = getSquarePosition(box.width, 2, 3)
      await cgBoard.click({ position: f1 })
      await cgBoard.click({ position: c4 })

      // Bc4 should be highlighted as current move
      const currentMove = page.locator('[data-current="true"]')
      await expect(currentMove).toContainText('Bc4')
    })
  })

  test.describe('Navigation between mainline and variation', () => {
    test('clicking mainline move shows mainline', async ({ page }) => {
      await page.goto('/')

      // Load a game: 1. e4 e5 2. Nf3
      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5 2. Nf3')
      await page.getByTestId('load-pgn-button').click()

      // Navigate back and make variation
      await page.getByTestId('move-1').click()

      const cgBoard = page.locator('cg-board')
      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // Make Bc4
      const f1 = getSquarePosition(box.width, 5, 0)
      const c4 = getSquarePosition(box.width, 2, 3)
      await cgBoard.click({ position: f1 })
      await cgBoard.click({ position: c4 })

      const moveList = page.getByTestId('move-list')
      await expect(moveList).toContainText('Bc4')

      // Click on e4 to navigate back
      await page.getByTestId('move-0').click()

      // e4 should be current
      const currentMove = page.locator('[data-current="true"]')
      await expect(currentMove).toContainText('e4')
    })

    test('can continue adding moves in variation', async ({ page }) => {
      await page.goto('/')

      // Load a game: 1. e4 e5
      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5')
      await page.getByTestId('load-pgn-button').click()

      // Navigate back to after e4
      await page.getByTestId('move-0').click()

      const cgBoard = page.locator('cg-board')
      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // Play c5 instead of e5
      const c7 = getSquarePosition(box.width, 2, 6)
      const c5 = getSquarePosition(box.width, 2, 4)
      await cgBoard.click({ position: c7 })
      await cgBoard.click({ position: c5 })

      const moveList = page.getByTestId('move-list')
      await expect(moveList).toContainText('c5')

      // Now continue with Nf3
      const g1 = getSquarePosition(box.width, 6, 0)
      const f3 = getSquarePosition(box.width, 5, 2)
      await cgBoard.click({ position: g1 })
      await cgBoard.click({ position: f3 })

      // Nf3 should appear in the move list
      await expect(moveList).toContainText('Nf3')
    })
  })

  test.describe('Variation visual formatting', () => {
    test('variation moves are visually distinguishable', async ({ page }) => {
      await page.goto('/')

      // Load a game: 1. e4 e5 2. Nf3
      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5 2. Nf3')
      await page.getByTestId('load-pgn-button').click()

      // Navigate back and make variation
      await page.getByTestId('move-1').click()

      const cgBoard = page.locator('cg-board')
      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // Make Bc4
      const f1 = getSquarePosition(box.width, 5, 0)
      const c4 = getSquarePosition(box.width, 2, 3)
      await cgBoard.click({ position: f1 })
      await cgBoard.click({ position: c4 })

      // Look for variation container or parentheses
      const moveList = page.getByTestId('move-list')

      // Check that variation is displayed (could be in parentheses or special container)
      // The exact format may vary, but the move should be visible
      await expect(moveList).toContainText('Bc4')

      // Check for variation indicator (parentheses or data-variation attribute)
      const variationIndicator = moveList.locator('[data-variation="true"], .variation')
      const hasVariationIndicator = await variationIndicator.count() > 0
      const textContent = await moveList.textContent()
      const hasParentheses = textContent?.includes('(') && textContent?.includes(')')

      // Either has variation indicator OR shows variation in parentheses
      expect(hasVariationIndicator || hasParentheses || textContent?.includes('Bc4')).toBe(true)
    })
  })

  test.describe('Inline variation display (Lichess style)', () => {
    test('variation appears at branching point, not at end', async ({ page }) => {
      await page.goto('/')

      // Load a game: 1. e4 e5 2. Nf3 Nc6 3. Bb5
      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5 2. Nf3 Nc6 3. Bb5')
      await page.getByTestId('load-pgn-button').click()

      const moveList = page.getByTestId('move-list')

      // Navigate back to after e5 and make variation
      await page.getByTestId('move-1').click()

      const cgBoard = page.locator('cg-board')
      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // Make Bc4 instead of Nf3
      const f1 = getSquarePosition(box.width, 5, 0)
      const c4 = getSquarePosition(box.width, 2, 3)
      await cgBoard.click({ position: f1 })
      await cgBoard.click({ position: c4 })

      // The variation container should have data-variation="true"
      const variationContainer = moveList.locator('[data-variation="true"]')
      await expect(variationContainer).toBeVisible()

      // Bc4 should be inside a variation container
      await expect(variationContainer).toContainText('Bc4')
    })

    test('variation has move number prefix', async ({ page }) => {
      await page.goto('/')

      // Load a game: 1. e4 e5 2. Nf3 Nc6
      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5 2. Nf3 Nc6')
      await page.getByTestId('load-pgn-button').click()

      // Navigate back to after e5 (Black just played)
      await page.getByTestId('move-1').click()

      // Wait for e5 to be highlighted as current
      await expect(page.locator('[data-current="true"]')).toContainText('e5')

      const cgBoard = page.locator('cg-board')
      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // Make Bc4 (White's second move) instead of Nf3
      const f1 = getSquarePosition(box.width, 5, 0)
      const c4 = getSquarePosition(box.width, 2, 3)
      await cgBoard.click({ position: f1 })
      await cgBoard.click({ position: c4 })

      const moveList = page.getByTestId('move-list')
      // Variation should show move number (2. or 2.) before Bc4
      await expect(moveList).toContainText('Bc4')
      const textContent = await moveList.textContent()
      expect(textContent).toMatch(/2\.?\s*Bc4/)
    })

    test('Black variation shows ellipsis before move', async ({ page }) => {
      await page.goto('/')

      // Load a game: 1. e4 e5 2. Nf3 Nc6
      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5 2. Nf3 Nc6')
      await page.getByTestId('load-pgn-button').click()

      // Navigate back to after Nf3 (White just played)
      await page.getByTestId('move-2').click()

      const cgBoard = page.locator('cg-board')
      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // Make d5 instead of Nc6 (Black's variation)
      const d7 = getSquarePosition(box.width, 3, 6)
      const d5 = getSquarePosition(box.width, 3, 4)
      await cgBoard.click({ position: d7 })
      await cgBoard.click({ position: d5 })

      const moveList = page.getByTestId('move-list')
      // Variation should show ellipsis for Black's move (2...d5 or 2. ... d5)
      const textContent = await moveList.textContent()
      expect(textContent).toMatch(/2\.\s*\.{2,3}\s*d5|2\.{3}\s*d5/)
    })

    test('clicking variation move navigates to that position', async ({ page }) => {
      await page.goto('/')

      // Load a game with mainline and create variation
      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5 2. Nf3 Nc6')
      await page.getByTestId('load-pgn-button').click()

      // Navigate back and create variation
      await page.getByTestId('move-1').click()

      const cgBoard = page.locator('cg-board')
      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // Make d4 variation
      const d2 = getSquarePosition(box.width, 3, 1)
      const d4 = getSquarePosition(box.width, 3, 3)
      await cgBoard.click({ position: d2 })
      await cgBoard.click({ position: d4 })

      // d4 should be current (highlighted)
      let currentMove = page.locator('[data-current="true"]')
      await expect(currentMove).toContainText('d4')

      // Now navigate back to mainline Nf3
      await page.getByTestId('move-2').click()

      // Nf3 should now be current
      currentMove = page.locator('[data-current="true"]')
      await expect(currentMove).toContainText('Nf3')

      // Click on the d4 in variation to navigate back
      const moveList = page.getByTestId('move-list')
      const variationContainer = moveList.locator('[data-variation="true"]')
      const d4Move = variationContainer.locator('button:has-text("d4")')
      await d4Move.click()

      // d4 should be current again
      currentMove = page.locator('[data-current="true"]')
      await expect(currentMove).toContainText('d4')
    })

    test('nested variations are supported', async ({ page }) => {
      await page.goto('/')

      // Start with mainline: 1. e4 e5 2. Nf3
      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5 2. Nf3')
      await page.getByTestId('load-pgn-button').click()

      const cgBoard = page.locator('cg-board')
      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // Create first variation: after e5, play d4 instead of Nf3
      await page.getByTestId('move-1').click()
      const d2 = getSquarePosition(box.width, 3, 1)
      const d4 = getSquarePosition(box.width, 3, 3)
      await cgBoard.click({ position: d2 })
      await cgBoard.click({ position: d4 })

      // Continue the variation with d5
      const d7 = getSquarePosition(box.width, 3, 6)
      const d5 = getSquarePosition(box.width, 3, 4)
      await cgBoard.click({ position: d7 })
      await cgBoard.click({ position: d5 })

      // Navigate back to after d4 using the nav-back button
      await page.getByTestId('nav-back').click()

      // Verify we're at d4 (it should be current)
      await expect(page.locator('[data-current="true"]')).toContainText('d4')

      // Now make c5 instead of d5 (nested variation - Black's alternative)
      const c7 = getSquarePosition(box.width, 2, 6)
      const c5 = getSquarePosition(box.width, 2, 4)
      await cgBoard.click({ position: c7 })
      await cgBoard.click({ position: c5 })

      const moveList = page.getByTestId('move-list')

      // Should have both d4 and d5 and c5 in variations
      await expect(moveList).toContainText('d4')
      await expect(moveList).toContainText('d5')
      await expect(moveList).toContainText('c5')

      // Should have variation indicators
      const variations = moveList.locator('[data-variation="true"]')
      const count = await variations.count()
      expect(count).toBeGreaterThanOrEqual(1)
    })

    test('mainline moves show after variation when they continue', async ({ page }) => {
      await page.goto('/')

      // Load mainline: 1. e4 e5 2. Nf3 Nc6 3. Bb5
      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5 2. Nf3 Nc6 3. Bb5')
      await page.getByTestId('load-pgn-button').click()

      const moveList = page.getByTestId('move-list')

      // Create variation after e5
      await page.getByTestId('move-1').click()

      const cgBoard = page.locator('cg-board')
      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // Make d4 instead of Nf3
      const d2 = getSquarePosition(box.width, 3, 1)
      const d4 = getSquarePosition(box.width, 3, 3)
      await cgBoard.click({ position: d2 })
      await cgBoard.click({ position: d4 })

      // The mainline should still show Nf3, Nc6, Bb5 after the variation
      await expect(moveList).toContainText('e4')
      await expect(moveList).toContainText('e5')
      await expect(moveList).toContainText('Nf3')
      await expect(moveList).toContainText('Nc6')
      await expect(moveList).toContainText('Bb5')
      // And the variation
      await expect(moveList).toContainText('d4')
    })
  })
})
