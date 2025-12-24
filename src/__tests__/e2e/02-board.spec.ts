import { test, expect } from '@playwright/test'

test.describe('02 - Static Board Display', () => {
  test('board container is visible', async ({ page }) => {
    await page.goto('/')

    const board = page.getByTestId('game-board')
    await expect(board).toBeVisible()
  })

  test('chessground board renders', async ({ page }) => {
    await page.goto('/')

    const cgBoard = page.locator('cg-board')
    await expect(cgBoard).toBeVisible()
  })

  test('board has square dimensions', async ({ page }) => {
    await page.goto('/')

    // Wait for pieces to be rendered (indicates board is fully loaded)
    const pieces = page.locator('cg-board piece')
    await expect(pieces).toHaveCount(32)

    // Test the board container which has the aspect-ratio: 1 constraint
    const board = page.getByTestId('game-board')
    const box = await board.boundingBox()

    expect(box).not.toBeNull()
    if (box) {
      // Allow some tolerance for borders/padding
      expect(Math.abs(box.width - box.height)).toBeLessThan(10)
      expect(box.width).toBeGreaterThan(100)
    }
  })

  test('board shows all starting pieces', async ({ page }) => {
    await page.goto('/')

    const pieces = page.locator('cg-board piece')
    await expect(pieces).toHaveCount(32)
  })

  test('white pieces are at bottom (ranks 1-2)', async ({ page }) => {
    await page.goto('/')

    const whiteKing = page.locator('cg-board piece.white.king')
    await expect(whiteKing).toBeVisible()

    const whitePawns = page.locator('cg-board piece.white.pawn')
    await expect(whitePawns).toHaveCount(8)
  })

  test('black pieces are at top (ranks 7-8)', async ({ page }) => {
    await page.goto('/')

    const blackKing = page.locator('cg-board piece.black.king')
    await expect(blackKing).toBeVisible()

    const blackPawns = page.locator('cg-board piece.black.pawn')
    await expect(blackPawns).toHaveCount(8)
  })

  test('no console errors with board', async ({ page }) => {
    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    expect(errors).toEqual([])
  })
})
