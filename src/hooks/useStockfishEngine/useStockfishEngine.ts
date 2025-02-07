import { useMemo, useRef, useCallback } from 'react'
import Engine from './engine'
import { StockfishEvaluation } from 'src/types'

export const useStockfishEngine = () => {
  const engineRef = useRef<Engine | null>(null)

  if (!engineRef.current) {
    engineRef.current = new Engine()
  }

  const streamEvaluations = useCallback(
    (fen: string, legalMoveCount: number) => {
      if (!engineRef.current) {
        console.error('Engine not initialized')
        return null
      }
      return engineRef.current.streamEvaluations(fen, legalMoveCount)
    },
    [],
  )

  const stopEvaluation = useCallback(() => {
    engineRef.current?.stopEvaluation()
  }, [])

  return useMemo(
    () => ({
      streamEvaluations,
      stopEvaluation,
    }),
    [streamEvaluations, stopEvaluation],
  )
}
