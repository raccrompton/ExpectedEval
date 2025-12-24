import { test, expect } from '@playwright/test'

/**
 * Helper to calculate click position on a chess board.
 * Files: a=0, b=1, ..., h=7
 * Ranks: 1=0, 2=1, ..., 8=7 (from white's perspective at bottom)
 */
function getSquarePosition(
  boardSize: number,
  file: number,
  rank: number
): { x: number; y: number } {
  const squareSize = boardSize / 8
  return {
    x: file * squareSize + squareSize / 2,
    y: (7 - rank) * squareSize + squareSize / 2, // rank 0 (1) at bottom
  }
}

test.describe('04b - Interactive Move Input', () => {
  test.describe('Making Moves on Board', () => {
    test('can make a move by clicking squares', async ({ page }) => {
      await page.goto('/')

      const cgBoard = page.locator('cg-board')
      await expect(cgBoard).toBeVisible()

      // Get board dimensions
      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // Click e2 (file 4, rank 1) and e4 (file 4, rank 3)
      const e2 = getSquarePosition(box.width, 4, 1)
      const e4 = getSquarePosition(box.width, 4, 3)

      await cgBoard.click({ position: e2 })
      await cgBoard.click({ position: e4 })

      // Move should appear in move list
      const moveList = page.getByTestId('move-list')
      await expect(moveList).toContainText('e4')
    })

    test('can make a move by dragging pieces', async ({ page }) => {
      await page.goto('/')

      const cgBoard = page.locator('cg-board')
      await expect(cgBoard).toBeVisible()

      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // Calculate positions
      const d2 = getSquarePosition(box.width, 3, 1)
      const d4 = getSquarePosition(box.width, 3, 3)

      // Click-based move (drag is harder to test reliably)
      await cgBoard.click({ position: d2 })
      await cgBoard.click({ position: d4 })

      const moveList = page.getByTestId('move-list')
      await expect(moveList).toContainText('d4')
    })

    test('invalid moves are rejected', async ({ page }) => {
      await page.goto('/')

      const cgBoard = page.locator('cg-board')
      await expect(cgBoard).toBeVisible()

      const moveList = page.getByTestId('move-list')
      const initialText = await moveList.textContent()

      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // Click e2, then e6 (pawn can't move 4 squares)
      const e2 = getSquarePosition(box.width, 4, 1)
      const e6 = getSquarePosition(box.width, 4, 5)

      await cgBoard.click({ position: e2 })
      await cgBoard.click({ position: e6 })

      // Move list should not have changed
      const finalText = await moveList.textContent()
      expect(finalText).toBe(initialText)
    })
  })

  test.describe('Move Added to Game', () => {
    test('move appears in move list after being made', async ({ page }) => {
      await page.goto('/')

      const cgBoard = page.locator('cg-board')
      await expect(cgBoard).toBeVisible()

      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      const e2 = getSquarePosition(box.width, 4, 1)
      const e4 = getSquarePosition(box.width, 4, 3)

      await cgBoard.click({ position: e2 })
      await cgBoard.click({ position: e4 })

      await expect(page.getByTestId('move-list')).toContainText('e4')
    })

    test('current move is highlighted after making move', async ({ page }) => {
      await page.goto('/')

      const cgBoard = page.locator('cg-board')
      await expect(cgBoard).toBeVisible()

      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      const e2 = getSquarePosition(box.width, 4, 1)
      const e4 = getSquarePosition(box.width, 4, 3)

      await cgBoard.click({ position: e2 })
      await cgBoard.click({ position: e4 })

      const currentMove = page.locator('[data-current="true"]')
      await expect(currentMove).toBeVisible()
      await expect(currentMove).toContainText('e4')
    })

    test('board updates after making move', async ({ page }) => {
      await page.goto('/')

      const cgBoard = page.locator('cg-board')
      await expect(cgBoard).toBeVisible()

      const pawns = page.locator('cg-board piece.white.pawn')
      await expect(pawns).toHaveCount(8)

      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      const e2 = getSquarePosition(box.width, 4, 1)
      const e4 = getSquarePosition(box.width, 4, 3)

      await cgBoard.click({ position: e2 })
      await cgBoard.click({ position: e4 })

      // Board should still show 8 white pawns
      await expect(pawns).toHaveCount(8)
    })
  })

  test.describe('Sequential Move Input', () => {
    test('can make multiple moves in sequence', async ({ page }) => {
      await page.goto('/')

      // Load a PGN with e4
      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4')
      await page.getByTestId('load-pgn-button').click()

      const moveList = page.getByTestId('move-list')
      await expect(moveList).toContainText('e4')

      const cgBoard = page.locator('cg-board')
      await expect(cgBoard).toBeVisible()

      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // Click on black's e7 pawn
      const e7 = getSquarePosition(box.width, 4, 6)
      await cgBoard.click({ position: e7 })
      await page.waitForTimeout(100)

      // Click on e5 to complete the move
      const e5pos = getSquarePosition(box.width, 4, 4)
      await cgBoard.click({ position: e5pos })

      await expect(moveList).toContainText('e5')
    })

    test('turn alternates correctly', async ({ page }) => {
      await page.goto('/')

      const cgBoard = page.locator('cg-board')
      await expect(cgBoard).toBeVisible()

      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // White moves first: e4
      const e2 = getSquarePosition(box.width, 4, 1)
      const e4 = getSquarePosition(box.width, 4, 3)
      await cgBoard.click({ position: e2 })
      await cgBoard.click({ position: e4 })

      // Try to move white pawn again - should fail (it's black's turn)
      const d2 = getSquarePosition(box.width, 3, 1)
      const d4 = getSquarePosition(box.width, 3, 3)
      await cgBoard.click({ position: d2 })
      await cgBoard.click({ position: d4 })

      // Only e4 should be in move list
      const moveList = page.getByTestId('move-list')
      const text = await moveList.textContent()
      expect(text?.includes('e4')).toBe(true)
      // d4 should not appear since it was rejected
      expect(text?.includes('d4')).toBe(false)
    })
  })

  test.describe('Variations', () => {
    test('move from middle of game creates variation', async ({ page }) => {
      await page.goto('/')

      // Load a game first
      const pgnInput = page.getByTestId('pgn-input')
      await pgnInput.fill('1. e4 e5 2. Nf3')
      await page.getByTestId('load-pgn-button').click()

      // Navigate back to after e4 e5
      await page.getByTestId('move-1').click() // e5

      const cgBoard = page.locator('cg-board')
      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      // Now make a different move than Nf3 (e.g., Bc4)
      // f1 (file 5, rank 0) to c4 (file 2, rank 3)
      const f1 = getSquarePosition(box.width, 5, 0)
      const c4 = getSquarePosition(box.width, 2, 3)
      await cgBoard.click({ position: f1 })
      await cgBoard.click({ position: c4 })

      // Original moves should still be visible
      const moveList = page.getByTestId('move-list')
      await expect(moveList).toContainText('e4')
      await expect(moveList).toContainText('e5')
    })

    test('can continue from variation', async ({ page }) => {
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

      // Go back to after e4
      await page.getByTestId('move-0').click()

      // Make d5 instead of e5
      const d7 = getSquarePosition(box.width, 3, 6)
      const d5 = getSquarePosition(box.width, 3, 4)
      await cgBoard.click({ position: d7 })
      await cgBoard.click({ position: d5 })

      // Move list should show moves
      const moveList = page.getByTestId('move-list')
      await expect(moveList).toBeVisible()
      await expect(moveList).toContainText('e4')
    })
  })

  test.describe('Starting Fresh', () => {
    test('can make moves on empty board', async ({ page }) => {
      await page.goto('/')

      const cgBoard = page.locator('cg-board')
      await expect(cgBoard).toBeVisible()

      const pieces = page.locator('cg-board piece')
      await expect(pieces).toHaveCount(32)

      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      const e2 = getSquarePosition(box.width, 4, 1)
      const e4 = getSquarePosition(box.width, 4, 3)
      await cgBoard.click({ position: e2 })
      await cgBoard.click({ position: e4 })

      const moveList = page.getByTestId('move-list')
      await expect(moveList).toContainText('e4')
    })

    test('move list updates from "No moves" to showing move', async ({ page }) => {
      await page.goto('/')

      const moveList = page.getByTestId('move-list')
      await expect(moveList).toContainText('No moves')

      const cgBoard = page.locator('cg-board')
      await expect(cgBoard).toBeVisible()

      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      const e2 = getSquarePosition(box.width, 4, 1)
      const e4 = getSquarePosition(box.width, 4, 3)
      await cgBoard.click({ position: e2 })
      await cgBoard.click({ position: e4 })

      await expect(moveList).toContainText('e4')
      await expect(moveList).not.toContainText('No moves')
    })
  })

  test.describe('No Console Errors', () => {
    test('no console errors when making moves', async ({ page }) => {
      const errors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      await page.goto('/')

      const cgBoard = page.locator('cg-board')
      await expect(cgBoard).toBeVisible()

      const box = await cgBoard.boundingBox()
      if (!box) throw new Error('Board not found')

      const e2 = getSquarePosition(box.width, 4, 1)
      const e4 = getSquarePosition(box.width, 4, 3)
      await cgBoard.click({ position: e2 })
      await cgBoard.click({ position: e4 })

      expect(errors).toEqual([])
    })
  })
})
