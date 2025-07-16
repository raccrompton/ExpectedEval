import Maia from './model'
import { MaiaStatus } from 'src/types'
import { MaiaEngineContext } from 'src/contexts'
import { ReactNode, useState, useMemo, useCallback } from 'react'

export const MaiaEngineContextProvider: React.FC<{ children: ReactNode }> = ({
  children,
}: {
  children: ReactNode
}) => {
  const [status, setStatus] = useState<MaiaStatus>('loading')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const maia = useMemo(() => {
    const model = new Maia({
      model: '/maia2/maia_rapid.onnx',
      setStatus: setStatus,
      setProgress: setProgress,
      setError: setError,
    })
    return model
  }, [])

  const downloadModel = useCallback(async () => {
    try {
      setStatus('downloading')
      await maia.downloadModel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download model')
      setStatus('error')
    }
  }, [maia])

  const getStorageInfo = useCallback(async () => {
    return await maia.getStorageInfo()
  }, [maia])

  const clearStorage = useCallback(async () => {
    return await maia.clearStorage()
  }, [maia])

  return (
    <MaiaEngineContext.Provider
      value={{
        maia,
        status,
        progress,
        downloadModel,
      }}
    >
      {children}
    </MaiaEngineContext.Provider>
  )
}
