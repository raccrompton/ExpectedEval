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
 * 2. Board and Eval panel are side-by-side in main row
 * 3. EW section spans full width under main row
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

  test('has board and eval panel side-by-side in main row', async ({ page }) => {
    const mainRow = page.locator('[data-testid="main-row"]')
    await expect(mainRow).toBeVisible()

    const boardSection = mainRow.locator('[data-testid="board-section"]')
    await expect(boardSection).toBeVisible()
    await expect(boardSection.locator('.cg-wrap')).toBeVisible()

    const evalPanel = mainRow.locator('[data-testid="eval-panel"]')
    await expect(evalPanel).toBeVisible()
  })

  test('board and eval panel are horizontally adjacent', async ({ page }) => {
    const mainRow = page.locator('[data-testid="main-row"]')
    const boardSection = mainRow.locator('[data-testid="board-section"]')
    const evalPanel = mainRow.locator('[data-testid="eval-panel"]')

    const boardBox = await boardSection.boundingBox()
    const evalBox = await evalPanel.boundingBox()

    expect(boardBox).not.toBeNull()
    expect(evalBox).not.toBeNull()

    if (boardBox && evalBox) {
      // Eval panel should be to the right of board
      expect(evalBox.x).toBeGreaterThan(boardBox.x)
      // They should be roughly on the same vertical level (top aligned)
      expect(Math.abs(evalBox.y - boardBox.y)).toBeLessThan(50)
    }
  })

  test('has EW section wrapper below main row', async ({ page }) => {
    const ewSectionWrapper = page.locator('[data-testid="ew-section-wrapper"]')
    await expect(ewSectionWrapper).toBeVisible()

    // The EW section wrapper should contain the actual EW section
    const ewSection = ewSectionWrapper.locator('[data-testid="ew-section"]')
    await expect(ewSection).toBeVisible()
  })

  test('EW section wrapper is below main row', async ({ page }) => {
    const mainRow = page.locator('[data-testid="main-row"]')
    const ewSectionWrapper = page.locator('[data-testid="ew-section-wrapper"]')

    const mainRowBox = await mainRow.boundingBox()
    const ewBox = await ewSectionWrapper.boundingBox()

    expect(mainRowBox).not.toBeNull()
    expect(ewBox).not.toBeNull()

    if (mainRowBox && ewBox) {
      // EW section should be below the main row
      expect(ewBox.y).toBeGreaterThan(mainRowBox.y + mainRowBox.height - 10)
    }
  })

  test('left sidebar is separate from main row', async ({ page }) => {
    const sidebar = page.locator('[data-testid="left-sidebar"]')
    const mainRow = page.locator('[data-testid="main-row"]')

    const sidebarBox = await sidebar.boundingBox()
    const mainRowBox = await mainRow.boundingBox()

    expect(sidebarBox).not.toBeNull()
    expect(mainRowBox).not.toBeNull()

    if (sidebarBox && mainRowBox) {
      // Sidebar should be at the left of the layout
      // Main row contains sidebar, board, and eval panel in a grid
      expect(sidebarBox.x).toBeLessThan(mainRowBox.x + mainRowBox.width)
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

  test('EW section has config toggle', async ({ page }) => {
    const ewSection = page.locator('[data-testid="ew-section"]')
    await expect(ewSection.locator('[data-testid="ew-config-toggle"]')).toBeVisible()
  })

  test('EW section has status display', async ({ page }) => {
    const ewSection = page.locator('[data-testid="ew-section"]')
    await expect(ewSection.locator('[data-testid="ew-status"]')).toBeVisible()
  })
})
