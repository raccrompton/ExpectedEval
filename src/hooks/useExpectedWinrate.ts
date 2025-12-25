/**
 * useExpectedWinrate Hook
 *
 * React hook that wraps the core Expected Winrate calculation algorithm.
 * Provides a React-friendly interface with loading states and progress updates.
 */

import { useState, useCallback, useRef } from 'react'
import { useEngineInstances } from '@/contexts'
import {
  calculateExpectedWinrate,
  type EWResult,
  type EWConfig,
  type OnEWProgress,
  type EWProgressCallback,
  DEFAULT_EW_CONFIG,
} from '@/core/analysis'

export type EWStatus = 'idle' | 'calculating' | 'complete' | 'error'

export interface UseExpectedWinrateReturn {
  result: EWResult | null
  status: EWStatus
  progress: EWProgressCallback | null
  error: Error | null
  config: EWConfig
  calculate: (fen: string) => Promise<void>
  updateConfig: (partial: Partial<EWConfig>) => void
  reset: () => void
}

/**
 * Hook for calculating Expected Winrate analysis.
 *
 * Uses the engine instances from EngineContext to run the EW algorithm.
 * Provides loading states, progress updates, and result management.
 *
 * @param initialConfig - Optional initial configuration override
 * @returns Hook state and actions
 *
 * @example
 * function EWPanel({ fen }: { fen: string }) {
 *   const { result, status, calculate, progress } = useExpectedWinrate()
 *
 *   const handleCalculate = () => calculate(fen)
 *
 *   if (status === 'calculating') {
 *     return <div>Calculating... {progress?.message}</div>
 *   }
 *
 *   if (result) {
 *     return <EWResults result={result} />
 *   }
 *
 *   return <button onClick={handleCalculate}>Calculate EW</button>
 * }
 */
export function useExpectedWinrate(
  initialConfig?: Partial<EWConfig>
): UseExpectedWinrateReturn {
  const { stockfish, maia, isInitialized } = useEngineInstances()

  const [result, setResult] = useState<EWResult | null>(null)
  const [status, setStatus] = useState<EWStatus>('idle')
  const [progress, setProgress] = useState<EWProgressCallback | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [config, setConfig] = useState<EWConfig>({
    ...DEFAULT_EW_CONFIG,
    ...initialConfig,
  })

  const currentFenRef = useRef<string | null>(null)

  const calculate = useCallback(
    async (fen: string) => {
      if (!stockfish || !maia || !isInitialized) {
        setError(new Error('Engines not initialized'))
        setStatus('error')
        return
      }

      currentFenRef.current = fen
      setStatus('calculating')
      setError(null)
      setProgress(null)
      setResult(null)

      const onProgress: OnEWProgress = (progressUpdate) => {
        if (currentFenRef.current === fen) {
          setProgress(progressUpdate)
        }
      }

      try {
        const ewResult = await calculateExpectedWinrate(
          fen,
          config,
          stockfish,
          maia,
          onProgress
        )

        if (currentFenRef.current !== fen) {
          return
        }

        setResult(ewResult)
        setStatus('complete')
      } catch (err) {
        if (currentFenRef.current !== fen) {
          return
        }

        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        setStatus('error')
        console.error('EW calculation failed:', error)
      }
    },
    [stockfish, maia, isInitialized, config]
  )

  const updateConfig = useCallback((partial: Partial<EWConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }))
  }, [])

  const reset = useCallback(() => {
    currentFenRef.current = null
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
    config,
    calculate,
    updateConfig,
    reset,
  }
}
