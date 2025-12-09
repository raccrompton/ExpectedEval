/**
 * Base Tree Controller Hook
 *
 * Provides access to the tree controller context for chess game navigation.
 * In the ExpectedEval MVP, this only supports the analysis context since
 * play, turing, and training features have been removed.
 *
 * @param type - The context type to use (currently only 'analysis' is supported)
 * @returns The tree controller context for navigation and state management
 */

import { useContext } from 'react'
import { BaseTreeControllerContext } from 'src/contexts/BaseTreeControllerContext'
import { TreeControllerContext } from 'src/contexts/TreeControllerContext/TreeControllerContext'

// Type for supported context types - MVP only supports analysis
type ContextType = 'analysis'

export function useBaseTreeController(
  type: ContextType,
): BaseTreeControllerContext {
  // Get the analysis tree controller context
  const analysisContext = useContext(TreeControllerContext)

  // In the MVP, we only support analysis mode
  // This simplifies the architecture by removing unused game modes
  if (type === 'analysis') {
    return analysisContext
  }

  // This should never be reached with the current type definition
  throw new Error(`Unknown context type: ${type}`)
}
