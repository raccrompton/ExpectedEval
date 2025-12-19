/**
 * useExpectedWinrate Hook - React State Management for EW Calculations
 *
 * This hook provides React state management for Expected Winrate calculations.
 * It wraps the core/analysis functions and integrates with EngineContext
 * to provide a simple API for calculating and displaying EW analysis.
 *
 * Features:
 * - Calculate Expected Winrate for any position
 * - Track calculation progress with detailed phase information
 * - Get real-time Stockfish and Maia baseline evaluations
 * - Store calculation results for display
 *
 * Architecture:
 * - Uses EngineContext to access Stockfish and Maia engines
 * - All analysis logic lives in core/analysis (pure, testable)
 * - This hook manages React state and coordinates engines
 *
 * @example
 * ```tsx
 * function AnalysisPanel() {
 *   const { result, isCalculating, progress, calculate } = useExpectedWinrate()
 *
 *   return (
 *     <div>
 *       <button onClick={() => calculate(currentFen)} disabled={isCalculating}>
 *         Calculate Expected Winrate
 *       </button>
 *       {isCalculating && <ProgressBar value={progress.progress} />}
 *       {result && <EWTree result={result} />}
 *     </div>
 *   )
 * }
 * ```
 *
 * Dependencies:
 * - React: useState, useCallback, useRef
 * - @/core/analysis: Expected Winrate calculation functions
 * - @/contexts: Engine context for engine access
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import {
  calculateExpectedWinrate,
  DEFAULT_EW_CONFIG,
  type EWResult,
  type EWConfig,
  type EWProgressCallback,
} from '@/core/analysis'
import { useEngine } from '@/contexts'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Progress state for EW calculation.
 */
export interface EWProgressState {
  /**
   * Current calculation phase.
   */
  phase: EWProgressCallback['phase'] | 'idle'

  /**
   * Progress within current phase (0-100).
   */
  progress: number

  /**
   * Human-readable message about current activity.
   */
  message: string

  /**
   * Number of candidate moves being analyzed.
   */
  candidateCount?: number

  /**
   * Current candidate move being processed.
   */
  currentCandidate?: string

  /**
   * Number of positions to evaluate with Stockfish.
   */
  positionsToEvaluate?: number
}

/**
 * Return type of the useExpectedWinrate hook.
 */
export interface UseExpectedWinrateReturn {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /**
   * The result of the last EW calculation.
   * Null if no calculation has been performed.
   */
  result: EWResult | null

  /**
   * Whether a calculation is currently in progress.
   */
  isCalculating: boolean

  /**
   * Detailed progress information for the current calculation.
   */
  progress: EWProgressState

  /**
   * Error from the last calculation, if any.
   */
  error: string | null

  /**
   * FEN that was used for the last calculation.
   * Useful for checking if result matches current position.
   */
  calculatedFen: string | null

  // ---------------------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------------------

  /**
   * Calculate Expected Winrate for a position.
   *
   * @param fen - Position to analyze
   * @param config - Optional configuration overrides
   * @returns true if calculation started, false if engines not ready
   */
  calculate: (fen: string, config?: Partial<EWConfig>) => Promise<boolean>

  /**
   * Cancel an ongoing calculation.
   */
  cancel: () => void

  /**
   * Clear the current result and error state.
   */
  clear: () => void
}

// ============================================================================
// INITIAL STATE
// ============================================================================

/**
 * Initial progress state when idle.
 */
