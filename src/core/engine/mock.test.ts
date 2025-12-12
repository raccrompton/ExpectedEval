/**
 * Unit Tests for Mock Engine Implementations
 *
 * Tests that our mock engines:
 * 1. Implement the adapter interface correctly
 * 2. Return configurable results
 * 3. Simulate error conditions properly
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  MockStockfish,
  MockMaia,
  createMockStockfish,
  createMockMaia,
  createMockEngines,
} from './mock'
import { cpToWinrate } from './types'

// ============================================================================
// MockStockfish tests
// ============================================================================

describe('MockStockfish', () => {
  // Test FEN for a position after 1. e4
  const TEST_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

  /**
   * Test: Initialization lifecycle
   */
  describe('initialization', () => {
    it('starts not ready', () => {
      const sf = new MockStockfish()
      expect(sf.isReady()).toBe(false)
    })

    it('becomes ready after init()', async () => {
      const sf = new MockStockfish()
      await sf.init()
      expect(sf.isReady()).toBe(true)
    })

    it('throws if evaluate() called before init()', async () => {
      const sf = new MockStockfish()

      await expect(sf.evaluate(TEST_FEN)).rejects.toThrow('not initialized')
    })

    it('becomes not ready after destroy()', async () => {
      const sf = new MockStockfish()
      await sf.init()
      sf.destroy()
      expect(sf.isReady()).toBe(false)
    })
  })

  /**
   * Test: Basic evaluation
   */
  describe('evaluate', () => {
    let sf: MockStockfish

    beforeEach(async () => {
      sf = new MockStockfish()
      await sf.init()
    })

    it('returns default centipawn evaluation', async () => {
      const result = await sf.evaluate(TEST_FEN)

      // Default is 20 cp
      expect(result.cp).toBe(20)
      expect(result.winrate).toBeCloseTo(cpToWinrate(20), 2)
    })

    it('returns configured centipawn evaluation', async () => {
      const sf = new MockStockfish({ defaultCp: 150 })
      await sf.init()

      const result = await sf.evaluate(TEST_FEN)

      expect(result.cp).toBe(150)
    })

    it('uses position-specific evaluations', async () => {
      const sf = new MockStockfish({
        defaultCp: 20,
        positionEvaluations: {
          [TEST_FEN]: -50, // Black slightly better after 1. e4
        },
      })
      await sf.init()

      const result = await sf.evaluate(TEST_FEN)

      expect(result.cp).toBe(-50)
    })

    it('falls back to default for unknown positions', async () => {
      const sf = new MockStockfish({
        defaultCp: 100,
        positionEvaluations: {
          'some-other-fen': -50,
        },
      })
      await sf.init()

      const result = await sf.evaluate(TEST_FEN)

      expect(result.cp).toBe(100)
    })

    it('respects config depth parameter', async () => {
      const result = await sf.evaluate(TEST_FEN, { depth: 20 })

      expect(result.depth).toBe(20)
    })

    it('returns best move suggestion', async () => {
      const result = await sf.evaluate(TEST_FEN)

      expect(result.bestMove).toBeDefined()
      expect(typeof result.bestMove).toBe('string')
    })

    it('sets isMate to false for normal positions', async () => {
      const result = await sf.evaluate(TEST_FEN)

      expect(result.isMate).toBe(false)
      expect(result.mateIn).toBeUndefined()
    })
  })

  /**
   * Test: Error simulation
   */
  describe('error handling', () => {
    it('throws when shouldFail is true', async () => {
      const sf = new MockStockfish({
        shouldFail: true,
        errorMessage: 'Test failure',
      })
      await sf.init()

      await expect(sf.evaluate(TEST_FEN)).rejects.toThrow('Test failure')
    })

    it('uses default error message', async () => {
      const sf = new MockStockfish({ shouldFail: true })
      await sf.init()

      await expect(sf.evaluate(TEST_FEN)).rejects.toThrow('Simulated failure')
    })
  })

  /**
   * Test: stop() method
   */
  describe('stop', () => {
    it('does not throw', async () => {
      const sf = new MockStockfish()
      await sf.init()

      expect(() => sf.stop()).not.toThrow()
    })
  })
})

// ============================================================================
// MockMaia tests
// ============================================================================

