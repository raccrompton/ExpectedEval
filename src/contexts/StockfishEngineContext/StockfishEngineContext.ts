import React from 'react'
import { StockfishEngine } from 'src/types'

export const StockfishEngineContext = React.createContext<StockfishEngine>({
  streamEvaluations: () => {
    throw new Error(
      'poorly provided StockfishEngineContext, missing streamEvaluations',
    )
  },
  stopEvaluation: () => {
    throw new Error(
      'poorly provided StockfishEngineContext, missing stopEvaluation',
    )
  },
  isReady: () => {
    throw new Error('poorly provided StockfishEngineContext, missing isReady')
  },
  status: 'loading',
  error: null,
})
