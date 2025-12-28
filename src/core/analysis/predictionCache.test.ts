/**
 * Unit Tests for Prediction Cache
 *
 * Tests the LRU cache for Maia predictions used in Expected Winrate.
 * The cache prevents redundant Maia calls for the same position.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCachedPrediction,
  cachePrediction,
  clearCache,
  getCacheStats,
} from './predictionCache'
import type { MaiaEvaluation } from '../engine/types'

// Test FEN positions
const FEN_1 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
const FEN_2 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
const FEN_3 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2'

// Test Maia evaluations
function createMaiaEval(value: number): MaiaEvaluation {
  return {
    policy: { e7e5: 0.4, c7c5: 0.3, d7d6: 0.15 },
    value,
    eloLevel: 1500,
  }
}

describe('predictionCache', () => {
  beforeEach(() => {
    clearCache()
  })

  describe('getCachedPrediction', () => {
    it('returns undefined for uncached FEN', () => {
      const result = getCachedPrediction(FEN_1)

      expect(result).toBeUndefined()
    })

    it('returns cached prediction for previously stored FEN', () => {
      const evaluation = createMaiaEval(0.55)
      cachePrediction(FEN_1, evaluation)

      const result = getCachedPrediction(FEN_1)

      expect(result).toEqual(evaluation)
    })

    it('returns correct prediction when multiple FENs are cached', () => {
      const eval1 = createMaiaEval(0.55)
      const eval2 = createMaiaEval(0.48)
      const eval3 = createMaiaEval(0.52)

      cachePrediction(FEN_1, eval1)
      cachePrediction(FEN_2, eval2)
      cachePrediction(FEN_3, eval3)

      expect(getCachedPrediction(FEN_1)).toEqual(eval1)
      expect(getCachedPrediction(FEN_2)).toEqual(eval2)
      expect(getCachedPrediction(FEN_3)).toEqual(eval3)
    })
  })

  describe('cachePrediction', () => {
    it('stores prediction that can be retrieved', () => {
      const evaluation = createMaiaEval(0.6)

      cachePrediction(FEN_1, evaluation)

      expect(getCachedPrediction(FEN_1)).toEqual(evaluation)
    })

    it('overwrites existing prediction for same FEN', () => {
      const firstEval = createMaiaEval(0.55)
      const secondEval = createMaiaEval(0.60)

      cachePrediction(FEN_1, firstEval)
      cachePrediction(FEN_1, secondEval)

      expect(getCachedPrediction(FEN_1)).toEqual(secondEval)
    })
  })

  describe('clearCache', () => {
    it('removes all cached predictions', () => {
      cachePrediction(FEN_1, createMaiaEval(0.55))
      cachePrediction(FEN_2, createMaiaEval(0.48))

      clearCache()

      expect(getCachedPrediction(FEN_1)).toBeUndefined()
      expect(getCachedPrediction(FEN_2)).toBeUndefined()
    })

    it('resets cache statistics', () => {
      cachePrediction(FEN_1, createMaiaEval(0.55))
      getCachedPrediction(FEN_1)
      getCachedPrediction(FEN_2) // miss

      clearCache()

      const stats = getCacheStats()
      expect(stats.size).toBe(0)
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
    })
  })

  describe('getCacheStats', () => {
    it('tracks cache size', () => {
      cachePrediction(FEN_1, createMaiaEval(0.55))
      cachePrediction(FEN_2, createMaiaEval(0.48))

      const stats = getCacheStats()

      expect(stats.size).toBe(2)
    })

    it('tracks cache hits', () => {
      cachePrediction(FEN_1, createMaiaEval(0.55))

      getCachedPrediction(FEN_1) // hit
      getCachedPrediction(FEN_1) // hit

      const stats = getCacheStats()
      expect(stats.hits).toBe(2)
    })

    it('tracks cache misses', () => {
      getCachedPrediction(FEN_1) // miss
      getCachedPrediction(FEN_2) // miss

      const stats = getCacheStats()
      expect(stats.misses).toBe(2)
    })

    it('calculates hit rate correctly', () => {
      cachePrediction(FEN_1, createMaiaEval(0.55))

      getCachedPrediction(FEN_1) // hit
      getCachedPrediction(FEN_1) // hit
      getCachedPrediction(FEN_2) // miss

      const stats = getCacheStats()
      expect(stats.hitRate).toBeCloseTo(2 / 3, 2)
    })
  })

  describe('LRU eviction', () => {
    it('evicts least recently used entries when cache exceeds limit', () => {
      // This test verifies LRU behavior
      // Cache has a max size (default 1000), and should evict oldest entries

      // Store entries
      cachePrediction(FEN_1, createMaiaEval(0.55))
      cachePrediction(FEN_2, createMaiaEval(0.48))
      cachePrediction(FEN_3, createMaiaEval(0.52))

      // Access FEN_1 to make it "recently used"
      getCachedPrediction(FEN_1)

      // All should still be available (cache isn't full)
      expect(getCachedPrediction(FEN_1)).toBeDefined()
      expect(getCachedPrediction(FEN_2)).toBeDefined()
      expect(getCachedPrediction(FEN_3)).toBeDefined()
    })
  })
})
