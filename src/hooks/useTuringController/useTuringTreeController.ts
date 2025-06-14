import { useRouter } from 'next/router'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { Chess } from 'chess.ts'

import { Color, GameTree, GameNode } from 'src/types'
import { useStats } from '../useStats'
import { TuringGame } from 'src/types/turing'
import { getTuringGame, getTuringPlayerStats, submitTuringGuess } from 'src/api'

const statsLoader = async () => {
  const stats = await getTuringPlayerStats()
  return {
    gamesPlayed: stats.correctGuesses + stats.wrongGuesses,
    gamesWon: stats.correctGuesses,
    rating: stats.rating,
  }
}

const buildTuringGameTree = (game: TuringGame): GameTree => {
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
    // Generate UCI from lastMove if not present
    const uci = move.uci || (move.lastMove ? move.lastMove.join('') : undefined)
    if (uci && move.san) {
      currentNode = tree.addMainMove(currentNode, move.board, uci, move.san)
    }
  }

  return tree
}

export const useTuringTreeController = () => {
  const router = useRouter()
  const [turingGames, setTuringGames] = useState<{ [id: string]: TuringGame }>(
    {},
  )

  const [currentId, setCurrentId] = useState<null | string>(null)
  const [loading, setLoading] = useState(false)
  const [stats, incrementStats, updateRating] = useStats(statsLoader)

  // Tree navigation state
  const [currentNode, setCurrentNode] = useState<GameNode | undefined>()
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')

  const getNewGame = useCallback(async () => {
    setLoading(true)
    let game
    try {
      game = await getTuringGame()
    } catch (e) {
      router.push('/401')
      return
    }

    setLoading(false)
    setTuringGames({ ...turingGames, [game.id]: game })
    setCurrentId(game.id)
  }, [turingGames, router])

  useEffect(() => {
    if (Object.keys(turingGames).length === 0) getNewGame()
  }, [getNewGame, turingGames])

  const game = useMemo(
    () => turingGames[currentId ?? ''],
    [turingGames, currentId],
  )

  // Build game tree when game changes
  const gameTree = useMemo(() => {
    if (!game) return new GameTree(new Chess().fen())
    return buildTuringGameTree(game)
  }, [game])

  // Initialize current node to the end of the game
  useEffect(() => {
    if (gameTree) {
      const mainLine = gameTree.getMainLine()
      setCurrentNode(mainLine[mainLine.length - 1])
    }
  }, [gameTree])

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
    (index: number) => {
      const mainLine = gameTree.getMainLine()
      if (index >= 0 && index < mainLine.length) {
        setCurrentNode(mainLine[index])
      }
    },
    [gameTree],
  )

  const plyCount = useMemo(() => gameTree.getMainLine().length, [gameTree])

  const gameIds = useMemo(() => Object.keys(turingGames), [turingGames])

  const submitGuess = useCallback(
    async (guess: Color, comment = '', rating?: number) => {
      if (game && !game.result) {
        const result = await submitTuringGuess(game.id, guess, comment)
        setTuringGames({
          ...turingGames,
          [game.id]: {
            ...game,
            result: { ...result, ratingDiff: result.turingElo - (rating || 0) },
          },
        })
        commentController[1]('')

        updateRating(result.turingElo)
        incrementStats(1, result.correct ? 1 : 0)
      }
    },
    [game, incrementStats, turingGames, updateRating],
  )

  const commentController = useState('')

  // Legacy controller interface for backward compatibility
  const controller = {
    plyCount,
    currentIndex,
    setCurrentIndex,
    orientation,
    setOrientation,
  }

  return {
    // Legacy interface
    game: game as TuringGame | undefined,
    games: turingGames,
    getNewGame,
    loading,
    gameIds,
    setCurrentId,
    submitGuess,
    commentController,
    stats,
    controller,

    // New tree interface
    gameTree,
    currentNode,
    goToNode,
    goToNextNode,
    goToPreviousNode,
    goToRootNode,
    currentIndex,
    setCurrentIndex,
    plyCount,
    orientation,
    setOrientation,
  }
}
