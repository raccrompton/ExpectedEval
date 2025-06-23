import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Chess, PieceSymbol } from 'chess.ts'
import { getGameMove } from 'src/api/play/play'
import { useTreeController } from '../useTreeController'
import { GameTree, GameNode, AnalyzedGame } from 'src/types'
import { OpeningSelection, OpeningDrillGame } from 'src/types/openings'

const convertOpeningToAnalyzedGame = (
  drillGame: OpeningDrillGame,
): AnalyzedGame => {
  const selection = drillGame.selection

  // Convert string moves to Move objects for the analyzed game
  const gameTree = drillGame.tree
  const mainLine = gameTree.getMainLine()
  const moves = mainLine.slice(1).map((node) => ({
    board: node.fen,
    lastMove: node.move
      ? ([node.move.slice(0, 2), node.move.slice(2, 4)] as [string, string])
      : undefined,
    san: node.san || '',
    uci: node.move || '',
  }))

  // Create analyzed game structure with proper opening position
  return {
    id: drillGame.id,
    blackPlayer: {
      name:
        selection.playerColor === 'black'
          ? 'You'
          : selection.maiaVersion.replace('maia_kdd_', 'Maia '),
      rating:
        selection.playerColor === 'black'
          ? undefined
          : parseInt(selection.maiaVersion.slice(-4)),
    },
    whitePlayer: {
      name:
        selection.playerColor === 'white'
          ? 'You'
          : selection.maiaVersion.replace('maia_kdd_', 'Maia '),
      rating:
        selection.playerColor === 'white'
          ? undefined
          : parseInt(selection.maiaVersion.slice(-4)),
    },
    moves,
    availableMoves: moves.map(() => ({})), // Empty available moves for each position
    gameType: 'play' as const,
    termination: {
      result: '*',
      winner: 'none',
      condition: 'Normal',
    },
    maiaEvaluations: moves.map(() => ({})), // Empty evaluations for each position
    stockfishEvaluations: moves.map(() => undefined), // Empty evaluations for each position
    tree: drillGame.tree,
    type: 'play' as const,
  }
}

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

  // Make a move for the player
  const makePlayerMove = useCallback(
    async (moveUci: string) => {
      if (!currentDrillGame || !controller.currentNode || !isPlayerTurn) return

      try {
        // Validate the move first
        const chess = new Chess(controller.currentNode.fen)
        const moveObj = chess.move(moveUci, { sloppy: true })

        if (!moveObj) return

        // Add the move to the game tree
        const newNode = currentDrillGame.tree.addMoveToMainLine(moveUci)
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

          // Get Maia's response after a short delay
          setTimeout(async () => {
            await makeMaiaMoveRef.current(newNode)
          }, 800)
        }
      } catch (error) {
        console.error('Error making player move:', error)
      }
    },
    [currentDrillGame, controller, currentSelection, isPlayerTurn],
  )

  // Make a move for Maia
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
          const newNode = currentDrillGame.tree.addMoveToMainLine(maiaMove)
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

  // Convert current drill game to analyzed game for analysis integration
  const analyzedGame = useMemo(() => {
    if (!currentDrillGame) return null
    return convertOpeningToAnalyzedGame(currentDrillGame)
  }, [currentDrillGame])

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
    analyzedGame,

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
