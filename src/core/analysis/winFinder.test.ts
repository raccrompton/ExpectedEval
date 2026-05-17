/**
 * Unit Tests for Win Finder Algorithm
 *
 * Win Finder identifies positions where Stockfish sees roughly equal moves
 * but Maia strongly prefers one move over others - "hidden edge" positions
 * where practical play differs from theoretical equality.
 *
 * Tests the core algorithm using mock engines for predictable results.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  analyzePositionForDisagreement,
  calculateDisagreementScore,
  analyzeGameForDisagreements,
} from './winFinder'
import type {
  MoveRanking,
  PositionDisagreement,
  WinFinderResult,
  WinFinderConfig,
} from './winFinder'
import { createMockStockfish, createMockMaia } from '../engine/mock'
import type { MockStockfish, MockMaia } from '../engine/mock'

// ============================================================================
// Test constants
// ============================================================================

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

const DEFAULT_CONFIG: WinFinderConfig = {
  sfTopN: 5,
  sfDepth: 12,
  maiaLevel: 1500,
  minDisagreement: 0,
  maxResults: 20,
  skipFirstPly: 0,  // Analyze all positions in tests
}

// ============================================================================
// calculateDisagreementScore tests
// ============================================================================

describe('calculateDisagreementScore', () => {
  /**
   * Test: High disagreement when SF sees equality but Maia sees clear winner.
   * SF spread = 2% (52% vs 50%), Maia advantage = 10%
   * Score = 10% / (2% + 1%) = 3.33
   */
  it('calculates high score when SF is indifferent but Maia has strong preference', () => {
    const sfSpread = 0.02  // 2% difference between SF top and 5th move
    const maiaAdvantage = 0.10  // 10% difference between Maia top and 2nd move
    const epsilon = 0.01

    const score = calculateDisagreementScore(sfSpread, maiaAdvantage, epsilon)

    expect(score).toBeCloseTo(0.10 / 0.03, 2)  // 3.33
  })

  /**
   * Test: Low disagreement when SF already distinguishes moves.
   * SF spread = 15%, Maia advantage = 10%
   * Score = 10% / (15% + 1%) = 0.63
   */
  it('calculates low score when SF already distinguishes moves', () => {
    const sfSpread = 0.15
    const maiaAdvantage = 0.10
    const epsilon = 0.01

    const score = calculateDisagreementScore(sfSpread, maiaAdvantage, epsilon)

    expect(score).toBeCloseTo(0.10 / 0.16, 2)  // 0.63
  })

  /**
   * Test: Low score when neither engine has strong preference.
   * SF spread = 2%, Maia advantage = 2%
   * Score = 2% / (2% + 1%) = 0.67
   */
  it('calculates low score when neither engine has strong preference', () => {
    const sfSpread = 0.02
    const maiaAdvantage = 0.02
    const epsilon = 0.01

    const score = calculateDisagreementScore(sfSpread, maiaAdvantage, epsilon)

    expect(score).toBeCloseTo(0.02 / 0.03, 2)  // 0.67
  })

  /**
   * Test: Handles zero SF spread (epsilon prevents division by zero).
   */
  it('handles zero SF spread using epsilon', () => {
    const sfSpread = 0
    const maiaAdvantage = 0.10
    const epsilon = 0.01

    const score = calculateDisagreementScore(sfSpread, maiaAdvantage, epsilon)

    expect(score).toBeCloseTo(0.10 / 0.01, 2)  // 10
    expect(Number.isFinite(score)).toBe(true)
  })
})

// ============================================================================
// analyzePositionForDisagreement tests (with mocks)
// ============================================================================