describe('MockMaia', () => {
  // Test FEN for position after 1. e4
  const TEST_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

  /**
   * Test: Initialization lifecycle
   */
  describe('initialization', () => {
    it('starts not ready', () => {
      const maia = new MockMaia()
      expect(maia.isReady()).toBe(false)
    })

    it('becomes ready after init()', async () => {
      const maia = new MockMaia()
      await maia.init()
      expect(maia.isReady()).toBe(true)
    })

    it('throws if predict() called before init()', async () => {
      const maia = new MockMaia()

      await expect(maia.predict(TEST_FEN)).rejects.toThrow('not initialized')
    })

    it('becomes not ready after destroy()', async () => {
      const maia = new MockMaia()
      await maia.init()
      maia.destroy()
      expect(maia.isReady()).toBe(false)
    })
  })

  /**
   * Test: Basic prediction
   */
  describe('predict', () => {
    let maia: MockMaia

    beforeEach(async () => {
      maia = new MockMaia()
      await maia.init()
    })

    it('returns default move probabilities', async () => {
      const result = await maia.predict(TEST_FEN)

      expect(result.policy).toBeDefined()
      expect(Object.keys(result.policy).length).toBeGreaterThan(0)
    })

    it('returns default value (win probability)', async () => {
      const result = await maia.predict(TEST_FEN)

      expect(result.value).toBeDefined()
      expect(result.value).toBeGreaterThanOrEqual(0)
      expect(result.value).toBeLessThanOrEqual(1)
    })

    it('returns configured policy', async () => {
      const customPolicy = {
        'e7e5': 0.60,
        'c7c5': 0.30,
        'd7d5': 0.10,
      }
      const maia = new MockMaia({ defaultPolicy: customPolicy })
      await maia.init()

      const result = await maia.predict(TEST_FEN)

      expect(result.policy).toEqual(customPolicy)
    })

    it('returns configured value', async () => {
      const maia = new MockMaia({ defaultValue: 0.65 })
      await maia.init()

      const result = await maia.predict(TEST_FEN)

      expect(result.value).toBe(0.65)
    })

    it('uses position-specific predictions', async () => {
      const specificPrediction = {
        policy: { 'e7e5': 1.0 },
        value: 0.45,
        eloLevel: 1500,
      }
      const maia = new MockMaia({
        positionPredictions: {
          [TEST_FEN]: specificPrediction,
        },
      })
      await maia.init()

      const result = await maia.predict(TEST_FEN)

      expect(result.policy).toEqual({ 'e7e5': 1.0 })
      expect(result.value).toBe(0.45)
    })

    it('respects config elo level', async () => {
      const result = await maia.predict(TEST_FEN, { eloLevel: 1900 })

      expect(result.eloLevel).toBe(1900)
    })

    it('uses default elo level when not specified', async () => {
      const result = await maia.predict(TEST_FEN)

      expect(result.eloLevel).toBe(1500) // Default
    })
  })

  /**
   * Test: Error simulation
   */
  describe('error handling', () => {
    it('throws when shouldFail is true', async () => {
      const maia = new MockMaia({
        shouldFail: true,
        errorMessage: 'ONNX failure',
      })
      await maia.init()

      await expect(maia.predict(TEST_FEN)).rejects.toThrow('ONNX failure')
    })

    it('uses default error message', async () => {
      const maia = new MockMaia({ shouldFail: true })
      await maia.init()

      await expect(maia.predict(TEST_FEN)).rejects.toThrow('Simulated failure')
    })
  })
})

// ============================================================================
// Factory function tests
// ============================================================================

describe('factory functions', () => {
  describe('createMockStockfish', () => {
    it('creates a MockStockfish instance', () => {
      const sf = createMockStockfish()
      expect(sf).toBeInstanceOf(MockStockfish)
    })

    it('passes options to the instance', async () => {
      const sf = createMockStockfish({ defaultCp: 200 })
      await sf.init()
      const result = await sf.evaluate('test-fen')
      expect(result.cp).toBe(200)
    })
  })

  describe('createMockMaia', () => {
    it('creates a MockMaia instance', () => {
      const maia = createMockMaia()
      expect(maia).toBeInstanceOf(MockMaia)
    })

    it('passes options to the instance', async () => {
      const maia = createMockMaia({ defaultValue: 0.75 })
      await maia.init()
      const result = await maia.predict('test-fen')
      expect(result.value).toBe(0.75)
    })
  })

  describe('createMockEngines', () => {
    it('creates both mock engines', () => {
      const { stockfish, maia } = createMockEngines()

      expect(stockfish).toBeInstanceOf(MockStockfish)
      expect(maia).toBeInstanceOf(MockMaia)
    })

    it('passes options to each engine', async () => {
      const { stockfish, maia } = createMockEngines(
        { defaultCp: 100 },
        { defaultValue: 0.60 }
      )

      await stockfish.init()
      await maia.init()

      const sfResult = await stockfish.evaluate('test')
      const maiaResult = await maia.predict('test')

      expect(sfResult.cp).toBe(100)
      expect(maiaResult.value).toBe(0.60)
    })
  })
})

// ============================================================================
// Integration-style tests
// ============================================================================

describe('mock engine integration', () => {
  /**
   * Test: Simulating Expected Winrate workflow
   * This tests that mocks work together like real engines would.
   */
  it('can simulate EW calculation workflow', async () => {
    // Setup: Create engines with realistic settings
    const { stockfish, maia } = createMockEngines(
      { defaultCp: 30 },  // Slight White advantage
      {
        defaultPolicy: {
          'e7e5': 0.45,
          'c7c5': 0.25,
          'd7d6': 0.15,
          'e7e6': 0.10,
          'g8f6': 0.05,
        },
        defaultValue: 0.48,  // Slightly worse for Black
      }
    )

    await stockfish.init()
    await maia.init()

    // Step 1: Get Stockfish evaluation for base position
    const sfEval = await stockfish.evaluate(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
    )
    expect(sfEval.cp).toBe(30)
    expect(sfEval.winrate).toBeGreaterThan(0.5) // White is better

    // Step 2: Get Maia predictions for Black's response
    const maiaPred = await maia.predict(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
    )
    expect(maiaPred.policy['e7e5']).toBe(0.45) // Most likely move
    expect(maiaPred.value).toBeLessThan(0.5)   // Black is worse

    // Step 3: Sum of probabilities should be meaningful
    const totalProb = Object.values(maiaPred.policy).reduce((a, b) => a + b, 0)
    expect(totalProb).toBeCloseTo(1.0, 1)

    // Cleanup
    stockfish.destroy()
    maia.destroy()
  })
})
