/**
 * useWinFinder Hook
 *
 * React hook for Win Finder analysis - identifying positions where
 * Stockfish sees equality but Maia strongly prefers one move.
 *
 * This hook provides:
 * - Manual trigger for analysis (analyze button)
 * - Progress tracking during calculation
 * - Cancellation support
 * - Result state management
 */

import { useState, useCallback, useRef } from 'react'
import { useEngines } from '@/contexts'
import {
  analyzeGameForDisagreements,
  type PositionDisagreement,
  type WinFinderResult,
  type WinFinderConfig,
  type PositionInput,
  DEFAULT_WIN_FINDER_CONFIG,
} from '@/core/analysis'

/**
 * Win Finder calculation status states.
 */
export type WinFinderStatus = 'idle' | 'analyzing' | 'complete' | 'error'

/**
 * Progress information during analysis.
 */
export interface WinFinderProgress {
  current: number
  total: number
}

/**
 * Return type for useWinFinder hook.
 */
export interface UseWinFinderReturn {
  /** Win Finder result (null if not calculated) */
  result: WinFinderResult | null
  /** Current calculation status */
  status: WinFinderStatus
  /** Progress info during calculation */
  progress: WinFinderProgress | null
  /** Error if calculation failed */
  error: Error | null
  /** Trigger analysis for given positions */
  analyze: (positions: PositionInput[], config?: Partial<WinFinderConfig>) => Promise<void>
  /** Reset to idle state */
  reset: () => void
  /** Whether analysis can be triggered (engines ready, not already analyzing) */
  canAnalyze: boolean
}

/**
 * Hook for Win Finder analysis.
 *
 * Provides manual analysis trigger (not auto-triggered like EW).
 * Tracks progress and supports cancellation.
 *
 * @returns Hook state and actions
 *
 * @example
 * function WinFinderPanel({ positions }: { positions: PositionInput[] }) {
 *   const { result, status, progress, analyze, canAnalyze } = useWinFinder()
 *
 *   return (
 *     <div>
 *       <button onClick={() => analyze(positions)} disabled={!canAnalyze}>
 *         {status === 'analyzing' ? 'Analyzing...' : 'Find Hidden Edges'}
 *       </button>
 *       {progress && (
 *         <div>Progress: {progress.current}/{progress.total}</div>
 *       )}
 *       {result && result.positions.map(pos => (
 *         <div key={pos.fen}>Score: {pos.disagreementScore}</div>
 *       ))}
 *     </div>
 *   )
 * }
 */
export function useWinFinder(): UseWinFinderReturn {
  const { stockfish, maia, isInitialized } = useEngines()

  const [result, setResult] = useState<WinFinderResult | null>(null)
  const [status, setStatus] = useState<WinFinderStatus>('idle')
  const [progress, setProgress] = useState<WinFinderProgress | null>(null)
  const [error, setError] = useState<Error | null>(null)

  // Track if we're currently analyzing to prevent duplicate calls
  const isAnalyzingRef = useRef(false)
  // Track if analysis should be cancelled
  const shouldCancelRef = useRef(false)

  const canAnalyze = Boolean(
    isInitialized && stockfish?.isReady() && maia?.isReady() && status !== 'analyzing'
  )

  /**
   * Run Win Finder analysis on provided positions.
   *
   * @param positions - Array of positions to analyze
   * @param config - Optional configuration override
   */
  const analyze = useCallback(
    async (positions: PositionInput[], config?: Partial<WinFinderConfig>) => {
      // Prevent duplicate calls
      if (isAnalyzingRef.current) {
        return
      }

      // Check engine readiness
      if (!stockfish || !maia || !isInitialized) {
        setError(new Error('Engines not ready'))
        setStatus('error')
        return
      }

      // Handle empty positions
      if (positions.length === 0) {
        setResult({
          positions: [],
          analyzedPositions: 0,
          calculationTimeMs: 0,
        })
        setStatus('complete')
        return
      }

      isAnalyzingRef.current = true
      shouldCancelRef.current = false
      setStatus('analyzing')
      setError(null)
      setProgress({ current: 0, total: positions.length })
      setResult(null)

      const fullConfig: WinFinderConfig = {
        ...DEFAULT_WIN_FINDER_CONFIG,
        ...config,
      }

      const onProgress = (current: number, total: number) => {
        if (!shouldCancelRef.current) {
          setProgress({ current, total })
        }
      }

      try {
        const winFinderResult = await analyzeGameForDisagreements(
          positions,
          fullConfig,
          stockfish,
          maia,
          onProgress
        )

        // Check if cancelled
        if (shouldCancelRef.current) {
          isAnalyzingRef.current = false
          setStatus('idle')
          return
        }

        setResult(winFinderResult)
        setStatus('complete')
      } catch (err) {
        if (shouldCancelRef.current) {
          isAnalyzingRef.current = false
          setStatus('idle')
          return
        }

        const analysisError = err instanceof Error ? err : new Error(String(err))
        setError(analysisError)
        setStatus('error')
        console.error('Win Finder analysis failed:', analysisError)
      } finally {
        isAnalyzingRef.current = false
      }
    },
    [stockfish, maia, isInitialized]
  )

  /**
   * Reset hook state to idle.
   */
  const reset = useCallback(() => {
    shouldCancelRef.current = true
    setResult(null)
    setStatus('idle')
    setProgress(null)
    setError(null)
  }, [])

  return {
    result,
    status,
    progress,
    error,
    analyze,
    reset,
    canAnalyze,
  }
}
