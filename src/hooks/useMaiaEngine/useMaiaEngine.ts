import { useMemo } from 'react'

import Maia from 'src/utils/maia2'

export const useMaiaEngine = () => {
  const maia = useMemo(() => {
    const model = new Maia({ model: '/maia2/maia_rapid.onnx' })
    return model
  }, [])

  return maia
}
