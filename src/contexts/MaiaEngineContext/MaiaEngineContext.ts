import React from 'react'
import { MaiaEngine } from 'src/types'

export const MaiaEngineContext = React.createContext<MaiaEngine>({
  maia: undefined,
  status: 'loading',
  progress: 0,
  downloadModel: async () => {
    throw new Error('poorly provided MaiaEngineContext, missing downloadModel')
  },
  // getStorageInfo: async () => {
  //   throw new Error('poorly provided MaiaEngineContext, missing getStorageInfo')
  // },
  // clearStorage: async () => {
  //   throw new Error('poorly provided MaiaEngineContext, missing clearStorage')
  // },
})
