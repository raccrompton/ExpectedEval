/**
 * useExpectedWinrate Hook
 *
 * React hook for Expected Winrate calculation with manual trigger.
 *
 * The hook provides a calculate() function to trigger EW calculation using Maia.
 * Stockfish enrichment is available but hidden by default.
 *
 * Flow:
 * 1. User clicks "Analyze Position" → calculate()
 * 2. Status: idle → calculating_maia → complete_maia
 * 3. (Hidden) User clicks "Add SF Analysis" → enrichWithSF()
 * 4. Status: complete_maia → enriching_sf → complete
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useEngines } from '@/contexts'
import {
  calculateMaiaOnlyEW,
  enrichWithStockfish,
  clearPredictionCache,
  type EWResult,
  type EWConfig,
  type OnEWProgress,
  type EWProgressCallback,
  DEFAULT_EW_CONFIG,
} from '@/core/analysis'

/**
 * EW calculation status states.
 *
 * - idle: No calculation running, no results
 * - calculating_maia: Maia-only calculation in progress
 * - complete_maia: Maia calculation complete, SF not yet run
 * - enriching_sf: Adding Stockfish evaluations
 * - complete: Full calculation with SF complete
 * - error: Calculation failed
 */
export type EWStatus =
  | 'idle'
  | 'calculating_maia'
  | 'complete_maia'
  | 'enriching_sf'
  | 'complete'
  | 'error'

export interface UseExpectedWinrateReturn {
  /** Current EW result (null if not calculated) */
  result: EWResult | null
  /** Current calculation status */
  status: EWStatus
  /** Progress info during calculation */
  progress: EWProgressCallback | null
  /** Error if calculation failed */
  error: Error | null
  /** Current algorithm configuration */
  config: EWConfig
  /** Trigger Maia-only EW calculation */
  calculate: () => Promise<void>
  /** Trigger SF enrichment (available when status is 'complete_maia') */
  enrichWithSF: () => Promise<void>
  /** Update algorithm configuration */
  updateConfig: (_partial: Partial<EWConfig>) => void
  /** Reset to idle state */
  reset: () => void
  /** Whether SF results are available */
  hasSFResults: boolean
  /** Whether SF enrichment can be triggered */
  canEnrichSF: boolean
  /** Whether Maia calculation can be triggered */
  canCalculate: boolean
}

/**
 * Hook for Expected Winrate analysis with manual trigger.
 *
 * Provides calculate() to trigger EW calculation using Maia.
 * Provides enrichWithSF() for on-demand Stockfish analysis (hidden by default).
 *
 * @param currentFen - Current position FEN to analyze
 * @param initialConfig - Optional initial configuration override
 * @returns Hook state and actions
 *
 * @example
 * function EWPanel({ fen }: { fen: string }) {
 *   const { result, status, progress, calculate, canCalculate } = useExpectedWinrate(fen)
 *
 *   if (status === 'calculating_maia') {
 *     return <div>Analyzing... {progress?.message}</div>
 *   }
 *
 *   return (
 *     <div>
 *       {canCalculate && (
 *         <button onClick={calculate}>Analyze Position</button>
 *       )}
 *       {result && <EWResults result={result} />}
 *     </div>
 *   )
 * }
 */
