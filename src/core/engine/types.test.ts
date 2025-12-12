/**
 * Unit Tests for Engine Types and Utility Functions
 *
 * Tests the centipawn-to-winrate conversion functions
 * which are critical for Expected Winrate calculations.
 */

import { describe, it, expect } from 'vitest'
import { cpToWinrate, winrateToCp } from './types'

// ============================================================================
// cpToWinrate tests
// ============================================================================

describe('cpToWinrate', () => {
  /**
   * Test: Equal position
   * 0 cp should give ~50% winrate.
   */
  it('returns 0.5 for equal position (0 cp)', () => {
    const winrate = cpToWinrate(0)
    expect(winrate).toBeCloseTo(0.5, 2)
  })

  /**
   * Test: Small White advantage
   * 50 cp (half pawn) should be slightly better than 50%.
   */
  it('returns ~0.57 for small advantage (50 cp)', () => {
    const winrate = cpToWinrate(50)
    expect(winrate).toBeCloseTo(0.57, 1)
  })

  /**
   * Test: One pawn advantage
   * 100 cp should be a noticeable advantage.
   */
  it('returns ~0.64 for one pawn advantage (100 cp)', () => {
    const winrate = cpToWinrate(100)
    expect(winrate).toBeCloseTo(0.64, 1)
  })

  /**
   * Test: Winning advantage
   * 300 cp (3 pawns) should be a winning position.
   */
  it('returns ~0.85 for winning advantage (300 cp)', () => {
    const winrate = cpToWinrate(300)
    expect(winrate).toBeCloseTo(0.85, 1)
  })

  /**
   * Test: Black advantage (negative cp)
   * Negative cp means Black is better.
   */
  it('returns <0.5 for Black advantage (negative cp)', () => {
    const winrate = cpToWinrate(-100)
    expect(winrate).toBeCloseTo(0.36, 1)
    expect(winrate).toBeLessThan(0.5)
  })

  /**
   * Test: Large advantage
   * 500 cp should be nearly won.
   */
  it('returns ~0.95 for large advantage (500 cp)', () => {
    const winrate = cpToWinrate(500)
    expect(winrate).toBeGreaterThan(0.9)
  })

  /**
   * Test: Mate score handling
   * Very large positive cp (mate) should return 1.0.
   */
  it('returns 1.0 for mate score (cp >= 10000)', () => {
    expect(cpToWinrate(10000)).toBe(1.0)
    expect(cpToWinrate(15000)).toBe(1.0)
  })

  /**
   * Test: Being mated
   * Very large negative cp should return 0.0.
   */
  it('returns 0.0 for being mated (cp <= -10000)', () => {
    expect(cpToWinrate(-10000)).toBe(0.0)
    expect(cpToWinrate(-15000)).toBe(0.0)
  })

  /**
   * Test: Symmetry
   * The function should be symmetric around 0.5.
   */
  it('is symmetric around 0.5', () => {
    const positive = cpToWinrate(200)
    const negative = cpToWinrate(-200)

    // positive + negative should equal 1.0
    expect(positive + negative).toBeCloseTo(1.0, 5)
  })
})

// ============================================================================
// winrateToCp tests
// ============================================================================

describe('winrateToCp', () => {
  /**
   * Test: Equal position
   * 50% winrate should give 0 cp.
   */
  it('returns 0 for 50% winrate', () => {
    const cp = winrateToCp(0.5)
    expect(cp).toBeCloseTo(0, 1)
  })

  /**
   * Test: Small advantage
   */
  it('returns positive cp for winrate > 0.5', () => {
    const cp = winrateToCp(0.6)
    expect(cp).toBeGreaterThan(0)
  })

  /**
   * Test: Disadvantage
   */
  it('returns negative cp for winrate < 0.5', () => {
    const cp = winrateToCp(0.4)
    expect(cp).toBeLessThan(0)
  })

  /**
   * Test: Winning position
   */
  it('returns high cp for winning position', () => {
    const cp = winrateToCp(0.9)
    expect(cp).toBeGreaterThan(300)
  })

  /**
   * Test: Near certainty
   * Winrate near 1.0 should give mate-like score.
   */
  it('returns 10000 for winrate >= 0.999', () => {
    expect(winrateToCp(0.999)).toBe(10000)
    expect(winrateToCp(1.0)).toBe(10000)
  })

  /**
   * Test: Near loss
   * Winrate near 0.0 should give negative mate-like score.
   */
  it('returns -10000 for winrate <= 0.001', () => {
    expect(winrateToCp(0.001)).toBe(-10000)
    expect(winrateToCp(0.0)).toBe(-10000)
  })

  /**
   * Test: Round-trip consistency
   * cp → winrate → cp should return roughly the same value.
   */
  it('round-trips with cpToWinrate', () => {
    const originalCp = 150
    const winrate = cpToWinrate(originalCp)
    const backToCp = winrateToCp(winrate)

    expect(backToCp).toBeCloseTo(originalCp, 0)
  })

  /**
   * Test: Multiple round-trips
   */
  it('round-trips are stable', () => {
    const testValues = [-200, -100, 0, 100, 200, 300]

    for (const cp of testValues) {
      const winrate = cpToWinrate(cp)
      const back = winrateToCp(winrate)
      expect(back).toBeCloseTo(cp, 0)
    }
  })
})
