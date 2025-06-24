import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Chess, PieceSymbol } from 'chess.ts'
import { getGameMove } from 'src/api/play/play'
import { useTreeController } from '../useTreeController'
import { useChessSound } from '../useChessSound'
import { GameTree, GameNode } from 'src/types'
import { OpeningSelection, OpeningDrillGame } from 'src/types/openings'

// Helper function to parse PGN and create moves in the tree
const parsePgnToTree = (pgn: string, gameTree: GameTree): GameNode | null => {
  if (!pgn || pgn.trim() === '') return gameTree.getRoot()

  const chess = new Chess()
  let currentNode = gameTree.getRoot()

  // Remove move numbers and extra spaces, split by spaces
  const moveText = pgn.replace(/\d+\./g, '').trim()
  const moves = moveText.split(/\s+/).filter((move) => move && move !== '')

  for (const moveStr of moves) {
    try {
      const moveObj = chess.move(moveStr)
      if (!moveObj) break

      const moveUci = moveObj.from + moveObj.to + (moveObj.promotion || '')

      // Check if this move already exists as a child
      const existingChild = currentNode.children.find(
        (child: GameNode) => child.move === moveUci,
      )

      if (existingChild) {
        currentNode = existingChild
      } else {
        // Add move as main child
        const newNode = gameTree.addMainMove(
          currentNode,
          chess.fen(),
          moveUci,
          moveObj.san,
        )
        if (newNode) {
          currentNode = newNode
        } else {
          break
        }
      }
    } catch (error) {
      console.error('Error parsing move:', moveStr, error)
      break
    }
  }

  return currentNode
}

