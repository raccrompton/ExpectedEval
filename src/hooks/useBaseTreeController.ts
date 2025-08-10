import { useContext } from 'react'
import { BaseTreeControllerContext } from 'src/contexts/BaseTreeControllerContext'
import { TreeControllerContext } from 'src/contexts/TreeControllerContext'
import { PlayControllerContext } from 'src/contexts/PlayControllerContext'
import { TuringControllerContext } from 'src/contexts/TuringTreeControllerContext'
import { TrainingControllerContext } from 'src/contexts/TrainingControllerContext'

type ContextType = 'analysis' | 'play' | 'turing' | 'training'

export function useBaseTreeController(
  type: ContextType,
): BaseTreeControllerContext {
  const analysisContext = useContext(TreeControllerContext)
  const playContext = useContext(PlayControllerContext)
  const turingContext = useContext(TuringControllerContext)
  const trainingContext = useContext(TrainingControllerContext)

  switch (type) {
    case 'analysis':
      return analysisContext
    case 'play':
      return playContext
    case 'turing':
      return turingContext
    case 'training':
      return trainingContext
    default:
      throw new Error(`Unknown context type: ${type}`)
  }
}
