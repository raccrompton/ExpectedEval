import { test, expect } from '@playwright/test'

/**
 * Layout tests to verify the reorganized UI structure
 *
 * New Layout:
 * ┌────────────────────────────────────────────────────────────────┐
 * │ Header                                              [Settings] │
 * ├─────────────┬─────────────┬────────────────────────────────────┤
 * │ PgnInput    │ MoveList    │ EnginePanel (SF | Maia)            │
 * │ (compact)   │ (truncated) │ (side-by-side)                     │
 * ├─────────────┴─────────────┴────────────────────────────────────┤
 * │                                                                │
 * │   Board          │       Expected Winrate Section              │
 * │   + Nav          │       (fills remaining space)               │
 * │                                                                │
 * └────────────────────────────────────────────────────────────────┘
 *
 * Key layout requirements:
 * 1. Middle row: PGN input | Move list | Engine panel (SF+Maia side-by-side)
 * 2. Bottom row: Board + nav controls | EW section
 * 3. All fits on screen without scrolling
 */

test.describe('UI Layout Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('has middle row with PGN, Moves, and Analysis sections', async ({ page }) => {
    const middleRow = page.locator('[data-testid="main-row"]')
    await expect(middleRow).toBeVisible()

    // PGN section
    const pgnSection = middleRow.locator('[data-testid="pgn-section"]')
    await expect(pgnSection).toBeVisible()
    await expect(pgnSection.locator('[data-testid="pgn-input"]')).toBeVisible()
    await expect(pgnSection.locator('[data-testid="load-pgn-button"]')).toBeVisible()

    // Moves section
    const movesSection = middleRow.locator('[data-testid="moves-section"]')
    await expect(movesSection).toBeVisible()
    await expect(movesSection.locator('[data-testid="move-list"]')).toBeVisible()

    // Eval panel
    const evalPanel = middleRow.locator('[data-testid="eval-panel"]')
    await expect(evalPanel).toBeVisible()
  })

  test('has bottom row with board and EW section', async ({ page }) => {
    await page.getByTestId('tab-ew').click()

    const bottomRow = page.locator('[data-testid="bottom-row"]')
    await expect(bottomRow).toBeVisible()

    // Board section with navigation
    const boardSection = bottomRow.locator('[data-testid="board-section"]')
    await expect(boardSection).toBeVisible()
    await expect(boardSection.locator('.cg-wrap')).toBeVisible()
    await expect(boardSection.locator('[data-testid="navigation-controls"]')).toBeVisible()

    // EW section wrapper
    const ewSectionWrapper = bottomRow.locator('[data-testid="ew-section-wrapper"]')
    await expect(ewSectionWrapper).toBeVisible()
    await expect(ewSectionWrapper.locator('[data-testid="ew-section"]')).toBeVisible()
  })

  test('middle row sections are horizontally arranged', async ({ page }) => {
    const middleRow = page.locator('[data-testid="main-row"]')
    const pgnSection = middleRow.locator('[data-testid="pgn-section"]')
    const movesSection = middleRow.locator('[data-testid="moves-section"]')
    const evalPanel = middleRow.locator('[data-testid="eval-panel"]')

    const pgnBox = await pgnSection.boundingBox()
    const movesBox = await movesSection.boundingBox()
    const evalBox = await evalPanel.boundingBox()

    expect(pgnBox).not.toBeNull()
    expect(movesBox).not.toBeNull()
    expect(evalBox).not.toBeNull()

    if (pgnBox && movesBox && evalBox) {
      // Moves should be to the right of PGN
      expect(movesBox.x).toBeGreaterThan(pgnBox.x)
      // Eval should be to the right of Moves
      expect(evalBox.x).toBeGreaterThan(movesBox.x)
      // All should be roughly on the same vertical level
      expect(Math.abs(movesBox.y - pgnBox.y)).toBeLessThan(20)
      expect(Math.abs(evalBox.y - pgnBox.y)).toBeLessThan(20)
    }
  })

  test('bottom row has board and EW section side by side', async ({ page }) => {
    const bottomRow = page.locator('[data-testid="bottom-row"]')
    const boardSection = bottomRow.locator('[data-testid="board-section"]')
    const ewSection = bottomRow.locator('[data-testid="ew-section-wrapper"]')

    // Wait for elements to be visible before getting bounding box
    await expect(boardSection).toBeVisible()
    await expect(ewSection).toBeVisible()

    const boardBox = await boardSection.boundingBox()
    const ewBox = await ewSection.boundingBox()

    expect(boardBox).not.toBeNull()
    expect(ewBox).not.toBeNull()

    if (boardBox && ewBox) {
      // EW section should be to the right of board
      expect(ewBox.x).toBeGreaterThan(boardBox.x)
      // They should be roughly on the same vertical level
      expect(Math.abs(ewBox.y - boardBox.y)).toBeLessThan(50)
    }
  })

  test('bottom row is below middle row', async ({ page }) => {
    const middleRow = page.locator('[data-testid="main-row"]')
    const bottomRow = page.locator('[data-testid="bottom-row"]')

    const middleBox = await middleRow.boundingBox()
    const bottomBox = await bottomRow.boundingBox()

    expect(middleBox).not.toBeNull()
    expect(bottomBox).not.toBeNull()

    if (middleBox && bottomBox) {
      // Bottom row should be below the middle row
      expect(bottomBox.y).toBeGreaterThan(middleBox.y + middleBox.height - 10)
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

  test('SF and Maia sections are side by side', async ({ page }) => {
    const evalPanel = page.locator('[data-testid="eval-panel"]')
    const sfSection = evalPanel.locator('[data-testid="stockfish-section"]')
    const maiaSection = evalPanel.locator('[data-testid="maia-section"]')

    const sfBox = await sfSection.boundingBox()
    const maiaBox = await maiaSection.boundingBox()

    expect(sfBox).not.toBeNull()
    expect(maiaBox).not.toBeNull()

    if (sfBox && maiaBox) {
      // Maia should be to the right of SF (side by side)
      expect(maiaBox.x).toBeGreaterThan(sfBox.x)
      // They should be on the same vertical level
      expect(Math.abs(maiaBox.y - sfBox.y)).toBeLessThan(20)
    }
  })
})

test.describe('EW Section Content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('EW section has config toggle', async ({ page }) => {
    await page.getByTestId('tab-ew').click()

    const ewSection = page.locator('[data-testid="ew-section"]')
    await expect(ewSection.locator('[data-testid="ew-config-toggle"]')).toBeVisible()
  })

  test('EW section shows idle state with analyze button initially', async ({ page }) => {
    await page.getByTestId('tab-ew').click()

    const ewSection = page.locator('[data-testid="ew-section"]')
    // Before clicking analyze, should show idle state with description and button
    await expect(ewSection.locator('[data-testid="ew-idle"]')).toBeVisible()
    await expect(ewSection.locator('[data-testid="ew-analyze-button"]')).toBeVisible()
  })
})
