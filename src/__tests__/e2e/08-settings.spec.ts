/**
 * E2E Tests for Settings Dropdown (Phase 10)
 *
 * Tests the Settings dropdown in the header that allows users to configure:
 * - Probability Threshold (1%, 2%, 5%)
 * - Maia Level (1100-1900)
 * - SF Depth (10, 12, 14, 16, 18)
 * - Winrate Loss Threshold (3%, 5%, 10%)
 *
 * Settings persist to localStorage and are wired to EW calculation.
 */
import { test, expect, type Page } from '@playwright/test'

test.setTimeout(30000)

const TEST_URL = '/'

test.describe('08 - Settings', () => {
  test.describe('Settings Button Visibility', () => {
    test('settings button is visible in header', async ({ page }) => {
      await page.goto(TEST_URL)

      const settingsButton = page.getByTestId('settings-button')
      await expect(settingsButton).toBeVisible()
    })

    test('settings button has gear icon or label', async ({ page }) => {
      await page.goto(TEST_URL)

      const settingsButton = page.getByTestId('settings-button')
      const buttonText = await settingsButton.textContent()

      expect(buttonText?.length).toBeGreaterThan(0)
    })
  })

  test.describe('Settings Dropdown Toggle', () => {
    test('clicking settings button opens dropdown', async ({ page }) => {
      await page.goto(TEST_URL)

      await page.getByTestId('settings-button').click()

      const dropdown = page.getByTestId('settings-dropdown')
      await expect(dropdown).toBeVisible()
    })

    test('clicking settings button again closes dropdown', async ({ page }) => {
      await page.goto(TEST_URL)

      const settingsButton = page.getByTestId('settings-button')
      await settingsButton.click()
      await expect(page.getByTestId('settings-dropdown')).toBeVisible()

      await settingsButton.click()
      await expect(page.getByTestId('settings-dropdown')).not.toBeVisible()
    })

    test('clicking outside dropdown closes it', async ({ page }) => {
      await page.goto(TEST_URL)

      await page.getByTestId('settings-button').click()
      await expect(page.getByTestId('settings-dropdown')).toBeVisible()

      await page.click('body', { position: { x: 10, y: 10 } })
      await expect(page.getByTestId('settings-dropdown')).not.toBeVisible()
    })
  })

  test.describe('Settings Controls', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(TEST_URL)
      await page.getByTestId('settings-button').click()
      await expect(page.getByTestId('settings-dropdown')).toBeVisible()
    })

    test('probability threshold selector is visible', async ({ page }) => {
      const selector = page.getByTestId('settings-prob-threshold')
      await expect(selector).toBeVisible()
    })

    test('probability threshold has correct options', async ({ page }) => {
      const selector = page.getByTestId('settings-prob-threshold')

      await expect(selector.locator('option[value="0.01"]')).toBeAttached()
      await expect(selector.locator('option[value="0.02"]')).toBeAttached()
      await expect(selector.locator('option[value="0.05"]')).toBeAttached()
    })

    test('maia level selector is visible', async ({ page }) => {
      const selector = page.getByTestId('settings-maia-level')
      await expect(selector).toBeVisible()
    })

    test('maia level has correct options', async ({ page }) => {
      const selector = page.getByTestId('settings-maia-level')

      await expect(selector.locator('option[value="1100"]')).toBeAttached()
      await expect(selector.locator('option[value="1500"]')).toBeAttached()
      await expect(selector.locator('option[value="1900"]')).toBeAttached()
    })

    test('sf depth selector is visible', async ({ page }) => {
      const selector = page.getByTestId('settings-sf-depth')
      await expect(selector).toBeVisible()
    })

    test('sf depth has correct options', async ({ page }) => {
      const selector = page.getByTestId('settings-sf-depth')

      await expect(selector.locator('option[value="10"]')).toBeAttached()
      await expect(selector.locator('option[value="12"]')).toBeAttached()
      await expect(selector.locator('option[value="14"]')).toBeAttached()
      await expect(selector.locator('option[value="16"]')).toBeAttached()
      await expect(selector.locator('option[value="18"]')).toBeAttached()
    })

    test('winrate loss selector is visible', async ({ page }) => {
      const selector = page.getByTestId('settings-winrate-loss')
      await expect(selector).toBeVisible()
    })

    test('winrate loss has correct options', async ({ page }) => {
      const selector = page.getByTestId('settings-winrate-loss')

      await expect(selector.locator('option[value="0.03"]')).toBeAttached()
      await expect(selector.locator('option[value="0.05"]')).toBeAttached()
      await expect(selector.locator('option[value="0.1"]')).toBeAttached()
    })
  })

  test.describe('Settings Changes', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(TEST_URL)
      await page.getByTestId('settings-button').click()
    })

    test('can change probability threshold', async ({ page }) => {
      const selector = page.getByTestId('settings-prob-threshold')
      await selector.selectOption('0.05')
      await expect(selector).toHaveValue('0.05')
    })

    test('can change maia level', async ({ page }) => {
      const selector = page.getByTestId('settings-maia-level')
      await selector.selectOption('1700')
      await expect(selector).toHaveValue('1700')
    })

    test('can change sf depth', async ({ page }) => {
      const selector = page.getByTestId('settings-sf-depth')
      await selector.selectOption('14')
      await expect(selector).toHaveValue('14')
    })

    test('can change winrate loss threshold', async ({ page }) => {
      const selector = page.getByTestId('settings-winrate-loss')
      await selector.selectOption('0.1')
      await expect(selector).toHaveValue('0.1')
    })
  })

  test.describe('localStorage Persistence', () => {
    test('settings are persisted to localStorage', async ({ page }) => {
      await page.goto(TEST_URL)
      await page.getByTestId('settings-button').click()

      await page.getByTestId('settings-prob-threshold').selectOption('0.05')
      await page.getByTestId('settings-maia-level').selectOption('1700')

      const stored = await page.evaluate(() => {
        return localStorage.getItem('expectedeval-settings')
      })

      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.probabilityThreshold).toBe(0.05)
      expect(parsed.maiaLevel).toBe(1700)
    })

    test('settings are loaded from localStorage on page load', async ({ page }) => {
      await page.goto(TEST_URL)

      await page.evaluate(() => {
        localStorage.setItem(
          'expectedeval-settings',
          JSON.stringify({
            probabilityThreshold: 0.02,
            maiaLevel: 1300,
            stockfishDepth: 16,
            winrateLossThreshold: 0.1,
          })
        )
      })

      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.getByTestId('settings-button').click()

      await expect(page.getByTestId('settings-prob-threshold')).toHaveValue('0.02')
      await expect(page.getByTestId('settings-maia-level')).toHaveValue('1300')
      await expect(page.getByTestId('settings-sf-depth')).toHaveValue('16')
      await expect(page.getByTestId('settings-winrate-loss')).toHaveValue('0.1')
    })

    test('invalid localStorage data falls back to defaults', async ({ page }) => {
      await page.goto(TEST_URL)

      await page.evaluate(() => {
        localStorage.setItem('expectedeval-settings', 'invalid json')
      })

      await page.reload()
      await page.getByTestId('settings-button').click()

      await expect(page.getByTestId('settings-prob-threshold')).toHaveValue('0.01')
      await expect(page.getByTestId('settings-maia-level')).toHaveValue('1500')
    })
  })

  test.describe('Settings Wired to EW Config', () => {
    test('EW config panel reflects changed settings', async ({ page }) => {
      await page.goto(TEST_URL)

      await page.getByTestId('settings-button').click()
      await page.getByTestId('settings-prob-threshold').selectOption('0.05')
      await page.getByTestId('settings-maia-level').selectOption('1700')
      await page.getByTestId('settings-button').click()

      await page.getByTestId('ew-config-toggle').click()
      const configPanel = page.getByTestId('ew-config-panel')
      await expect(configPanel).toContainText('5%')
      await expect(configPanel).toContainText('1700')
    })
  })

  test.describe('Accessibility', () => {
    test('settings dropdown has proper aria attributes', async ({ page }) => {
      await page.goto(TEST_URL)

      const settingsButton = page.getByTestId('settings-button')
      await expect(settingsButton).toHaveAttribute('aria-label', /settings/i)

      await settingsButton.click()
      await expect(settingsButton).toHaveAttribute('aria-expanded', 'true')

      await settingsButton.click()
      await expect(settingsButton).toHaveAttribute('aria-expanded', 'false')
    })

    test('selectors have proper labels', async ({ page }) => {
      await page.goto(TEST_URL)
      await page.getByTestId('settings-button').click()

      const probLabel = page.locator('label[for="settings-prob-threshold"]')
      await expect(probLabel).toBeVisible()

      const maiaLabel = page.locator('label[for="settings-maia-level"]')
      await expect(maiaLabel).toBeVisible()
    })
  })

  test.describe('No Console Errors', () => {
    test('no console errors when changing settings', async ({ page }) => {
      const errors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text()
          if (!text.includes('favicon') && !text.includes('404')) {
            errors.push(text)
          }
        }
      })

      await page.goto(TEST_URL)
      await page.getByTestId('settings-button').click()
      await page.getByTestId('settings-prob-threshold').selectOption('0.05')
      await page.getByTestId('settings-maia-level').selectOption('1700')
      await page.getByTestId('settings-sf-depth').selectOption('14')
      await page.getByTestId('settings-winrate-loss').selectOption('0.1')
      await page.getByTestId('settings-button').click()

      expect(errors).toEqual([])
    })
  })
})
