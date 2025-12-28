/**
 * useExpectedWinrate Hook
 *
 * React hook for Expected Winrate calculation with auto-trigger on position change.
 *
 * The hook automatically calculates EW using Maia (fast ~5ms/call) when the position
 * changes, with optional Stockfish enrichment on demand (slow ~50-100ms/call).
 *
 * Flow:
 * 1. Position changes → auto-trigger Maia-only calculation (300ms debounce)
 * 2. Status: idle → calculating_maia → complete_maia
 * 3. User clicks "Add SF Analysis" → enrichWithSF()
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
  /** Trigger SF enrichment (available when status is 'complete_maia') */
  enrichWithSF: () => Promise<void>
  /** Update algorithm configuration */
  updateConfig: (partial: Partial<EWConfig>) => void
  /** Reset to idle state */
  reset: () => void
  /** Whether SF results are available */
  hasSFResults: boolean
  /** Whether SF enrichment can be triggered */
  canEnrichSF: boolean
}

/** Debounce delay for auto-calculation (ms) */
const DEBOUNCE_DELAY = 300

/**
 * Hook for Expected Winrate analysis with auto-trigger.
 *
 * Automatically calculates EW using Maia when the position changes.
 * Provides enrichWithSF() for on-demand Stockfish analysis.
 *
 * @param currentFen - Current position FEN (triggers auto-calculation on change)
 * @param initialConfig - Optional initial configuration override
 * @returns Hook state and actions
 *
 * @example
 * function EWPanel({ fen }: { fen: string }) {
 *   const { result, status, progress, enrichWithSF, canEnrichSF } = useExpectedWinrate(fen)
 *
 *   if (status === 'calculating_maia') {
 *     return <div>Analyzing... {progress?.message}</div>
 *   }
 *
 *   return (
 *     <div>
 *       <EWResults result={result} />
 *       {canEnrichSF && (
 *         <button onClick={enrichWithSF}>Add Stockfish Analysis</button>
 *       )}
 *     </div>
 *   )
 * }
 */
export function useExpectedWinrate(
  currentFen: string,
  initialConfig?: Partial<EWConfig>
): UseExpectedWinrateReturn {
  const { stockfish, maia, isInitialized, isMaiaEvaluating, isStockfishEvaluating } = useEngines()

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
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Derived state helpers
  const hasSFResults = result?.baseSFWinrate !== null && result?.baseSFWinrate !== undefined
  const canEnrichSF = status === 'complete_maia' && !hasSFResults

  /**
   * Run Maia-only EW calculation.
   * Called automatically when position changes (with debounce).
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
   * Auto-trigger Maia calculation when position changes.
   * Uses debounce to avoid rapid recalculation during navigation.
   * Waits for panel evaluation to complete before starting EW calculation.
   */
  useEffect(() => {
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Don't auto-calculate if Maia isn't ready
    if (!maia || !isInitialized) {
      return
    }

    // Wait for panel evaluation to complete (avoid concurrent Maia usage)
    if (isMaiaEvaluating || isStockfishEvaluating) {
      return
    }

    // Skip if we already have a result for this FEN (or are calculating it)
    if (currentFenRef.current === currentFen) {
      return
    }

    // Debounce the calculation
    debounceTimerRef.current = setTimeout(() => {
      calculateMaia(currentFen)
    }, DEBOUNCE_DELAY)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [currentFen, maia, isInitialized, calculateMaia, isMaiaEvaluating, isStockfishEvaluating])

  const updateConfig = useCallback((partial: Partial<EWConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }))
  }, [])

  // Clear prediction cache when maiaLevel changes (cached predictions are ELO-dependent)
  useEffect(() => {
    clearPredictionCache()
  }, [config.maiaLevel])

  const reset = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
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
    enrichWithSF,
    updateConfig,
    reset,
    hasSFResults,
    canEnrichSF,
  }
}