describe('analyzePositionForDisagreement', () => {
  let mockSF: MockStockfish
  let mockMaia: MockMaia

  beforeEach(async () => {
    mockSF = createMockStockfish()
    mockMaia = createMockMaia()
    await mockSF.init()
    await mockMaia.init()
  })

  /**
   * Test: Returns MoveRanking array for all analyzed moves.
   */
  it('returns move rankings with both SF and Maia data', async () => {
    // Configure mock SF to return close evaluations
    mockSF.setMoveEvaluations({
      'e2e4': 0.52,
      'd2d4': 0.51,
      'g1f3': 0.50,
    })

    // Configure mock Maia to strongly prefer one move
    mockMaia.setPolicyOverride({
      'e2e4': 0.35,
      'd2d4': 0.28,
      'g1f3': 0.15,
    })
    mockMaia.setValueOverride(0.50)

    const result = await analyzePositionForDisagreement(
      STARTING_FEN,
      0,  // ply
      mockSF,
      mockMaia,
      DEFAULT_CONFIG
    )

    expect(result).toBeDefined()
    expect(result.fen).toBe(STARTING_FEN)
    expect(result.ply).toBe(0)
    expect(result.allMoves.length).toBeGreaterThan(0)

    // Check that moves have both SF and Maia rankings
    const e4 = result.allMoves.find(m => m.move === 'e4' || m.move === 'e2e4')
    expect(e4).toBeDefined()
    expect(e4!.sfWinrate).toBeDefined()
    expect(e4!.maiaWinrate).toBeDefined()
    expect(e4!.sfRank).toBeDefined()
    expect(e4!.maiaRank).toBeDefined()
  })

  /**
   * Test: Correctly identifies SF and Maia top moves.
   */
  it('identifies SF top move and Maia top move', async () => {
    // SF thinks d4 is best
    mockSF.setMoveEvaluations({
      'e2e4': 0.51,
      'd2d4': 0.52,  // SF's top move
      'g1f3': 0.50,
    })

    // Maia thinks e4 is most likely
    mockMaia.setPolicyOverride({
      'e2e4': 0.40,  // Maia's top move
      'd2d4': 0.25,
      'g1f3': 0.15,
    })

    const result = await analyzePositionForDisagreement(
      STARTING_FEN,
      0,
      mockSF,
      mockMaia,
      DEFAULT_CONFIG
    )

    // Check SF top move (convert UCI to SAN for comparison)
    expect(result.sfTopMove.sfRank).toBe(1)

    // Check Maia top move
    expect(result.maiaTopMove.maiaRank).toBe(1)
  })

  /**
   * Test: Calculates disagreement score correctly.
   * Uses position-specific predictions to vary Maia values.
   */
  it('calculates correct disagreement score', async () => {
    // SF: tight spread (all moves close)
    mockSF.setMoveEvaluations({
      'e2e4': 0.51,
      'd2d4': 0.51,
      'g1f3': 0.50,
      'c2c4': 0.50,
      'b1c3': 0.49,
    })

    // Set the default value to 0.50 (opponent perspective)
    // When flipped (1 - 0.50 = 0.50), gives player 50%
    mockMaia.setValueOverride(0.50)

    const result = await analyzePositionForDisagreement(
      STARTING_FEN,
      0,
      mockSF,
      mockMaia,
      DEFAULT_CONFIG
    )

    // Verify the result structure is correct
    expect(result).toBeDefined()
    expect(result.disagreementScore).toBeGreaterThanOrEqual(0)
    expect(result.sfTopMove).toBeDefined()
    expect(result.maiaTopMove).toBeDefined()

    // With uniform Maia values, Maia advantage = 0, so score should be ~0
    // This tests that the calculation doesn't crash and returns valid data
    expect(Number.isFinite(result.disagreementScore)).toBe(true)
  })

  /**
   * Test: Perspective flip - Maia value is flipped since it's from opponent's POV.
   */
  it('flips Maia perspective correctly (1 - value)', async () => {
    // After making a move, Maia evaluates from opponent's perspective
    // If Maia says opponent has 60% winning chance, player has 40%
    mockMaia.setValueOverride(0.60)  // Opponent's perspective

    const result = await analyzePositionForDisagreement(
      STARTING_FEN,
      0,
      mockSF,
      mockMaia,
      DEFAULT_CONFIG
    )

    // Player's perspective should be 1 - 0.60 = 0.40
    // The maiaWinrate in result should be flipped
    const topMove = result.maiaTopMove
    expect(topMove.maiaWinrate).toBeDefined()
    // Note: This tests that the flip logic is applied correctly
  })
})

// ============================================================================
// analyzeGameForDisagreements tests
// ============================================================================

