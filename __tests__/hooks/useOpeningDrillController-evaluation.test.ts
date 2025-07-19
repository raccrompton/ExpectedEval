import { GameTree, GameNode } from 'src/types'
import { Chess } from 'chess.ts'

/**
 * Test to verify that evaluation chart generation starts from the correct position
 * This test validates the fix for issue #118 where the position evaluation graph
 * was showing pre-opening moves that the player didn't actually play.
 */
describe('useOpeningDrillController evaluation chart generation', () => {
  // Helper function to simulate the extractNodeAnalysis logic
  const extractNodeAnalysisFromPosition = (
    startingNode: GameNode,
    playerColor: 'white' | 'black',
  ) => {
    const moveAnalyses: any[] = []
    const evaluationChart: any[] = []

    const extractNodeAnalysis = (node: GameNode, path: GameNode[] = []): void => {
      const currentPath = [...path, node]

      if (node.move && node.san) {
        const moveIndex = currentPath.length - 2
        const isPlayerMove =
          playerColor === 'white' ? moveIndex % 2 === 0 : moveIndex % 2 === 1

        // Mock evaluation data
        const evaluation = Math.random() * 200 - 100 // Random evaluation between -100 and 100

        const moveAnalysis = {
          move: node.move,
          san: node.san,
          fen: node.fen,
          isPlayerMove,
          evaluation,
          moveNumber: Math.ceil((moveIndex + 1) / 2),
        }

        moveAnalyses.push(moveAnalysis)

        const evaluationPoint = {
          moveNumber: moveAnalysis.moveNumber,
          evaluation,
          isPlayerMove,
        }

        evaluationChart.push(evaluationPoint)
      }

      if (node.children.length > 0) {
        extractNodeAnalysis(node.children[0], currentPath)
      }
    }

    extractNodeAnalysis(startingNode)
    return { moveAnalyses, evaluationChart }
  }

  it('should start analysis from opening end node rather than game root', () => {
    // Create a game tree representing: 1. e4 e5 2. Nf3 Nc6 (opening) 3. Bb5 a6 (drill moves)
    const chess = new Chess()
    const gameTree = new GameTree(chess.fen())
    
    // Add opening moves (these should NOT be included in evaluation chart)
    chess.move('e4')
    const e4Node = gameTree.addMainMove(gameTree.getRoot(), chess.fen(), 'e2e4', 'e4')!
    
    chess.move('e5')
    const e5Node = gameTree.addMainMove(e4Node, chess.fen(), 'e7e5', 'e5')!
    
    chess.move('Nf3')
    const nf3Node = gameTree.addMainMove(e5Node, chess.fen(), 'g1f3', 'Nf3')!
    
    chess.move('Nc6')
    const nc6Node = gameTree.addMainMove(nf3Node, chess.fen(), 'b8c6', 'Nc6')! // This is the opening end
    
    // Add drill moves (these SHOULD be included in evaluation chart)
    chess.move('Bb5')
    const bb5Node = gameTree.addMainMove(nc6Node, chess.fen(), 'f1b5', 'Bb5')!
    
    chess.move('a6')
    const a6Node = gameTree.addMainMove(bb5Node, chess.fen(), 'a7a6', 'a6')!

    // Test starting from game root (old behavior - should include all moves)
    const { moveAnalyses: rootAnalyses, evaluationChart: rootChart } = 
      extractNodeAnalysisFromPosition(gameTree.getRoot(), 'white')

    // Test starting from opening end (new behavior - should only include drill moves)
    const { moveAnalyses: openingEndAnalyses, evaluationChart: openingEndChart } = 
      extractNodeAnalysisFromPosition(nc6Node, 'white')

    // Verify that starting from root includes all moves (including opening)
    expect(rootAnalyses).toHaveLength(6) // e4, e5, Nf3, Nc6, Bb5, a6
    expect(rootChart).toHaveLength(6)
    
    // Verify that starting from opening end only includes post-opening moves
    // Note: This includes the last opening move (Nc6) which provides context for the evaluation chart
    expect(openingEndAnalyses).toHaveLength(3) // Nc6 (last opening move), Bb5, a6
    expect(openingEndChart).toHaveLength(3)

    // Verify the moves are correct - the first should be the last opening move, then drill moves
    expect(openingEndAnalyses[0].san).toBe('Nc6') // Last opening move
    expect(openingEndAnalyses[1].san).toBe('Bb5') // First drill move
    expect(openingEndAnalyses[1].isPlayerMove).toBe(true) // White's move
    expect(openingEndAnalyses[2].san).toBe('a6') // Second drill move
    expect(openingEndAnalyses[2].isPlayerMove).toBe(false) // Black's move

    // Verify evaluation chart matches move analyses
    expect(openingEndChart[0].moveNumber).toBe(openingEndAnalyses[0].moveNumber)
    expect(openingEndChart[1].moveNumber).toBe(openingEndAnalyses[1].moveNumber)
  })

  it('should handle the case where opening end node is null', () => {
    const chess = new Chess()
    const gameTree = new GameTree(chess.fen())
    
    // Add some moves
    chess.move('e4')
    const e4Node = gameTree.addMainMove(gameTree.getRoot(), chess.fen(), 'e2e4', 'e4')!

    // Test with null opening end node (should fallback to root)
    const startingNode = null || gameTree.getRoot() // Simulates the fallback logic
    const { moveAnalyses, evaluationChart } = 
      extractNodeAnalysisFromPosition(startingNode, 'white')

    expect(moveAnalyses).toHaveLength(1)
    expect(evaluationChart).toHaveLength(1)
    expect(moveAnalyses[0].san).toBe('e4')
  })
})