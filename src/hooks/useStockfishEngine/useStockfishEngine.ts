import { useMemo } from 'react'

import Engine from './engine'
import { StockfishEvaluation } from 'src/types'

export const useStockfishEngine = (
  callback: (message: StockfishEvaluation, index: number) => void,
) => {
  const engine = useMemo(() => new Engine(callback), [])
  return engine
}