export function useExpectedWinrate(
  currentFen: string,
  initialConfig?: Partial<EWConfig>
): UseExpectedWinrateReturn {
  const { stockfish, maia, isInitialized, isMaiaEvaluating } = useEngines()

  const [result, setResult] = useState<EWResult | null>(null)
  const [status, setStatus] = useState<EWStatus>('idle')
  const [progress, setProgress] = useState<EWProgressCallback | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [config, setConfig] = useState<EWConfig>({
    ...DEFAULT_EW_CONFIG,
    ...initialConfig,
  })

  // Track the FEN we're currently calculating for
  const currentFenRef = useRef<string | null>(null)

  // Derived state helpers
  const hasSFResults = result?.baseSFWinrate !== null && result?.baseSFWinrate !== undefined
  const canEnrichSF = status === 'complete_maia' && !hasSFResults
  const isCalculating = status === 'calculating_maia' || status === 'enriching_sf'
  const canCalculate = !!(maia && isInitialized && !isCalculating && !isMaiaEvaluating)

  /**
   * Run Maia-only EW calculation.
   * Called manually when user clicks "Analyze Position".
   */
  const calculateMaia = useCallback(
    async (fen: string) => {
      if (!maia || !isInitialized) {
        return
      }

      currentFenRef.current = fen
      setStatus('calculating_maia')
      setError(null)
      setProgress(null)
      setResult(null)

      const onProgress: OnEWProgress = (progressUpdate) => {
        if (currentFenRef.current === fen) {
          setProgress(progressUpdate)
        }
      }

      try {
        const ewResult = await calculateMaiaOnlyEW(fen, config, maia, onProgress)

        // Check if position changed during calculation
        if (currentFenRef.current !== fen) {
          return
        }

        setResult(ewResult)
        setStatus('complete_maia')
      } catch (err) {
        if (currentFenRef.current !== fen) {
          return
        }

        const calcError = err instanceof Error ? err : new Error(String(err))
        setError(calcError)
        setStatus('error')
        console.error('Maia EW calculation failed:', calcError)
      }
    },
    [maia, isInitialized, config]
  )

  /**
   * Enrich existing result with Stockfish evaluations.
   * User-triggered action (not automatic).
   */
  const enrichWithSF = useCallback(async () => {
    if (!stockfish || !result || status !== 'complete_maia') {
      return
    }

    const fen = result.fen
    setStatus('enriching_sf')
    setProgress(null)

    const onProgress: OnEWProgress = (progressUpdate) => {
      if (currentFenRef.current === fen) {
        setProgress(progressUpdate)
      }
    }

    try {
      const enrichedResult = await enrichWithStockfish(result, stockfish, config, onProgress)

      // Check if position changed during enrichment
      if (currentFenRef.current !== fen) {
        return
      }

      setResult(enrichedResult)
      setStatus('complete')
    } catch (err) {
      if (currentFenRef.current !== fen) {
        return
      }

      const enrichError = err instanceof Error ? err : new Error(String(err))
      setError(enrichError)
      setStatus('error')
      console.error('SF enrichment failed:', enrichError)
    }
  }, [stockfish, result, status, config])

  /**
   * Public API: Trigger Maia-only EW calculation.
   * Call this when user clicks "Analyze Position".
   */
  const calculate = useCallback(async () => {
    await calculateMaia(currentFen)
  }, [calculateMaia, currentFen])

  // Reset state when position changes (clear stale data).
  // Crucially, we also invalidate currentFenRef when a calculation is
  // in-flight for a different FEN — even if no result has landed yet.
  // Without this, an in-flight first-calculation passes its
  // `currentFenRef.current === fen` guard and writes a result for the
  // previous board into UI state.
  useEffect(() => {
    const inFlightFen = currentFenRef.current
    const resultIsStale = result && result.fen !== currentFen
    const calcIsStale = inFlightFen !== null && inFlightFen !== currentFen

    if (calcIsStale) {
      currentFenRef.current = null
    }
    if (resultIsStale || calcIsStale) {
      setResult(null)
      setStatus('idle')
      setProgress(null)
      setError(null)
    }
  }, [currentFen, result])

  const updateConfig = useCallback((partial: Partial<EWConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }))
  }, [])

  // Clear prediction cache when maiaLevel changes (cached predictions are ELO-dependent)
  useEffect(() => {
    clearPredictionCache()
  }, [config.maiaLevel])

  const reset = useCallback(() => {
    currentFenRef.current = null
    setResult(null)
    setStatus('idle')
    setProgress(null)
    setError(null)
    // Clear prediction cache to free memory
    clearPredictionCache()
  }, [])

  return {
    result,
    status,
    progress,
    error,
    config,
    calculate,
    enrichWithSF,
    updateConfig,
    reset,
    hasSFResults,
    canEnrichSF,
    canCalculate,
  }
}
