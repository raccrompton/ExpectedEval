import { useContext } from 'react'
import { BaseTreeControllerContext } from 'src/contexts/BaseTreeControllerContext'
import { TreeControllerContext } from 'src/contexts/TreeControllerContext/TreeControllerContext'
import { PlayTreeControllerContext } from 'src/contexts/PlayTreeControllerContext/PlayTreeControllerContext'
import { TuringTreeControllerContext } from 'src/contexts/TuringTreeControllerContext/TuringTreeControllerContext'

type ContextType = 'analysis' | 'play' | 'turing'

export function useBaseTreeController(
  type: ContextType,
): BaseTreeControllerContext {
  const analysisContext = useContext(TreeControllerContext)
  const playContext = useContext(PlayTreeControllerContext)
  const turingContext = useContext(TuringTreeControllerContext)

  switch (type) {
    case 'analysis':
      return analysisContext
    case 'play':
      return playContext
    case 'turing':
      return turingContext
    default:
      throw new Error(`Unknown context type: ${type}`)
  }
}
