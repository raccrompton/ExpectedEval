import { GameTree, GameNode } from 'src/types/base/tree'
import { Chess } from 'chess.ts'

describe('GameTree FEN Position Move Handling', () => {
  describe('Making moves from custom FEN position', () => {
    it('should create main line move when making first move from FEN position', () => {
      // Custom FEN position - middle game position
      const customFen =
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4'
      const tree = new GameTree(customFen)
      const rootNode = tree.getRoot()

      // Verify initial state - should have only root node
      expect(rootNode.fen).toBe(customFen)
      expect(rootNode.mainChild).toBeNull()
      expect(rootNode.children.length).toBe(0)

      // Make a move from the position
      const chess = new Chess(customFen)
      const moveResult = chess.move('Ng5') // A valid move from this position
      expect(moveResult).toBeTruthy()

      const newFen = chess.fen()
      const moveUci = 'f3g5'
      const san = 'Ng5'

      // The first move should create a main line move, not a variation
      const newNode = tree.addMainMove(rootNode, newFen, moveUci, san)

      // Verify the move was added as main line
      expect(rootNode.mainChild).toBe(newNode)
      expect(newNode.isMainline).toBe(true)
      expect(newNode.move).toBe(moveUci)
      expect(newNode.san).toBe(san)
      expect(newNode.fen).toBe(newFen)

      // Verify main line structure
      const mainLine = tree.getMainLine()
      expect(mainLine.length).toBe(2) // root + one move
      expect(mainLine[0]).toBe(rootNode)
      expect(mainLine[1]).toBe(newNode)
    })

    it('should create variations when making alternative moves from FEN position', () => {
      const customFen =
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4'
      const tree = new GameTree(customFen)
      const rootNode = tree.getRoot()

      // First move - should be main line
      const chess1 = new Chess(customFen)
      const move1 = chess1.move('Ng5')
      expect(move1).toBeTruthy()
      const mainNode = tree.addMainMove(
        rootNode,
        chess1.fen(),
        'f3g5',
        move1!.san,
      )

      // Second alternative move from same position - should be variation
      const chess2 = new Chess(customFen)
      const move2 = chess2.move('Nxe5')
      expect(move2).toBeTruthy()
      const variationNode = tree.addVariation(
        rootNode,
        chess2.fen(),
        'f3e5',
        move2!.san,
      )

      // Verify structure
      expect(rootNode.mainChild).toBe(mainNode)
      expect(rootNode.children.length).toBe(2)
      expect(rootNode.getVariations()).toContain(variationNode)
      expect(variationNode.isMainline).toBe(false)

      // Main line should still be just root + main move
      const mainLine = tree.getMainLine()
      expect(mainLine.length).toBe(2)
      expect(mainLine[1]).toBe(mainNode)
    })

    it('should handle multiple moves extending main line from FEN', () => {
      const customFen =
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4'
      const tree = new GameTree(customFen)
      const rootNode = tree.getRoot()

      // Add first main line move
      const chess1 = new Chess(customFen)
      const move1 = chess1.move('Ng5')
      expect(move1).toBeTruthy()
      const node1 = tree.addMainMove(rootNode, chess1.fen(), 'f3g5', move1!.san)

      // Add second main line move
      const move2 = chess1.move('d6')
      expect(move2).toBeTruthy()
      const node2 = tree.addMainMove(node1, chess1.fen(), 'd7d6', move2!.san)

      // Verify main line structure
      const mainLine = tree.getMainLine()
      expect(mainLine.length).toBe(3) // root + two moves
      expect(mainLine[0]).toBe(rootNode)
      expect(mainLine[1]).toBe(node1)
      expect(mainLine[2]).toBe(node2)

      // Verify parent-child relationships
      expect(rootNode.mainChild).toBe(node1)
      expect(node1.mainChild).toBe(node2)
      expect(node2.mainChild).toBeNull()
    })
  })

  describe('FEN position detection', () => {
    it('should properly detect custom FEN vs starting position', () => {
      const startingFen =
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      const customFen =
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4'

      const startingTree = new GameTree(startingFen)
      const customTree = new GameTree(customFen)

      // Starting position should not have FEN header
      expect(startingTree.getHeader('FEN')).toBeUndefined()
      expect(startingTree.getHeader('SetUp')).toBeUndefined()

      // Custom FEN should have headers
      expect(customTree.getHeader('FEN')).toBe(customFen)
      expect(customTree.getHeader('SetUp')).toBe('1')
    })
  })
})
