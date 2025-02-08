import React from 'react'

import { useAnalysisGameController } from 'src/hooks'

type IAnalysisGameControllerContext = ReturnType<
  typeof useAnalysisGameController
>

export const AnalysisGameControllerContext =
  React.createContext<IAnalysisGameControllerContext>({
    currentNode: undefined,
    setCurrentNode: () => {
      throw new Error('poorly provided context')
    },
    orientation: 'white',
    setOrientation: () => {
      throw new Error('poorly provided context')
    },
    goToNode: () => {
      throw new Error('poorly provided context')
    },
    goToNextNode: () => {
      throw new Error('poorly provided context')
    },
    goToPreviousNode: () => {
      throw new Error('poorly provided context')
    },
    goToRootNode: () => {
      throw new Error('poorly provided context')
    },
    plyCount: 0,
  })
