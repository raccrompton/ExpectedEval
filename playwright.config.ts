/**
 * Playwright Configuration for ExpectedEval E2E Tests
 *
 * Playwright is a browser automation tool for end-to-end testing.
 * It launches real browsers (Chrome, Firefox, Safari) and simulates
 * user interactions to test the full application flow.
 *
 * Configuration docs: https://playwright.dev/docs/test-configuration
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  /**
   * Directory containing the test files.
   * We put E2E tests in a dedicated __tests__/e2e folder to separate
   * them from unit tests (which use Vitest).
   */
  testDir: './src/__tests__/e2e',

  /**
   * Run tests in files in parallel.
   * Each test file runs in its own worker for speed.
   */
  fullyParallel: true,

  /**
   * Fail the build on CI if you accidentally left test.only in the source code.
   * This prevents accidentally skipping tests in production.
   */
  forbidOnly: !!process.env.CI,

  /**
   * Retry failed tests on CI to handle flaky tests.
   * Locally we don't retry - a failure is a failure.
   */
  retries: process.env.CI ? 2 : 0,

  /**
   * Number of parallel workers.
   * On CI we use fewer workers to avoid resource contention.
   */
  workers: process.env.CI ? 1 : undefined,

  /**
   * Reporter configuration.
   * 'html' generates a nice visual report in playwright-report/
   * 'list' shows test results in the terminal as they run
   */
  reporter: [['html'], ['list']],

  /**
   * Shared settings for all projects (browsers).
   * These apply to every test unless overridden.
   */
  use: {
    /**
     * Base URL for page.goto() calls.
     * This means we can write page.goto('/analysis') instead of
     * page.goto('http://localhost:3000/analysis')
     * Uses CONDUCTOR_PORT if set, otherwise defaults to 3000.
     */
    baseURL: `http://localhost:${process.env.CONDUCTOR_PORT || 3000}`,

    /**
     * Collect trace when retrying a failed test.
     * Traces are recordings of all browser activity that help debug failures.
     */
    trace: 'on-first-retry',

    /**
     * Take a screenshot on test failure.
     * This helps identify what the page looked like when a test failed.
     */
    screenshot: 'only-on-failure',
  },

  /**
   * Configure projects for different browsers.
   * We test primarily on Chromium (Chrome) since that's what most users have.
   * Add Firefox and WebKit for cross-browser testing as needed.
   */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment these to test on more browsers:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /**
   * Run your local dev server before starting the tests.
   * This automatically starts 'npm run dev' and waits for the server.
   *
   * The reuseExistingServer option means if you already have a dev server
   * running, Playwright will use that instead of starting a new one.
   *
   * Uses CONDUCTOR_PORT if set, otherwise defaults to 3000.
   */
  webServer: {
    command: `PORT=${process.env.CONDUCTOR_PORT || 3000} npm run dev`,
    url: `http://localhost:${process.env.CONDUCTOR_PORT || 3000}`,
    reuseExistingServer: !process.env.CI,
    // Wait up to 2 minutes for the server to start
    timeout: 120000,
  },
})
