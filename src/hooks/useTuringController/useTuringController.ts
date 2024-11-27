import { useRouter } from 'next/router'
import { useState, useCallback, useEffect, useMemo } from 'react'

import { Color } from 'src/types'
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

export const useTuringController = () => {
  const router = useRouter()
  const [turingGames, setTuringGames] = useState<{ [id: string]: TuringGame }>(
    {},
  )

  const [currentId, setCurrentId] = useState<null | string>(null)
  const [loading, setLoading] = useState(false)
  const [stats, incrementStats, resetLastRating] = useStats(statsLoader)

  const getNewGame = useCallback(async () => {
    setLoading(true)
    let game
    try {
      game = await getTuringGame()
    } catch (e) {
      router.push('/401')
      return
    }

    resetLastRating()
    setLoading(false)
    setTuringGames({ ...turingGames, [game.id]: game })
    setCurrentId(game.id)
  }, [turingGames, router, resetLastRating])

  useEffect(() => {
    if (Object.keys(turingGames).length === 0) getNewGame()
  }, [getNewGame, turingGames])

  const game = useMemo(
    () => turingGames[currentId ?? ''],
    [turingGames, currentId],
  )

  const gameIds = useMemo(() => Object.keys(turingGames), [turingGames])

  const submitGuess = useCallback(
    async (guess: Color, comment = '') => {
      if (game && !game.result) {
        const result = await submitTuringGuess(game.id, guess, comment)
        setTuringGames({
          ...turingGames,
          [game.id]: { ...game, result },
        })
        commentController[1]('')
        // to avoid race conditions on the server, sleep
        await new Promise((r) => setTimeout(r, 500))
        incrementStats(1, result.correct ? 1 : 0)
      }
    },
    [game, incrementStats, turingGames],
  )

  const commentController = useState('')

  return {
    game: game as TuringGame | undefined,
    games: turingGames,
    getNewGame,
    loading,
    gameIds,
    setCurrentId,
    submitGuess,
    commentController,
    stats,
  }
}