export const useOpeningDrillController = (selections: OpeningSelection[]) => {
  const [currentSelectionIndex, setCurrentSelectionIndex] = useState(0)
  const [drillGames, setDrillGames] = useState<{
    [key: string]: OpeningDrillGame
  }>({})
  const [analysisEnabled, setAnalysisEnabled] = useState(false)

  const currentSelection = selections[currentSelectionIndex]

  // Add chess sound hook
  const { playSound } = useChessSound()

  // Initialize drill games from selections
  useEffect(() => {
    const games: { [key: string]: OpeningDrillGame } = {}
    selections.forEach((selection) => {
      const startingFen =
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' // Always start from initial position
      const gameTree = new GameTree(startingFen)

      // Parse the PGN to populate the tree with opening moves
      const pgn = selection.variation
        ? selection.variation.pgn
        : selection.opening.pgn
      const endNode = parsePgnToTree(pgn, gameTree)

      games[selection.id] = {
        id: selection.id,
        selection,
        moves: [], // Track only the moves made during drilling, not the opening moves
        tree: gameTree,
        currentFen: endNode?.fen || startingFen,
        toPlay: endNode
          ? new Chess(endNode.fen).turn() === 'w'
            ? 'white'
            : 'black'
          : 'white',
        openingEndNode: endNode, // Store where the opening ends
      }
    })
    setDrillGames(games)
  }, [selections])

  const currentDrillGame = drillGames[currentSelection?.id]

  // Use the current drill game's tree, or create a default one
  const gameTree = currentDrillGame?.tree || new GameTree(new Chess().fen())
  const controller = useTreeController(
    gameTree,
    currentSelection?.playerColor || 'white',
  )

  // Sync the controller's current node with the drill game state
  useEffect(() => {
    // Only sync when switching to a different game or when no moves have been made yet
    // Don't sync during active gameplay as it would reset the current position
    if (currentDrillGame && currentDrillGame.moves.length === 0) {
      if (currentDrillGame.openingEndNode) {
        // Navigate to the end of the opening moves
        controller.setCurrentNode(currentDrillGame.openingEndNode)
      } else if (currentDrillGame.tree) {
        // Navigate to root if no opening end node
        controller.setCurrentNode(currentDrillGame.tree.getRoot())
      }
    }
  }, [currentDrillGame?.id, controller]) // Only depend on the drill game ID to avoid infinite loops

  // Set board orientation based on player color
  useEffect(() => {
    if (currentSelection?.playerColor) {
      controller.setOrientation(currentSelection.playerColor)
    }
  }, [currentSelection?.playerColor, controller])

  // Determine if it's the player's turn
  const isPlayerTurn = useMemo(() => {
    if (!currentDrillGame || !controller.currentNode) return true
    const chess = new Chess(controller.currentNode.fen)
    const currentTurn = chess.turn() === 'w' ? 'white' : 'black'
    return currentTurn === currentSelection.playerColor
  }, [currentDrillGame, controller.currentNode, currentSelection?.playerColor])

  // Available moves for the current position
  const moves = useMemo(() => {
    if (!controller.currentNode) return new Map<string, string[]>()

    const moveMap = new Map<string, string[]>()
    const chess = new Chess(controller.currentNode.fen)
    const legalMoves = chess.moves({ verbose: true })

    legalMoves.forEach((move) => {
      const { from, to } = move
      moveMap.set(from, (moveMap.get(from) ?? []).concat([to]))
    })

    return moveMap
  }, [controller.currentNode])

  // Make a move for the player - enhanced to support variations
  const makePlayerMove = useCallback(
    async (moveUci: string, fromNode?: GameNode) => {
      if (!currentDrillGame || !controller.currentNode || !isPlayerTurn) return

      try {
        const nodeToMoveFrom = fromNode || controller.currentNode

        // Validate the move first
        const chess = new Chess(nodeToMoveFrom.fen)
        const moveObj = chess.move(moveUci, { sloppy: true })

        if (!moveObj) {
          console.log('Invalid move:', moveUci)
          return
        }

        let newNode: GameNode | null = null

        // Check if this move already exists as a child
        const existingChild = nodeToMoveFrom.children.find(
          (child: GameNode) => child.move === moveUci,
        )

        if (existingChild) {
          // Move already exists, just navigate to it
          newNode = existingChild
        } else {
          // Create new move - determine if we should add to main line or create variation
          // We create a variation only if:
          // 1. We're making a move from a position that's NOT the current position (i.e., we went back to an earlier position)
          // 2. AND there's already a main child from that position
          // 3. AND we're making a different move than the existing main child
          const isGoingBackToEarlierPosition =
            nodeToMoveFrom !== controller.currentNode
          const hasExistingMainChild = !!nodeToMoveFrom.mainChild
          const isDifferentFromMainChild =
            nodeToMoveFrom.mainChild?.move !== moveUci

          if (
            isGoingBackToEarlierPosition &&
            hasExistingMainChild &&
            isDifferentFromMainChild
          ) {
            // We went back to an earlier position and are making a different move than what's already there - create variation

            newNode = controller.gameTree.addVariation(
              nodeToMoveFrom,
              chess.fen(),
              moveUci,
              moveObj.san,
              currentSelection.maiaVersion,
            )
          } else {
            // Continue the main line (this is the normal case for sequential moves)

            newNode = controller.gameTree.addMainMove(
              nodeToMoveFrom,
              chess.fen(),
              moveUci,
              moveObj.san,
            )
          }
        }

        if (newNode) {
          // Update the controller to the new node immediately
          controller.setCurrentNode(newNode)

          // Update the drill game state
          const updatedGame = {
            ...currentDrillGame,
            moves: [...currentDrillGame.moves, moveUci],
            currentFen: newNode.fen,
          }

          setDrillGames((prev) => ({
            ...prev,
            [currentSelection.id]: updatedGame,
          }))

          // Get Maia's response after a short delay if it's now Maia's turn
          const newChess = new Chess(newNode.fen)
          const newTurn = newChess.turn() === 'w' ? 'white' : 'black'

          if (newTurn !== currentSelection.playerColor) {
            setTimeout(async () => {
              await makeMaiaMoveRef.current(newNode)
            }, 800)
          }
        } else {
          console.log('Failed to create new node')
        }
      } catch (error) {
        console.error('Error making player move:', error)
      }
    },
    [currentDrillGame, controller, currentSelection, isPlayerTurn],
  )

  // Make a move for Maia - enhanced to support variations
  const makeMaiaMove = useCallback(
    async (fromNode: GameNode) => {
      if (!currentDrillGame) return

      try {
        const response = await getGameMove(
          [],
          currentSelection.maiaVersion,
          fromNode.fen,
          null,
          0,
          0,
        )

        const maiaMove = response.top_move
        if (maiaMove) {
          let newNode: GameNode | null = null

          // Check if this move already exists as a child
          const existingChild = fromNode.children.find(
            (child: GameNode) => child.move === maiaMove,
          )

          if (existingChild) {
            // Move already exists, just navigate to it
            newNode = existingChild
          } else {
            // Create new move - determine if we should add to main line or create variation
            // For Maia moves, we typically continue the main line unless we're in a variation
            if (fromNode.mainChild && fromNode !== controller.currentNode) {
              // We're making a move from a position that's not current and already has a main child - create variation
              const chess = new Chess(fromNode.fen)
              const moveObj = chess.move(maiaMove, { sloppy: true })

              if (moveObj) {
                newNode = controller.gameTree.addVariation(
                  fromNode,
                  chess.fen(),
                  maiaMove,
                  moveObj.san,
                  currentSelection.maiaVersion,
                )
              }
            } else {
              // Continue the main line (normal case)
              const chess = new Chess(fromNode.fen)
              const moveObj = chess.move(maiaMove, { sloppy: true })

              if (moveObj) {
                newNode = controller.gameTree.addMainMove(
                  fromNode,
                  chess.fen(),
                  maiaMove,
                  moveObj.san,
                )
              }
            }
          }

          if (newNode) {
            // Check if this was a capture move for sound effect
            const chess = new Chess(fromNode.fen)
            const pieceAtDestination = chess.get(maiaMove.slice(2, 4))
            const isCapture = !!pieceAtDestination

            // Play sound effect for Maia's move
            playSound(isCapture)

            // Update the controller to the new node immediately
            controller.setCurrentNode(newNode)

            // Update the drill game state (but keep the same tree reference)
            const updatedGame = {
              ...currentDrillGame,
              moves: [...currentDrillGame.moves, maiaMove],
              currentFen: newNode.fen,
              // Don't update the tree reference - keep the same one
            }

            setDrillGames((prev) => ({
              ...prev,
              [currentSelection.id]: updatedGame,
            }))
          }
        }
      } catch (error) {
        console.error('Error making Maia move:', error)
      }
    },
    [currentDrillGame, controller, currentSelection, playSound],
  )

  // Store makeMaiaMove in a ref to avoid circular dependencies
  const makeMaiaMoveRef = useRef(makeMaiaMove)
  makeMaiaMoveRef.current = makeMaiaMove

  // Handle initial Maia move if needed
  useEffect(() => {
    if (
      currentDrillGame &&
      controller.currentNode &&
      !isPlayerTurn &&
      currentDrillGame.moves.length === 0 && // Only for initial position after opening
      currentDrillGame.openingEndNode && // Only if we have an opening end node
      controller.currentNode === currentDrillGame.openingEndNode // Only if we're at the opening end position
    ) {
      // It's Maia's turn to move first from the opening position
      setTimeout(() => {
        makeMaiaMoveRef.current(controller.currentNode)
      }, 1000)
    }
  }, [currentDrillGame, controller.currentNode, isPlayerTurn])

  // Switch to a different opening selection
  const switchToSelection = useCallback(
    (index: number) => {
      if (index >= 0 && index < selections.length) {
        setCurrentSelectionIndex(index)
      }
    },
    [selections.length],
  )

  // Reset current game to starting position
  const resetCurrentGame = useCallback(() => {
    if (!currentSelection) return

    const startingFen =
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' // Always start from initial position
    const gameTree = new GameTree(startingFen)

    // Parse the PGN to populate the tree with opening moves
    const pgn = currentSelection.variation
      ? currentSelection.variation.pgn
      : currentSelection.opening.pgn
    const endNode = parsePgnToTree(pgn, gameTree)

    const resetGame: OpeningDrillGame = {
      id: currentSelection.id,
      selection: currentSelection,
      moves: [],
      tree: gameTree,
      currentFen: endNode?.fen || startingFen,
      toPlay: endNode
        ? new Chess(endNode.fen).turn() === 'w'
          ? 'white'
          : 'black'
        : 'white',
      openingEndNode: endNode,
    }

    // Update the drill games state
    setDrillGames((prev) => ({
      ...prev,
      [currentSelection.id]: resetGame,
    }))

    // The useEffect will handle syncing the controller with the new tree
  }, [currentSelection])

  // Reset specific opening to starting position
  const resetOpening = useCallback(
    (selectionId: string) => {
      const selection = selections.find((s) => s.id === selectionId)
      if (!selection) return

      const startingFen =
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' // Always start from initial position
      const gameTree = new GameTree(startingFen)

      // Parse the PGN to populate the tree with opening moves
      const pgn = selection.variation
        ? selection.variation.pgn
        : selection.opening.pgn
      const endNode = parsePgnToTree(pgn, gameTree)

      const resetGame: OpeningDrillGame = {
        id: selection.id,
        selection: selection,
        moves: [],
        tree: gameTree,
        currentFen: endNode?.fen || startingFen,
        toPlay: endNode
          ? new Chess(endNode.fen).turn() === 'w'
            ? 'white'
            : 'black'
          : 'white',
        openingEndNode: endNode,
      }

      // Update the drill games state
      setDrillGames((prev) => ({
        ...prev,
        [selection.id]: resetGame,
      }))

      // If this is the current selection, sync the controller
      if (selection.id === currentSelection?.id) {
        // The useEffect will handle syncing the controller with the new tree
      }
    },
    [selections, currentSelection],
  )

  return {
    // Game state
    currentSelection,
    currentSelectionIndex,
    drillGames,
    currentDrillGame,
    isPlayerTurn,

    // Tree controller
    gameTree: controller.gameTree,
    currentNode: controller.currentNode,
    setCurrentNode: controller.setCurrentNode,
    goToNode: controller.goToNode,
    goToNextNode: controller.goToNextNode,
    goToPreviousNode: controller.goToPreviousNode,
    goToRootNode: controller.goToRootNode,
    plyCount: controller.plyCount,
    orientation: controller.orientation,
    setOrientation: controller.setOrientation,

    // Available moves
    moves,

    // Actions
    makePlayerMove,
    switchToSelection,
    resetCurrentGame,
    resetOpening,

    // Analysis
    analysisEnabled,
    setAnalysisEnabled,
  }
}
