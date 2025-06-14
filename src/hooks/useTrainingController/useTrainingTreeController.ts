import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  Dispatch,
  SetStateAction,
} from 'react'
import { Chess } from 'chess.ts'
import { TrainingGame } from 'src/types/training'
import { GameTree, GameNode } from 'src/types'
import { pseudoNL, normalizeEvaluation, normalize } from 'src/utils'

const buildTrainingGameTree = (game: TrainingGame): GameTree => {
  if (!game.moves || game.moves.length === 0) {
    return new GameTree(new Chess().fen())
  }

  // Start with the first position
  const initialFen = game.moves[0].board
  const tree = new GameTree(initialFen)
  let currentNode = tree.getRoot()

  // Build the tree from the moves array
  for (let i = 1; i < game.moves.length; i++) {
    const move = game.moves[i]
    if (move.uci && move.san) {
      currentNode = tree.addMainMove(
        currentNode,
        move.board,
        move.uci,
        move.san,
      )
    }
  }

  return tree
}

export const useTrainingTreeController = (game: TrainingGame) => {
  // Build the game tree from the training game moves
  const gameTree = useMemo(() => buildTrainingGameTree(game), [game])

  // Navigation state
  const [currentNode, setCurrentNode] = useState<GameNode | undefined>()
  const [orientation, setOrientation] = useState<'white' | 'black'>(
    game.targetIndex % 2 === 0 ? 'white' : 'black',
  )

  // Training-specific state
  const [currentSquare, setCurrentSquare] = useState<null | string>(null)
  const [currentMove, setCurrentMove] = useState<null | [string, string]>(null)

  // Initialize to target position
  useEffect(() => {
    const mainLine = gameTree.getMainLine()
    if (mainLine.length > game.targetIndex) {
      setCurrentNode(mainLine[game.targetIndex])
    } else {
      setCurrentNode(gameTree.getRoot())
    }
    setCurrentMove(null)
    setCurrentSquare(null)
  }, [game, gameTree])

  // Navigation helpers
  const goToNode = useCallback((node: GameNode) => setCurrentNode(node), [])
  const goToNextNode = useCallback(() => {
    if (currentNode?.mainChild) setCurrentNode(currentNode.mainChild)
  }, [currentNode])
  const goToPreviousNode = useCallback(() => {
    if (currentNode?.parent) setCurrentNode(currentNode.parent)
  }, [currentNode])
  const goToRootNode = useCallback(
    () => setCurrentNode(gameTree.getRoot()),
    [gameTree],
  )

  // Get current index in the main line
  const currentIndex = useMemo(() => {
    if (!currentNode) return 0
    const mainLine = gameTree.getMainLine()
    return mainLine.findIndex((node) => node === currentNode)
  }, [currentNode, gameTree])

  const setCurrentIndex = useCallback(
    (indexOrUpdater: number | ((prev: number) => number)) => {
      const mainLine = gameTree.getMainLine()
      const newIndex =
        typeof indexOrUpdater === 'function'
          ? indexOrUpdater(currentIndex)
          : indexOrUpdater
      if (newIndex >= 0 && newIndex < mainLine.length) {
        setCurrentNode(mainLine[newIndex])
      }
    },
    [gameTree, currentIndex],
  )

  const plyCount = useMemo(() => gameTree.getMainLine().length, [gameTree])

  // Training-specific data processing
  const data = useMemo(() => {
    const { maiaEvaluation, stockfishEvaluation, availableMoves } = game

    const stockfishValues = Object.values(stockfishEvaluation)
    const max = Math.max(...stockfishValues)
    const min = Math.min(...stockfishValues)
    Object.keys(stockfishEvaluation).forEach((move) => {
      stockfishEvaluation[move] = normalize(stockfishEvaluation[move], min, max)
    })

    const maiaValues = Object.values(maiaEvaluation)
    const maiaMax = Math.max(...maiaValues)
    const maiaMin = Math.min(...maiaValues)

    return Object.entries(stockfishEvaluation).map(([move, evaluation]) => {
      const ny = normalize(maiaEvaluation[move], maiaMin, maiaMax)
      const nx = normalize(
        pseudoNL(normalizeEvaluation(evaluation, 0, 1)) + 8,
        0,
        7.5,
      )
      return {
        id: `${nx}:${ny}`,
        data: [
          {
            ny,
            nx,
            x: pseudoNL(normalizeEvaluation(evaluation, 0, 1)),
            y: maiaEvaluation[move],
            san: availableMoves[move].san,
            move,
          },
        ],
      }
    })
  }, [game])

  // Available moves for the current position
  const moves = useMemo(() => {
    const moveMap = new Map<string, string[]>()
    const keys = Object.keys(game.availableMoves)
    keys.forEach((key) => {
      const [from, to] = [key.slice(0, 2), key.slice(2)]
      moveMap.set(from, (moveMap.get(from) ?? []).concat([to]))
    })
    return moveMap
  }, [game.availableMoves])

  // Move evaluation for the current selected move
  const moveEvaluation = useMemo(() => {
    if (!currentMove || currentIndex !== game.targetIndex) return null
    const { maiaEvaluation, stockfishEvaluation } = game
    const moveEval = {
      maia: maiaEvaluation[currentMove.join('')],
      stockfish: stockfishEvaluation[currentMove.join('')],
    }
    if (moveEval.maia === undefined || moveEval.stockfish === undefined)
      return null
    return moveEval
  }, [currentIndex, currentMove, game])

  // Current move details
  const move = useMemo(() => {
    if (currentMove && game.availableMoves[currentMove.join('')]) {
      const {
        board: fen,
        check,
        ...rest
      } = game.availableMoves[currentMove.join('')]
      return { move: currentMove, fen, check, ...rest }
    }
  }, [currentMove, game.availableMoves])

  const parseMove = useCallback(
    (moveToParse: string[]) => {
      if (moveToParse && game.availableMoves[moveToParse.join('')]) {
        const {
          board: fen,
          check,
          ...rest
        } = game.availableMoves[moveToParse.join('')]
        return { move: moveToParse as [string, string], fen, check, ...rest }
      }
    },
    [game.availableMoves],
  )

  // Legacy controller interface for backward compatibility
  const controller = {
    plyCount,
    currentIndex,
    setCurrentIndex: setCurrentIndex as Dispatch<SetStateAction<number>>,
    orientation,
    setOrientation,
  }

  // Return both new tree interface and legacy compatibility
  return {
    // Legacy interface for existing components
    move,
    moves: currentIndex === game.targetIndex ? moves : undefined,
    controller,
    plyCount,
    currentMove,
    parseMove,
    setCurrentMove,
    moveEvaluation,
    setCurrentSquare,
    currentSquare,
    data,

    // New tree interface
    gameTree,
    currentNode,
    goToNode,
    goToNextNode,
    goToPreviousNode,
    goToRootNode,
    currentIndex,
    setCurrentIndex,
    orientation,
    setOrientation,
  }
}
