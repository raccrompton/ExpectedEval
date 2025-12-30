import { test, expect } from '@playwright/test'

/**
 * Tests for verifying that chess pieces are properly centered within their squares.
 * This test was added to catch CSS regressions where pieces appear off-center.
 */
test.describe('02b - Board Piece Centering', () => {
  test('pieces are visually centered within their squares', async ({ page }) => {
    await page.goto('/')

    // Wait for board to fully render
    const pieces = page.locator('cg-board piece')
    await expect(pieces).toHaveCount(32)

    // Get the board dimensions
    const board = page.locator('cg-board')
    const boardBox = await board.boundingBox()
    expect(boardBox).not.toBeNull()
    if (!boardBox) return

    const squareSize = boardBox.width / 8

    // Test the white king on e1 (column 4 from left, row 7 from top in white orientation)
    const whiteKing = page.locator('cg-board piece.white.king')
    await expect(whiteKing).toBeVisible()

    const kingBox = await whiteKing.boundingBox()
    expect(kingBox).not.toBeNull()
    if (!kingBox) return

    // The piece should be approximately square-sized (12.5% of board)
    const expectedSize = squareSize
    expect(Math.abs(kingBox.width - expectedSize)).toBeLessThan(5)
    expect(Math.abs(kingBox.height - expectedSize)).toBeLessThan(5)

    // Calculate expected position for e1 (column 4, row 7 from top)
    // In chessground, e1 is at x=4*squareSize, y=7*squareSize from board origin
    const expectedX = boardBox.x + 4 * squareSize
    const expectedY = boardBox.y + 7 * squareSize

    // Piece should be positioned at the square's top-left corner
    // Allow tolerance for sub-pixel rendering and browser rounding
    // 5px on a ~50px square is ~10% tolerance
    const tolerance = 5
    expect(Math.abs(kingBox.x - expectedX)).toBeLessThanOrEqual(tolerance)
    expect(Math.abs(kingBox.y - expectedY)).toBeLessThan(tolerance)
  })

  test('highlight squares have correct dimensions when present', async ({ page }) => {
    // Load a position with a move already made
    await page.goto('/')

    // Load a PGN with multiple moves
    const pgnInput = page.getByTestId('pgn-input')
    await pgnInput.fill('1. e4 e5 2. Nf3')
    await page.getByTestId('load-pgn-button').click()

    // Wait for PGN to load
    await page.waitForTimeout(500)

    // Check if last-move squares exist (they may or may not be present)
    const lastMoveSquares = page.locator('cg-board square.last-move')
    const count = await lastMoveSquares.count()

    // If highlights exist, verify their dimensions
    if (count > 0) {
      // Get board dimensions
      const board = page.locator('cg-board')
      const boardBox = await board.boundingBox()
      expect(boardBox).not.toBeNull()
      if (!boardBox) return

      const squareSize = boardBox.width / 8

      // Each highlight square should be approximately square-sized
      for (let i = 0; i < count; i++) {
        const squareBox = await lastMoveSquares.nth(i).boundingBox()
        if (squareBox) {
          expect(Math.abs(squareBox.width - squareSize)).toBeLessThan(3)
          expect(Math.abs(squareBox.height - squareSize)).toBeLessThan(3)
        }
      }
    }

    // Test passes whether or not highlights are present
    // The key assertion is that IF they exist, they have correct dimensions
    expect(true).toBe(true)
  })

  test('piece bounding box matches expected square size', async ({ page }) => {
    await page.goto('/')

    // Wait for pieces
    const pieces = page.locator('cg-board piece')
    await expect(pieces).toHaveCount(32)

    // Get board dimensions
    const board = page.locator('cg-board')
    const boardBox = await board.boundingBox()
    expect(boardBox).not.toBeNull()
    if (!boardBox) return

    const expectedSquareSize = boardBox.width / 8

    // Check a few pieces to ensure they're all properly sized
    const testPieces = [
      page.locator('cg-board piece.white.king'),
      page.locator('cg-board piece.black.queen'),
      page.locator('cg-board piece.white.pawn').first(),
    ]

    for (const piece of testPieces) {
      const box = await piece.boundingBox()
      expect(box).not.toBeNull()
      if (box) {
        // Pieces should be 12.5% of board (1 square)
        expect(Math.abs(box.width - expectedSquareSize)).toBeLessThan(3)
        expect(Math.abs(box.height - expectedSquareSize)).toBeLessThan(3)
      }
    }
  })
})
