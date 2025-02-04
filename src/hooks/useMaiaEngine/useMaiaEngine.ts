import { useState, useMemo, useEffect } from 'react'

import Maia from 'src/utils/maia2'

export const useMaiaEngine = () => {
  const [maia, setMaia] = useState<Maia>()

  useEffect(() => {
    setMaia(new Maia({ model: '/maia2/maia_rapid.onnx', type: 'rapid' }))
  }, [])

  // const maia = useMemo(() => {
  //   const model = new Maia({ model: '/maia2/maia_rapid.onnx', type: 'rapid' })
  //   return model
  // }, [])

  return maia
}
