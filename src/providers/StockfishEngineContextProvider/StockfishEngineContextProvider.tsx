import {
  ReactNode,
  useRef,
  useCallback,
  useState,
  useEffect,
  useMemo,
} from 'react'
import { StockfishEngineContext } from 'src/contexts'
import { StockfishStatus } from 'src/types'
import Engine from 'src/providers/StockfishEngineContextProvider/engine'

export const StockfishEngineContextProvider: React.FC<{
  children: ReactNode
}> = ({ children }: { children: ReactNode }) => {
  const engineRef = useRef<Engine | null>(null)
  const [status, setStatus] = useState<StockfishStatus>('loading')
  const [error, setError] = useState<string | null>(null)

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

  const isReady = useCallback(() => {
    return engineRef.current?.ready ?? false
  }, [])

  useEffect(() => {
    const checkEngineStatus = () => {
      if (engineRef.current?.ready) {
        setStatus('ready')
        setError(null)
      } else if (engineRef.current && !engineRef.current.ready) {
        setStatus('loading')
      }
    }

    checkEngineStatus()
    const interval = setInterval(checkEngineStatus, 100)

    return () => clearInterval(interval)
  }, [])

  const contextValue = useMemo(
    () => ({
      streamEvaluations,
      stopEvaluation,
      isReady,
      status,
      error,
    }),
    [streamEvaluations, stopEvaluation, isReady, status, error],
  )

  return (
    <StockfishEngineContext.Provider value={contextValue}>
      {children}
    </StockfishEngineContext.Provider>
  )
}
