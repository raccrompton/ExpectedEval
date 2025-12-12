/**
 * Vitest Configuration for ExpectedEval
 *
 * Vitest is a fast unit testing framework that's compatible with Jest's API.
 * We use it for testing our core logic (pure functions) and React components.
 *
 * Configuration docs: https://vitest.dev/config/
 */
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    /**
     * Test environment - 'jsdom' simulates a browser environment.
     * This is needed for testing React components and any code
     * that uses browser APIs like DOM manipulation.
     *
     * For pure functions (core logic), this still works fine -
     * the DOM APIs are just available but not required.
     */
    environment: 'jsdom',

    /**
     * Glob patterns for test files.
     * We look for .test.ts and .test.tsx files in the src directory.
     * This keeps tests co-located with the code they test.
     */
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],

    /**
     * Files to exclude from testing.
     * We don't want to run tests in node_modules or the reference codebase.
     */
    exclude: ['node_modules', 'maia-platform-frontend'],

    /**
     * Global test setup.
     * globals: true means we don't need to import describe, it, expect
     * in every test file - they're available globally like in Jest.
     */
    globals: true,

    /**
     * Coverage configuration.
     * We use v8 for coverage collection (fast and accurate).
     */
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Focus coverage on core logic - the most important code to test
      include: ['src/core/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
    },

    /**
     * Setup files run before each test file.
     * We'll create this to set up testing-library and any global mocks.
     */
    setupFiles: ['./src/test/setup.ts'],
  },

  /**
   * Path resolution - matches tsconfig.json paths.
   * This lets us use '@/' as an alias for the src directory.
   */
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
