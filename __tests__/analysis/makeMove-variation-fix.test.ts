import { GameTree, GameNode } from 'src/types/base/tree'
import { Chess, PieceSymbol } from 'chess.ts'

describe('makeMove Logic - Variation Continuation Test', () => {
  // Test specifically for Kevin's feedback: when we're in a variation and make a move,
  // it should continue the variation, not create a new main line

  it('should continue variation when making moves from variation nodes', () => {
    const initialFen =
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const gameTree = new GameTree(initialFen)
    const root = gameTree.getRoot()

    // Step 1: Create main line move (e2e4)
    const mainMove = gameTree.addMainMove(
      root,
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
      'e2e4',
      'e4',
    )

    // Step 2: Create a variation from root (d2d4)
    const variation = gameTree.addVariation(
      root,
      'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2',
      'd2d4',
      'd4',
    )

    // Verify setup
    expect(root.mainChild).toBe(mainMove)
    expect(root.mainChild?.isMainline).toBe(true)
    expect(variation.isMainline).toBe(false)
    expect(root.children).toHaveLength(2)

    // Step 3: Simulate makeMove logic when currentNode is the variation
    const simulateMakeMove = (currentNode: GameNode, move: string) => {
      const chess = new Chess(currentNode.fen)
      const moveAttempt = chess.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move[4] ? (move[4] as PieceSymbol) : undefined,
      })

      if (moveAttempt) {
        const newFen = chess.fen()
        const moveString =
          moveAttempt.from + moveAttempt.to + (moveAttempt.promotion || '')
        const san = moveAttempt.san

        // This is the FIXED logic from the analysis page
        if (currentNode.mainChild?.move === moveString) {
          return { type: 'navigate', node: currentNode.mainChild }
        } else if (!currentNode.mainChild && currentNode.isMainline) {
          // Only create main line if no main child AND we're on main line
          const newMainMove = gameTree.addMainMove(
            currentNode,
            newFen,
            moveString,
            san,
          )
          return { type: 'main_line', node: newMainMove }
        } else {
          // Either main child exists but different move, OR we're in variation - create variation
          const newVariation = gameTree.addVariation(
            currentNode,
            newFen,
            moveString,
            san,
          )
          return { type: 'variation', node: newVariation }
        }
      }
      return null
    }

    // Step 4: Make move from the variation node (should create another variation, not main line)
    const result = simulateMakeMove(variation, 'g1f3')

    // Assertions
    expect(result).not.toBeNull()
    expect(result!.type).toBe('variation')
    expect(result!.node.isMainline).toBe(false)
    expect(variation.mainChild).toBeNull() // variation should not have gained a main child
    expect(variation.children).toHaveLength(1) // should have one child (the move we just made)
    expect(variation.children[0].isMainline).toBe(false) // that child should be a variation
    expect(variation.children[0].move).toBe('g1f3')
    expect(variation.children[0].san).toBe('Nf3')
  })

  it('should create main line when making first move from FEN on main line', () => {
    const customFen =
      'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3'
    const gameTree = new GameTree(customFen)
    const root = gameTree.getRoot()

    const simulateMakeMove = (currentNode: GameNode, move: string) => {
      const chess = new Chess(currentNode.fen)
      const moveAttempt = chess.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move[4] ? (move[4] as PieceSymbol) : undefined,
      })

      if (moveAttempt) {
        const newFen = chess.fen()
        const moveString =
          moveAttempt.from + moveAttempt.to + (moveAttempt.promotion || '')
        const san = moveAttempt.san

        if (currentNode.mainChild?.move === moveString) {
          return { type: 'navigate', node: currentNode.mainChild }
        } else if (!currentNode.mainChild && currentNode.isMainline) {
          const newMainMove = gameTree.addMainMove(
            currentNode,
            newFen,
            moveString,
            san,
          )
          return { type: 'main_line', node: newMainMove }
        } else {
          const newVariation = gameTree.addVariation(
            currentNode,
            newFen,
            moveString,
            san,
          )
          return { type: 'variation', node: newVariation }
        }
      }
      return null
    }

    // Make first move from FEN position (should be main line since root is on main line)
    const result = simulateMakeMove(root, 'g1f3')

    expect(result).not.toBeNull()
    expect(result!.type).toBe('main_line')
    expect(result!.node.isMainline).toBe(true)
    expect(root.mainChild).toBe(result!.node)
  })

  it('should handle complex variation tree correctly', () => {
    const initialFen =
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const gameTree = new GameTree(initialFen)
    const root = gameTree.getRoot()

    // Create main line: e4
    const e4 = gameTree.addMainMove(
      root,
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      'e2e4',
      'e4',
    )

    // Create variation from root: d4
    const d4 = gameTree.addVariation(
      root,
      'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
      'd2d4',
      'd4',
    )

    // Create variation from root: Nf3
    const nf3 = gameTree.addVariation(
      root,
      'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1',
      'g1f3',
      'Nf3',
    )

    const simulateMakeMove = (currentNode: GameNode, move: string) => {
      const chess = new Chess(currentNode.fen)
      const moveAttempt = chess.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move[4] ? (move[4] as PieceSymbol) : undefined,
      })

      if (moveAttempt) {
        const newFen = chess.fen()
        const moveString =
          moveAttempt.from + moveAttempt.to + (moveAttempt.promotion || '')
        const san = moveAttempt.san

        if (currentNode.mainChild?.move === moveString) {
          return { type: 'navigate', node: currentNode.mainChild }
        } else if (!currentNode.mainChild && currentNode.isMainline) {
          const newMainMove = gameTree.addMainMove(
            currentNode,
            newFen,
            moveString,
            san,
          )
          return { type: 'main_line', node: newMainMove }
        } else {
          const newVariation = gameTree.addVariation(
            currentNode,
            newFen,
            moveString,
            san,
          )
          return { type: 'variation', node: newVariation }
        }
      }
      return null
    }

    // Make move from e4 (main line) - should create main line continuation
    const e4Continue = simulateMakeMove(e4, 'e7e5')
    expect(e4Continue).not.toBeNull()
    expect(e4Continue!.type).toBe('main_line')
    expect(e4Continue!.node.isMainline).toBe(true)

    // Make move from d4 (variation) - should create variation continuation
    const d4Continue = simulateMakeMove(d4, 'g8f6')
    expect(d4Continue!.type).toBe('variation')
    expect(d4Continue!.node.isMainline).toBe(false)

    // Make move from Nf3 (variation) - should create variation continuation
    const nf3Continue = simulateMakeMove(nf3, 'e7e5')
    expect(nf3Continue!.type).toBe('variation')
    expect(nf3Continue!.node.isMainline).toBe(false)

    // Verify tree structure
    expect(root.children).toHaveLength(3) // e4, d4, Nf3
    expect(e4.children).toHaveLength(1) // e5 (main line)
    expect(d4.children).toHaveLength(1) // Nf6 (variation)
    expect(nf3.children).toHaveLength(1) // e5 (variation)

    expect(e4.mainChild).toBe(e4Continue!.node)
    expect(d4.mainChild).toBeNull() // variations don't have main children
    expect(nf3.mainChild).toBeNull() // variations don't have main children
  })
})
