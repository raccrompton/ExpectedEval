import { test, expect } from '@playwright/test'

/**
 * Layout tests to verify the target UI structure from IMPLEMENTATION-STRATEGY.md
 *
 * Target Layout:
 * ┌─────────────┬─────────────────────┬──────────────────┐
 * │ Left        │      Board (A)      │  Eval Panel (B)  │
 * │ (full ht)   │   + nav controls    │  (SF+Maia)       │
 * │             ├─────────────────────┴──────────────────┤
 * │ PGN+Moves   │      EW Tree (C) - spans under A+B     │
 * └─────────────┴────────────────────────────────────────┘
 *
 * Key layout requirements:
 * 1. Left sidebar contains PGN input + Move list (full height)
 * 2. Board and Eval panel are side-by-side in top-right area
 * 3. EW tree spans full width under board+eval panel
 */

test.describe('UI Layout Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('has left sidebar with PGN input and move list', async ({ page }) => {
    const sidebar = page.locator('[data-testid="left-sidebar"]')
    await expect(sidebar).toBeVisible()

    const pgnSection = sidebar.locator('[data-testid="pgn-section"]')
    await expect(pgnSection).toBeVisible()
    await expect(pgnSection.locator('[data-testid="pgn-input"]')).toBeVisible()
    await expect(pgnSection.locator('[data-testid="load-pgn-button"]')).toBeVisible()

    const movesSection = sidebar.locator('[data-testid="moves-section"]')
    await expect(movesSection).toBeVisible()
    await expect(movesSection.locator('[data-testid="move-list"]')).toBeVisible()
  })

  test('has board and eval panel side-by-side in top-right area', async ({ page }) => {
    const rightArea = page.locator('[data-testid="right-area"]')
    await expect(rightArea).toBeVisible()

    const topRow = rightArea.locator('[data-testid="top-row"]')
    await expect(topRow).toBeVisible()

    const boardSection = topRow.locator('[data-testid="board-section"]')
    await expect(boardSection).toBeVisible()
    await expect(boardSection.locator('.cg-wrap')).toBeVisible()

    const evalPanel = topRow.locator('[data-testid="eval-panel"]')
    await expect(evalPanel).toBeVisible()
  })

  test('board and eval panel are horizontally adjacent', async ({ page }) => {
    const topRow = page.locator('[data-testid="top-row"]')
    const boardSection = topRow.locator('[data-testid="board-section"]')
    const evalPanel = topRow.locator('[data-testid="eval-panel"]')

    const boardBox = await boardSection.boundingBox()
    const evalBox = await evalPanel.boundingBox()

    expect(boardBox).not.toBeNull()
    expect(evalBox).not.toBeNull()

    if (boardBox && evalBox) {
      // Eval panel should be to the right of board
      expect(evalBox.x).toBeGreaterThan(boardBox.x)
      // They should be roughly on the same vertical level (top aligned)
      expect(Math.abs(evalBox.y - boardBox.y)).toBeLessThan(20)
    }
  })

  test('has EW tree section spanning under board and eval panel', async ({ page }) => {
    const rightArea = page.locator('[data-testid="right-area"]')
    const ewSection = rightArea.locator('[data-testid="ew-section"]')
    await expect(ewSection).toBeVisible()

    const topRow = rightArea.locator('[data-testid="top-row"]')
    const topRowBox = await topRow.boundingBox()
    const ewBox = await ewSection.boundingBox()

    expect(topRowBox).not.toBeNull()
    expect(ewBox).not.toBeNull()

    if (topRowBox && ewBox) {
      // EW section should be below the top row
      expect(ewBox.y).toBeGreaterThan(topRowBox.y + topRowBox.height - 10)
    }
  })

  test('EW tree spans full width under board+eval area', async ({ page }) => {
    const topRow = page.locator('[data-testid="top-row"]')
    const ewSection = page.locator('[data-testid="ew-section"]')

    const topRowBox = await topRow.boundingBox()
    const ewBox = await ewSection.boundingBox()

    expect(topRowBox).not.toBeNull()
    expect(ewBox).not.toBeNull()

    if (topRowBox && ewBox) {
      // EW section should span approximately the same width as the top row
      // Allow some tolerance for padding/margins
      const widthDiff = Math.abs(ewBox.width - topRowBox.width)
      expect(widthDiff).toBeLessThan(50)
    }
  })

  test('left sidebar is separate from right area', async ({ page }) => {
    const sidebar = page.locator('[data-testid="left-sidebar"]')
    const rightArea = page.locator('[data-testid="right-area"]')

    const sidebarBox = await sidebar.boundingBox()
    const rightBox = await rightArea.boundingBox()

    expect(sidebarBox).not.toBeNull()
    expect(rightBox).not.toBeNull()

    if (sidebarBox && rightBox) {
      // Right area should be to the right of sidebar
      expect(rightBox.x).toBeGreaterThan(sidebarBox.x)
      // Sidebar should span full height (or close to it)
      expect(sidebarBox.height).toBeGreaterThan(300)
    }
  })

  test('navigation controls are below the board', async ({ page }) => {
    const boardSection = page.locator('[data-testid="board-section"]')
    const board = boardSection.locator('.cg-wrap')
    const navControls = boardSection.locator('[data-testid="navigation-controls"]')

    await expect(board).toBeVisible()
    await expect(navControls).toBeVisible()

    const boardBox = await board.boundingBox()
    const navBox = await navControls.boundingBox()

    expect(boardBox).not.toBeNull()
    expect(navBox).not.toBeNull()

    if (boardBox && navBox) {
      // Navigation should be below the board
      expect(navBox.y).toBeGreaterThan(boardBox.y + boardBox.height - 10)
    }
  })
})

test.describe('Eval Panel Content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('eval panel shows Stockfish section', async ({ page }) => {
    const evalPanel = page.locator('[data-testid="eval-panel"]')
    const sfSection = evalPanel.locator('[data-testid="stockfish-section"]')
    await expect(sfSection).toBeVisible()
    await expect(sfSection.locator('[data-testid="sf-status"]')).toBeVisible()
  })

  test('eval panel shows Maia section', async ({ page }) => {
    const evalPanel = page.locator('[data-testid="eval-panel"]')
    const maiaSection = evalPanel.locator('[data-testid="maia-section"]')
    await expect(maiaSection).toBeVisible()
    await expect(maiaSection.locator('[data-testid="maia-status"]')).toBeVisible()
  })
})

test.describe('EW Section Content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('EW section has calculate button', async ({ page }) => {
    const ewSection = page.locator('[data-testid="ew-section"]')
    await expect(ewSection.locator('[data-testid="calculate-ew-button"]')).toBeVisible()
  })

  test('EW section has status display', async ({ page }) => {
    const ewSection = page.locator('[data-testid="ew-section"]')
    await expect(ewSection.locator('[data-testid="ew-status"]')).toBeVisible()
  })
})
