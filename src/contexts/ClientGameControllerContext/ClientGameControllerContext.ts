import React from 'react'
import { useGameController } from 'src/hooks'

type IClientGameControllerContext = ReturnType<typeof useClientGameController>

export const ClientGameControllerContext =
  React.createContext<IClientGameControllerContext>({
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