const INITIAL_PROGRESS: EWProgressState = {
  phase: 'idle',
  progress: 0,
  message: '',
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * React hook for Expected Winrate calculations.
 *
 * Provides calculation functions and result state management.
 * Requires being wrapped in EngineProvider for engine access.
 *
 * @returns EW calculation state and actions
 */
export function useExpectedWinrate(): UseExpectedWinrateReturn {
  // ---------------------------------------------------------------------------
  // ENGINE CONTEXT
  // ---------------------------------------------------------------------------

  /**
   * Get engine instances from context.
   */
  const { stockfish, maia, status } = useEngine()

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /**
   * The result of the last calculation.
   */
  const [result, setResult] = useState<EWResult | null>(null)

  /**
   * Whether a calculation is in progress.
   */
  const [isCalculating, setIsCalculating] = useState(false)

  /**
   * Progress information for current calculation.
   */
  const [progress, setProgress] = useState<EWProgressState>(INITIAL_PROGRESS)

  /**
   * Error from the last calculation.
   */
  const [error, setError] = useState<string | null>(null)

  /**
   * FEN used for the last calculation.
   */
  const [calculatedFen, setCalculatedFen] = useState<string | null>(null)

  /**
   * Ref to track if calculation was cancelled.
   * Using a ref so we can check it inside async functions.
   */
  const cancelledRef = useRef(false)

  // ---------------------------------------------------------------------------
  // PROGRESS CALLBACK
  // ---------------------------------------------------------------------------

  /**
   * Handle progress updates from the calculation.
   */
  const handleProgress = useCallback((progressInfo: EWProgressCallback) => {
    // Check if cancelled
    if (cancelledRef.current) return

    // Update progress state
    setProgress({
      phase: progressInfo.phase,
      progress: progressInfo.progress,
      message: progressInfo.message,
      candidateCount: progressInfo.candidateCount,
      currentCandidate: progressInfo.currentCandidate,
      positionsToEvaluate: progressInfo.positionsToEvaluate,
    })
  }, [])

  // ---------------------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------------------

  /**
   * Calculate Expected Winrate for a position.
   */
  const calculate = useCallback(
    async (fen: string, config?: Partial<EWConfig>): Promise<boolean> => {
      // Check if engines are ready
      if (
        !stockfish ||
        !maia ||
        status.stockfish !== 'ready' ||
        status.maia !== 'ready'
      ) {
        setError('Engines are not ready. Please wait for initialization.')
        return false
      }

      // Check if already calculating
      if (isCalculating) {
        setError('A calculation is already in progress.')
        return false
      }

      // Reset state for new calculation
      cancelledRef.current = false
      setIsCalculating(true)
      setError(null)
      setProgress({
        phase: 'filtering',
        progress: 0,
        message: 'Starting calculation...',
      })

      try {
        // Merge config with defaults
        const finalConfig: EWConfig = {
          ...DEFAULT_EW_CONFIG,
          ...config,
        }

        // Run the calculation
        // The core function takes engine adapters directly
        const ewResult = await calculateExpectedWinrate(
          fen,
          finalConfig,
          stockfish,
          maia,
          handleProgress
        )

        // Check if cancelled during calculation
        if (cancelledRef.current) {
          return false
        }

        // Store result
        setResult(ewResult)
        setCalculatedFen(fen)
        setProgress({
          phase: 'idle',
          progress: 100,
          message: 'Calculation complete',
        })

        return true
      } catch (e) {
        // Handle calculation error
        if (!cancelledRef.current) {
          const errorMessage =
            e instanceof Error ? e.message : 'Calculation failed'
          setError(errorMessage)
          console.error('EW calculation failed:', e)
        }
        return false
      } finally {
        // Always reset calculating state
        if (!cancelledRef.current) {
          setIsCalculating(false)
        }
      }
    },
    [stockfish, maia, status, isCalculating, handleProgress]
  )

  /**
   * Cancel an ongoing calculation.
   */
  const cancel = useCallback(() => {
    cancelledRef.current = true
    setIsCalculating(false)
    setProgress(INITIAL_PROGRESS)
  }, [])

  /**
   * Clear result and error state.
   */
  const clear = useCallback(() => {
    setResult(null)
    setError(null)
    setCalculatedFen(null)
    setProgress(INITIAL_PROGRESS)
  }, [])

  // ---------------------------------------------------------------------------
  // RETURN VALUE
  // ---------------------------------------------------------------------------

  return {
    // State
    result,
    isCalculating,
    progress,
    error,
    calculatedFen,
    // Actions
    calculate,
    cancel,
    clear,
  }
}
