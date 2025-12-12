/**
 * Vitest Global Test Setup
 *
 * This file runs before each test file. It sets up the testing environment
 * with any global configurations, mocks, or utilities that tests need.
 *
 * Common uses:
 * - Set up testing-library matchers (expect extensions)
 * - Configure global mocks (e.g., browser APIs not in jsdom)
 * - Set up cleanup between tests
 */

// Import testing-library cleanup and matchers
import '@testing-library/dom'

/**
 * Mock for ResizeObserver
 *
 * ResizeObserver is a browser API that watches for element size changes.
 * jsdom doesn't implement it, but some UI components (like chessground)
 * use it. This provides a no-op mock so tests don't crash.
 */
if (typeof ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

/**
 * Mock for matchMedia
 *
 * matchMedia is used for responsive design (media queries in JS).
 * jsdom doesn't implement it, so we provide a basic mock.
 */
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

/**
 * Suppress console errors/warnings in tests
 *
 * Uncomment these if you want cleaner test output.
 * Be careful - this can hide real issues!
 */
// console.error = vi.fn()
// console.warn = vi.fn()
