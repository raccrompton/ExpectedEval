import { GameTree, GameNode } from 'src/types/base/tree'
import { Chess, PieceSymbol } from 'chess.ts'

describe('Analysis Page makeMove Logic for FEN Positions', () => {
  // Simulate the makeMove function logic from the analysis page
  const simulateMakeMove = (
    gameTree: GameTree,
    currentNode: GameNode,
    move: string,
    currentMaiaModel?: string,
  ) => {
    const chess = new Chess(currentNode.fen)
    const moveAttempt = chess.move({
      from: move.slice(0, 2),
      to: move.slice(2, 4),
      promotion: move[4] ? (move[4] as PieceSymbol) : undefined,
    })

    if (moveAttempt) {
      const newFen = chess.fen()
      const moveString =
        moveAttempt.from +
        moveAttempt.to +
        (moveAttempt.promotion ? moveAttempt.promotion : '')
      const san = moveAttempt.san

      // This is the current logic from the analysis page that we need to fix
      if (currentNode.mainChild?.move === moveString) {
        return { type: 'navigate', node: currentNode.mainChild }
      } else {
        // ISSUE: Always creates variation, never main line for first move
        const newVariation = gameTree.addVariation(
          currentNode,
          newFen,
          moveString,
          san,
          currentMaiaModel,
        )
        return { type: 'variation', node: newVariation }
      }
    }
    return null
  }

  // Fixed version of makeMove logic
  const simulateFixedMakeMove = (
    gameTree: GameTree,
    currentNode: GameNode,
    move: string,
    currentMaiaModel?: string,
  ) => {
    const chess = new Chess(currentNode.fen)
    const moveAttempt = chess.move({
      from: move.slice(0, 2),
      to: move.slice(2, 4),
      promotion: move[4] ? (move[4] as PieceSymbol) : undefined,
    })

    if (moveAttempt) {
      const newFen = chess.fen()
      const moveString =
        moveAttempt.from +
        moveAttempt.to +
        (moveAttempt.promotion ? moveAttempt.promotion : '')
      const san = moveAttempt.san

      if (currentNode.mainChild?.move === moveString) {
        // Existing main line move - navigate to it
        return { type: 'navigate', node: currentNode.mainChild }
      } else if (!currentNode.mainChild) {
        // No main child exists - create main line move (FIX)
        const newMainMove = gameTree.addMainMove(
          currentNode,
          newFen,
          moveString,
          san,
          currentMaiaModel,
        )
        return { type: 'main', node: newMainMove }
      } else {
        // Main child exists but different move - create variation
        const newVariation = gameTree.addVariation(
          currentNode,
          newFen,
          moveString,
          san,
          currentMaiaModel,
        )
        return { type: 'variation', node: newVariation }
      }
    }
    return null
  }

  describe('Current behavior (broken)', () => {
    it('incorrectly creates variations for first move from FEN position', () => {
      const customFen =
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4'
      const tree = new GameTree(customFen)
      const rootNode = tree.getRoot()

      // Simulate making the first move from FEN position
      const result = simulateMakeMove(tree, rootNode, 'f3g5')

      // ISSUE: First move incorrectly creates a variation instead of main line
      expect(result?.type).toBe('variation')
      expect(rootNode.mainChild).toBeNull() // No main line created
      expect(rootNode.children.length).toBe(1)
      expect(rootNode.getVariations().length).toBe(1) // Created as variation

      // The main line should only contain the root
      const mainLine = tree.getMainLine()
      expect(mainLine.length).toBe(1) // Only root, no main line progression
    })

    it('shows the problem when making multiple moves from FEN', () => {
      const customFen =
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4'
      const tree = new GameTree(customFen)
      const rootNode = tree.getRoot()

      // Make first move
      const result1 = simulateMakeMove(tree, rootNode, 'f3g5')
      expect(result1?.type).toBe('variation')

      // Make second move from same position
      const result2 = simulateMakeMove(tree, rootNode, 'f3e5')
      expect(result2?.type).toBe('variation')

      // Both moves are variations, no main line established
      expect(rootNode.mainChild).toBeNull()
      expect(rootNode.getVariations().length).toBe(2)
      expect(tree.getMainLine().length).toBe(1) // Still just root
    })
  })

  describe('Fixed behavior', () => {
    it('correctly creates main line for first move from FEN position', () => {
      const customFen =
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4'
      const tree = new GameTree(customFen)
      const rootNode = tree.getRoot()

      // Simulate making the first move from FEN position with fix
      const result = simulateFixedMakeMove(tree, rootNode, 'f3g5')

      // FIXED: First move creates main line
      expect(result?.type).toBe('main')
      expect(rootNode.mainChild).toBeTruthy() // Main line created
      expect(rootNode.mainChild?.isMainline).toBe(true)
      expect(rootNode.getVariations().length).toBe(0) // No variations yet

      // The main line should now contain root + first move
      const mainLine = tree.getMainLine()
      expect(mainLine.length).toBe(2) // Root + one move
    })

    it('correctly handles subsequent moves: main line extension and variations', () => {
      const customFen =
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4'
      const tree = new GameTree(customFen)
      const rootNode = tree.getRoot()

      // First move - should create main line
      const result1 = simulateFixedMakeMove(tree, rootNode, 'f3g5')
      expect(result1?.type).toBe('main')
      const firstMove = result1?.node as GameNode

      // Second move from same position - should create variation
      const result2 = simulateFixedMakeMove(tree, rootNode, 'f3e5')
      expect(result2?.type).toBe('variation')

      // Third move extending main line - should be main line
      const result3 = simulateFixedMakeMove(tree, firstMove, 'd7d6')
      expect(result3?.type).toBe('main')

      // Verify final structure
      expect(rootNode.mainChild).toBeTruthy()
      expect(rootNode.getVariations().length).toBe(1) // One variation
      expect(tree.getMainLine().length).toBe(3) // Root + two main moves
    })

    it('correctly navigates to existing moves', () => {
      const customFen =
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4'
      const tree = new GameTree(customFen)
      const rootNode = tree.getRoot()

      // Create a move first
      const result1 = simulateFixedMakeMove(tree, rootNode, 'f3g5')
      const existingNode = result1?.node

      // Try the same move again - should navigate to existing node
      const result2 = simulateFixedMakeMove(tree, rootNode, 'f3g5')
      expect(result2?.type).toBe('navigate')
      expect(result2?.node).toBe(existingNode)

      // Structure should remain unchanged
      expect(rootNode.children.length).toBe(1)
    })
  })
})
