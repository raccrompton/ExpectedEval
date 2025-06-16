import React, { SetStateAction } from 'react'
import { useTreeController } from 'src/hooks/useTreeController'

export type ITreeControllerContext = ReturnType<typeof useTreeController>

export const TreeControllerContext =
  React.createContext<ITreeControllerContext>({
    currentNode: undefined,
    setCurrentNode: () => {
      throw new Error('TreeControllerContext not provided')
    },
    orientation: 'white',
    setOrientation: () => {
      throw new Error('TreeControllerContext not provided')
    },
    goToNode: () => {
      throw new Error('TreeControllerContext not provided')
    },
    goToNextNode: () => {
      throw new Error('TreeControllerContext not provided')
    },
    goToPreviousNode: () => {
      throw new Error('TreeControllerContext not provided')
    },
    goToRootNode: () => {
      throw new Error('TreeControllerContext not provided')
    },
    plyCount: 0,
    currentIndex: 0,
    setCurrentIndex: (() => {
      throw new Error('TreeControllerContext not provided')
    }) as (indexOrUpdater: SetStateAction<number>) => void,
  })
