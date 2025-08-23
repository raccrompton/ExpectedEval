import { useRouter } from 'next/router'
import { useState, useCallback, useEffect, useMemo } from 'react'

import { useStats } from '../useStats'
import { Color } from 'src/types'
import { TuringGame } from 'src/types/turing'
import { useTreeController } from '../useTreeController'
import {
  fetchTuringGame,
  fetchTuringPlayerStats,
  submitTuringGuess,
} from 'src/api'

const statsLoader = async () => {
  const stats = await fetchTuringPlayerStats()
  return {
    gamesPlayed: stats.correctGuesses + stats.wrongGuesses,
    gamesWon: stats.correctGuesses,
    rating: stats.rating,
  }
}

export const useTuringController = () => {
  const router = useRouter()
  const [turingGames, setTuringGames] = useState<{ [id: string]: TuringGame }>(
    {},
  )

  const [loading, setLoading] = useState(false)
  const [currentGameId, setCurrentGameId] = useState<string>('')
  const [stats, incrementStats, updateRating] = useStats(statsLoader)

  const getNewGame = useCallback(async () => {
    setLoading(true)
    let game
    try {
      game = await fetchTuringGame()
    } catch (e) {
      router.push('/401')
      return
    }

    setLoading(false)
    setTuringGames({ ...turingGames, [game.id]: game })
    setCurrentGameId(game.id)
  }, [turingGames, router])

  useEffect(() => {
    if (Object.keys(turingGames).length === 0) getNewGame()
  }, [getNewGame, turingGames])

  const game = useMemo(
    () => turingGames[currentGameId ?? ''],
    [turingGames, currentGameId],
  )

  const controller = useTreeController(game?.tree, 'white')

  useEffect(() => {
    if (controller.tree && game) {
      const mainLine = controller.tree.getMainLine()
      controller.setCurrentNode(mainLine[0])
    }
  }, [game])

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

  return {
    gameTree: controller.tree,
    currentNode: controller.currentNode,
    setCurrentNode: controller.setCurrentNode,
    goToNode: controller.goToNode,
    goToNextNode: controller.goToNextNode,
    goToPreviousNode: controller.goToPreviousNode,
    goToRootNode: controller.goToRootNode,
    plyCount: controller.plyCount,
    orientation: controller.orientation,
    setOrientation: controller.setOrientation,

    game: game as TuringGame | undefined,
    games: turingGames,
    getNewGame,
    loading,
    gameIds,
    currentGameId,
    setCurrentGameId,
    submitGuess,
    commentController,
    stats,
  }
}
