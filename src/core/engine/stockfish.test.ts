/**
 * Unit Tests for Stockfish Engine Helper Functions
 *
 * Tests the pure helper functions extracted from the Stockfish engine.
 * The actual WASM engine is not tested here (requires browser environment).
 */

import { describe, it, expect } from 'vitest'
import { computeMateInfo } from './stockfish'

describe('computeMateInfo', () => {
  /**
   * Test: No mate information
   * When mate_vec is undefined, isMate should be false.
   */
  it('returns isMate false when mate_vec is undefined', () => {
    const result = computeMateInfo(undefined, 'e2e4')

    expect(result.isMate).toBe(false)
    expect(result.mateIn).toBeUndefined()
  })

  /**
   * Test: Empty mate_vec
   * When mate_vec is empty object, isMate should be false.
   */
  it('returns isMate false when mate_vec is empty', () => {
    const result = computeMateInfo({}, 'e2e4')

    expect(result.isMate).toBe(false)
    expect(result.mateIn).toBeUndefined()
  })

  /**
   * Test: Best move is a mate move
   * When bestMove is in mate_vec, isMate should be true.
   */
  it('returns isMate true when bestMove has a mate value', () => {
    const mateVec = { e2e4: 3, d2d4: 5 }
    const result = computeMateInfo(mateVec, 'e2e4')

    expect(result.isMate).toBe(true)
    expect(result.mateIn).toBe(3)
  })

  /**
   * Test: Bug regression - best move is NOT a mate move
   * When mate_vec has entries but bestMove is not one of them,
   * isMate should be false (not true with undefined mateIn).
   */
  it('returns isMate false when bestMove is not in mate_vec', () => {
    // This is the bug scenario: mate_vec has entries for d2d4, but bestMove is e2e4
    const mateVec = { d2d4: 5, c2c4: 7 }
    const result = computeMateInfo(mateVec, 'e2e4')

    expect(result.isMate).toBe(false)
    expect(result.mateIn).toBeUndefined()
  })

  /**
   * Test: Invariant - isMate true implies mateIn is defined
   * This documents the required invariant that was violated by the bug.
   */
  it('never returns isMate true with undefined mateIn', () => {
    // Test various scenarios with explicit type to avoid TypeScript inference issues
    const testCases: Array<{ mateVec: Record<string, number> | undefined; bestMove: string }> = [
      { mateVec: undefined, bestMove: 'e2e4' },
      { mateVec: {}, bestMove: 'e2e4' },
      { mateVec: { d2d4: 5 }, bestMove: 'e2e4' }, // Bug case
      { mateVec: { e2e4: 3 }, bestMove: 'e2e4' },
    ]

    for (const { mateVec, bestMove } of testCases) {
      const result = computeMateInfo(mateVec, bestMove)

      // If isMate is true, mateIn must be defined
      if (result.isMate) {
        expect(result.mateIn).toBeDefined()
        expect(typeof result.mateIn).toBe('number')
      }
    }
  })
})
