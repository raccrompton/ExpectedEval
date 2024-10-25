import React from 'react'
import { useGameController } from 'src/hooks'

type IGameControllerContext = ReturnType<typeof useGameController>

export const GameControllerContext =
  React.createContext<IGameControllerContext>({
    plyCount: 0,
    currentIndex: 0,
    orientation: 'white',
    setOrientation: () => {
      throw new Error('poorly provided context')
    },
    setCurrentIndex: () => {
      throw new Error('poorly provided context')
    },
  })