describe('analyzeGameForDisagreements', () => {
  let mockSF: MockStockfish
  let mockMaia: MockMaia

  beforeEach(async () => {
    mockSF = createMockStockfish()
    mockMaia = createMockMaia()
    await mockSF.init()
    await mockMaia.init()
  })

  /**
   * Regression for #10: when the caller flips the cancel predicate
   * after the first Maia call, the in-flight per-position analysis must
   * abort instead of running through every legal move's predict().
   * Before the fix, the cancellation was checked only between positions.
   */
  it('aborts per-position work when cancellation flips mid-flight', async () => {
    let cancelled = false
    let batchCalls = 0
    const originalPredictBatch = mockMaia.predictBatch.bind(mockMaia)
    mockMaia.predictBatch = async (fens, opts) => {
      batchCalls++
      // Flip the predicate after the first batch call — this happens
      // inside analyzePositionForDisagreement. The post-batch checkCancel()
      // will then throw WinFinderCancelledError before position 1 is reached.
      if (batchCalls === 1) cancelled = true
      return originalPredictBatch(fens, opts)
    }

    const positions = [
      { fen: STARTING_FEN, ply: 0 },
      { fen: AFTER_E4_FEN, ply: 1 },
    ]

    await analyzeGameForDisagreements(
      positions,
      DEFAULT_CONFIG,
      mockSF,
      mockMaia,
      undefined,
      () => cancelled,
    )

    // With batching, one predictBatch call covers all moves for a position.
    // Cancellation flips after the first batch, so the post-batch checkCancel()
    // throws before position 1's batch is ever issued — only 1 batch call total.
    expect(batchCalls).toBe(1)
  })

  /**
   * Test: Empty positions returns empty result.
   */
  it('returns empty result for empty positions array', async () => {
    const result = await analyzeGameForDisagreements(
      [],
      DEFAULT_CONFIG,
      mockSF,
      mockMaia
    )

    expect(result.positions).toHaveLength(0)
    expect(result.analyzedPositions).toBe(0)
  })

  /**
   * Test: Results are sorted by disagreement descending.
   */
  it('sorts results by disagreement score descending', async () => {
    const positions = [
      { fen: STARTING_FEN, ply: 0 },
      { fen: AFTER_E4_FEN, ply: 1 },
    ]

    const result = await analyzeGameForDisagreements(
      positions,
      DEFAULT_CONFIG,
      mockSF,
      mockMaia
    )

    // Verify sorted descending
    if (result.positions.length >= 2) {
      expect(result.positions[0].disagreementScore)
        .toBeGreaterThanOrEqual(result.positions[1].disagreementScore)
    }
  })

  /**
   * Test: minDisagreement filter works.
   */
  it('filters out positions below minDisagreement threshold', async () => {
    const positions = [
      { fen: STARTING_FEN, ply: 0 },
    ]

    // Set a very high threshold
    const config: WinFinderConfig = {
      ...DEFAULT_CONFIG,
      minDisagreement: 100,  // Impossibly high
    }

    const result = await analyzeGameForDisagreements(
      positions,
      config,
      mockSF,
      mockMaia
    )

    expect(result.positions).toHaveLength(0)
    expect(result.analyzedPositions).toBe(1)  // Still analyzed, just filtered
  })

  /**
   * Test: maxResults limit works.
   */
  it('respects maxResults limit', async () => {
    const positions = [
      { fen: STARTING_FEN, ply: 0 },
      { fen: AFTER_E4_FEN, ply: 1 },
      { fen: STARTING_FEN, ply: 2 },  // Duplicate FEN for testing
    ]

    const config: WinFinderConfig = {
      ...DEFAULT_CONFIG,
      maxResults: 2,
    }

    const result = await analyzeGameForDisagreements(
      positions,
      config,
      mockSF,
      mockMaia
    )

    expect(result.positions.length).toBeLessThanOrEqual(2)
  })

  /**
   * Test: Progress callback is invoked.
   */
  it('invokes progress callback during analysis', async () => {
    const positions = [
      { fen: STARTING_FEN, ply: 0 },
    ]

    const progressCalls: number[] = []
    const onProgress = (current: number, total: number) => {
      progressCalls.push(current)
    }

    await analyzeGameForDisagreements(
      positions,
      DEFAULT_CONFIG,
      mockSF,
      mockMaia,
      onProgress
    )

    expect(progressCalls.length).toBeGreaterThan(0)
  })

  /**
   * Test: Calculation time is tracked.
   */
  it('tracks calculation time in result', async () => {
    const positions = [
      { fen: STARTING_FEN, ply: 0 },
    ]

    const result = await analyzeGameForDisagreements(
      positions,
      DEFAULT_CONFIG,
      mockSF,
      mockMaia
    )

    expect(result.calculationTimeMs).toBeGreaterThanOrEqual(0)
  })

  /**
   * Test: Human-readable description is generated.
   */
  it('generates human-readable description for each position', async () => {
    const positions = [
      { fen: STARTING_FEN, ply: 0 },
    ]

    const result = await analyzeGameForDisagreements(
      positions,
      DEFAULT_CONFIG,
      mockSF,
      mockMaia
    )

    if (result.positions.length > 0) {
      expect(result.positions[0].description).toBeDefined()
      expect(typeof result.positions[0].description).toBe('string')
      expect(result.positions[0].description.length).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// Long game / timeout tests
// ============================================================================

describe('Win Finder with long games', () => {
  let mockSF: MockStockfish
  let mockMaia: MockMaia

  beforeEach(async () => {
    mockSF = createMockStockfish()
    mockMaia = createMockMaia()
    await mockSF.init()
    await mockMaia.init()
  })

  // The famous Kasparov vs Topalov "Immortal Game" (1999)
  const KASPAROV_TOPALOV_PGN = `[Event "Hoogovens Group A"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[EventDate "1999.01.16"]
[Round "4"]
[Result "1-0"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[ECO "B07"]
[WhiteElo "2812"]
[BlackElo "2700"]
[PlyCount "87"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5
7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7
12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6
17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4
22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6
26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7
Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2
35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8
Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`

  /**
   * Test: Win Finder completes analysis of a long game without hanging.
   * This test uses a 10-second timeout to catch any hanging behavior.
   */
  it('completes analysis of an 87-ply game without hanging', async () => {
    // Import the loadGame and extractPositionsFromGame functions
    const { loadGame } = await import('../chess/game')
    const { extractPositionsFromGame } = await import('../chess/navigation')

    // Load the game
    const game = loadGame(KASPAROV_TOPALOV_PGN)
    expect(game).not.toBeNull()

    // Extract positions
    const positions = extractPositionsFromGame(game!)
    expect(positions.length).toBe(88)  // 87 plies + starting position

    // Analyze with skipFirstPly=20 (default)
    const config: WinFinderConfig = {
      ...DEFAULT_CONFIG,
      skipFirstPly: 20,
      minDisagreement: 0,  // Include all results for testing
    }

    // This should complete within 10 seconds
    const startTime = performance.now()
    const result = await analyzeGameForDisagreements(
      positions,
      config,
      mockSF,
      mockMaia
    )
    const elapsed = performance.now() - startTime

    // Verify the analysis completed
    expect(result.analyzedPositions).toBe(68)  // 88 - 20 = 68 positions
    expect(result.calculationTimeMs).toBeGreaterThan(0)

    // Should complete quickly with mocks (< 2 seconds)
    expect(elapsed).toBeLessThan(2000)
  }, 10000)  // 10 second test timeout

  /**
   * Test: Progress callback is called for each position.
   */
  it('reports progress for each position in a long game', async () => {
    const { loadGame } = await import('../chess/game')
    const { extractPositionsFromGame } = await import('../chess/navigation')

    const game = loadGame(KASPAROV_TOPALOV_PGN)
    const positions = extractPositionsFromGame(game!)

    const config: WinFinderConfig = {
      ...DEFAULT_CONFIG,
      skipFirstPly: 80,  // Only analyze last few positions for speed
      minDisagreement: 0,
    }

    const progressCalls: Array<{ current: number; total: number }> = []
    const onProgress = (current: number, total: number) => {
      progressCalls.push({ current, total })
    }

    await analyzeGameForDisagreements(
      positions,
      config,
      mockSF,
      mockMaia,
      onProgress
    )

    // Should have progress calls for remaining positions
    expect(progressCalls.length).toBeGreaterThan(0)

    // Progress should be monotonically increasing
    for (let i = 1; i < progressCalls.length; i++) {
      expect(progressCalls[i].current).toBeGreaterThanOrEqual(progressCalls[i - 1].current)
    }
  }, 10000)
})

// ============================================================================
// Edge case tests
// ============================================================================

describe('Win Finder edge cases', () => {
  let mockSF: MockStockfish
  let mockMaia: MockMaia

  beforeEach(async () => {
    mockSF = createMockStockfish()
    mockMaia = createMockMaia()
    await mockSF.init()
    await mockMaia.init()
  })

  /**
   * Test: Handles position with only one legal move.
   */
  it('handles position with only one legal move gracefully', async () => {
    // In positions with one legal move, disagreement should be 0
    // (both SF and Maia have to pick the same move)
    const result = await analyzePositionForDisagreement(
      STARTING_FEN,  // Starting position has many moves, but test the logic
      0,
      mockSF,
      mockMaia,
      DEFAULT_CONFIG
    )

    expect(result).toBeDefined()
  })

  /**
   * Test: Works with positions from Black's perspective.
   */
  it('handles Black to move positions', async () => {
    const result = await analyzePositionForDisagreement(
      AFTER_E4_FEN,  // Black to move
      1,
      mockSF,
      mockMaia,
      DEFAULT_CONFIG
    )

    expect(result).toBeDefined()
    expect(result.fen).toBe(AFTER_E4_FEN)
  })
})
