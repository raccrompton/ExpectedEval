import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Chess, PieceSymbol } from 'chess.ts'
import { getGameMove } from 'src/api/play/play'
import { useTreeController } from '../useTreeController'
import { GameTree, GameNode } from 'src/types'
import { OpeningSelection, OpeningDrillGame } from 'src/types/openings'

export const useOpeningDrillController = (selections: OpeningSelection[]) => {
  const [currentSelectionIndex, setCurrentSelectionIndex] = useState(0)
  const [drillGames, setDrillGames] = useState<{
    [key: string]: OpeningDrillGame
  }>({})
  const [analysisEnabled, setAnalysisEnabled] = useState(false)

  const currentSelection = selections[currentSelectionIndex]

  // Initialize drill games from selections
  useEffect(() => {
    const games: { [key: string]: OpeningDrillGame } = {}
    selections.forEach((selection) => {
      const startingFen = selection.variation
        ? selection.variation.fen
        : selection.opening.fen
      const gameTree = new GameTree(startingFen)

      games[selection.id] = {
        id: selection.id,
        selection,
        moves: [],
        tree: gameTree,
        currentFen: startingFen,
        toPlay: new Chess(startingFen).turn() === 'w' ? 'white' : 'black',
      }
    })
    setDrillGames(games)
  }, [selections])

  const currentDrillGame = drillGames[currentSelection?.id]
  const controller = useTreeController(
    currentDrillGame?.tree || new GameTree(new Chess().fen()),
    currentSelection?.playerColor || 'white',
  )

  // Set board orientation based on player color
  useEffect(() => {
    if (currentSelection?.playerColor) {
      controller.setOrientation(currentSelection.playerColor)
    }
  }, [currentSelection?.playerColor, controller])

  // Sync controller when switching selections
  useEffect(() => {
    if (currentDrillGame?.tree && currentDrillGame.moves.length === 0) {
      // Only reset to root if no moves have been made
      controller.setCurrentNode(currentDrillGame.tree.getRoot())
    } else if (currentDrillGame?.tree && currentDrillGame.moves.length > 0) {
      // Navigate to the last move if moves exist
      const mainLine = currentDrillGame.tree.getMainLine()
      const targetNode = mainLine[currentDrillGame.moves.length] // moves.length is 0-based, but mainLine includes root at index 0
      if (targetNode) {
        controller.setCurrentNode(targetNode)
      }
    }
  }, [currentSelectionIndex, controller])

  // Determine if it's the player's turn
  const isPlayerTurn = useMemo(() => {
    if (!currentDrillGame) return true
    const chess = new Chess(
      controller.currentNode?.fen || currentDrillGame.currentFen,
    )
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

        if (!moveObj) return

        let newNode: GameNode | null = null

        // Check if this move already exists as a child
        const existingChild = nodeToMoveFrom.children.find(
          (child: GameNode) => child.move === moveUci,
        )

        if (existingChild) {
          // Move already exists, just navigate to it
          newNode = existingChild
        } else {
          // Create new move - add to main line if we're on main line, otherwise create variation
          if (
            nodeToMoveFrom.mainChild &&
            nodeToMoveFrom === controller.currentNode
          ) {
            // We're on the main line and there's already a main child - create variation
            newNode = currentDrillGame.tree.addVariation(
              nodeToMoveFrom,
              chess.fen(),
              moveUci,
              moveObj.san,
              currentSelection.maiaVersion,
            )
          } else {
            // Add to main line
            newNode = currentDrillGame.tree.addMoveToMainLine(moveUci)
          }
        }

        if (newNode) {
          // Update the drill game state first
          const updatedGame = {
            ...currentDrillGame,
            moves: [...currentDrillGame.moves, moveUci],
            currentFen: newNode.fen,
          }

          setDrillGames((prev) => ({
            ...prev,
            [currentSelection.id]: updatedGame,
          }))

          // Then update the controller to the new node
          controller.setCurrentNode(newNode)

          // Get Maia's response after a short delay if it's now Maia's turn
          const newChess = new Chess(newNode.fen)
          const newTurn = newChess.turn() === 'w' ? 'white' : 'black'

          if (newTurn !== currentSelection.playerColor) {
            setTimeout(async () => {
              await makeMaiaMoveRef.current(newNode)
            }, 800)
          }
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
            // Create new move - add to main line if we're on main line, otherwise create variation
            if (fromNode.mainChild) {
              // There's already a main child - create variation
              const chess = new Chess(fromNode.fen)
              const moveObj = chess.move(maiaMove, { sloppy: true })

              if (moveObj) {
                newNode = currentDrillGame.tree.addVariation(
                  fromNode,
                  chess.fen(),
                  maiaMove,
                  moveObj.san,
                  currentSelection.maiaVersion,
                )
              }
            } else {
              // Add to main line
              newNode = currentDrillGame.tree.addMoveToMainLine(maiaMove)
            }
          }

          if (newNode) {
            // Update the drill game state first
            const updatedGame = {
              ...currentDrillGame,
              moves: [...currentDrillGame.moves, maiaMove],
              currentFen: newNode.fen,
            }

            setDrillGames((prev) => ({
              ...prev,
              [currentSelection.id]: updatedGame,
            }))

            // Then update the controller to the new node
            controller.setCurrentNode(newNode)
          }
        }
      } catch (error) {
        console.error('Error making Maia move:', error)
      }
    },
    [currentDrillGame, controller, currentSelection],
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
      currentDrillGame.moves.length === 0
    ) {
      // It's Maia's turn to move first
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

  // Note: Analyzed game conversion moved to OpeningDrillAnalysis component for real-time updates

  // Reset current game to starting position
  const resetCurrentGame = useCallback(() => {
    if (!currentSelection) return

    const startingFen = currentSelection.variation
      ? currentSelection.variation.fen
      : currentSelection.opening.fen
    const gameTree = new GameTree(startingFen)

    const resetGame: OpeningDrillGame = {
      id: currentSelection.id,
      selection: currentSelection,
      moves: [],
      tree: gameTree,
      currentFen: startingFen,
      toPlay: new Chess(startingFen).turn() === 'w' ? 'white' : 'black',
    }

    setDrillGames((prev) => ({
      ...prev,
      [currentSelection.id]: resetGame,
    }))

    controller.setCurrentNode(gameTree.getRoot())
  }, [currentSelection, controller])

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

    // Analysis
    analysisEnabled,
    setAnalysisEnabled,
  }
}
