/**
 * Regression tests for useExpectedWinrate hook.
 *
 * Primarily covers the stale-FEN guard: a position change during the very
 * first calculation must not allow the in-flight result to be written to
 * UI state for the previous board.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock the engines context: provide a Maia stub so calculate() proceeds,
// stockfish=null so SF enrichment is unreachable for this test.
vi.mock('@/contexts', () => ({
  useEngines: () => ({
    stockfish: null,
    maia: { predict: vi.fn() },
    isInitialized: true,
    isMaiaEvaluating: false,
  }),
}))

// Mock the EW core: calculateMaiaOnlyEW returns a promise we control so we
// can interleave a position change before it resolves.
let resolveCalc: ((value: unknown) => void) | null = null
const mockCalcResult = {
  fen: 'STALE_FEN',
  baseSFWinrate: null,
  baseMaiaWinrate: 0.5,
  ewSF: null,
  ewMaia: 0.5,
  candidates: [],
}

vi.mock('@/core/analysis', async () => {
  const actual = await vi.importActual<typeof import('@/core/analysis')>(
    '@/core/analysis',
  )
  return {
    ...actual,
    calculateMaiaOnlyEW: vi.fn(() =>
      new Promise((resolve) => {
        resolveCalc = resolve
      }),
    ),
    enrichWithStockfish: vi.fn(),
    clearPredictionCache: vi.fn(),
  }
})

import { useExpectedWinrate } from './useExpectedWinrate'

describe('useExpectedWinrate — stale-FEN guard', () => {
  beforeEach(() => {
    resolveCalc = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('discards first-calc result when position changes mid-flight', async () => {
    const STALE = 'STALE_FEN'
    const FRESH = 'FRESH_FEN'

    // Track every status the hook reports so we can prove the stale
    // 'complete_maia' state is never observed.
    const statusObserved: string[] = []

    const { result, rerender } = renderHook(
      ({ fen }: { fen: string }) => {
        const r = useExpectedWinrate(fen)
        statusObserved.push(r.status)
        return r
      },
      { initialProps: { fen: STALE } },
    )

    // Kick off the first calculation while currentFen=STALE.
    await act(async () => {
      void result.current.calculate()
    })
    expect(result.current.status).toBe('calculating_maia')

    // Position changes BEFORE the calculation resolves (no prior result
    // exists — this is the bug scenario).
    await act(async () => {
      rerender({ fen: FRESH })
    })

    // Now resolve the calculation; the stale result must NOT be committed.
    await act(async () => {
      resolveCalc?.(mockCalcResult)
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.result).toBeNull()
    })

    // Without the fix, the in-flight calc passes its FEN guard and the
    // hook briefly transitions to 'complete_maia' before the reset effect
    // clears it on the next render. With the fix, currentFenRef is
    // already null when the calc resolves so the transition is skipped.
    expect(statusObserved).not.toContain('complete_maia')
  })
})
