import { useCallback, useEffect, useState } from 'react'

export interface ApiResult {
  rating: number
  gamesPlayed: number
  gamesWon: number
}

export interface SingleStats {
  gamesPlayed: number
  gamesWon: number
}

export interface AllStats {
  lastRating: number | undefined
  rating: number | undefined
  sessionStats: SingleStats
  lifetimeStats: SingleStats | undefined
}

type IncrementStatsFunction = (gamesPlayed: number, gamesWon: number) => void

export const useStats = (
  apiCall: () => Promise<ApiResult>,
): [AllStats, IncrementStatsFunction, () => void] => {
  const [statsInvalidated, setStatsInvalidated] = useState<boolean>(true)
  const [statsLoading, setStatsLoading] = useState<boolean>(false)

  const [lastRating, setLastRating] = useState<number | undefined>(undefined)
  const [rating, setRating] = useState<number | undefined>(undefined)
  const [gamesPlayed, setGamesPlayed] = useState<number | undefined>(undefined)
  const [gamesWon, setGamesWon] = useState<number | undefined>(undefined)

  const [sessionGamesPlayed, setSessionGamesPlayed] = useState<number>(0)
  const [sessionGamesWon, setSessionGamesWon] = useState<number>(0)

  const [unloadedGamesPlayed, setUnloadedGamesPlayed] = useState<number>(0)
  const [unloadedGamesWon, setUnloadedGamesWon] = useState<number>(0)

  const stats: AllStats = {
    lastRating: statsInvalidated ? rating : lastRating,
    rating: statsInvalidated ? undefined : rating,
    sessionStats: {
      gamesPlayed: sessionGamesPlayed,
      gamesWon: sessionGamesWon,
    },
    lifetimeStats:
      gamesPlayed === undefined || gamesWon === undefined
        ? undefined
        : {
            gamesPlayed: gamesPlayed + unloadedGamesPlayed,
            gamesWon: gamesWon + unloadedGamesWon,
          },
  }

  useEffect(() => {
    if (statsInvalidated && !statsLoading) {
      const statsLoader = async () => {
        const loadedStats = await apiCall()

        setLastRating(rating)
        setRating(loadedStats.rating)

        setGamesPlayed(loadedStats.gamesPlayed)
        setGamesWon(loadedStats.gamesWon)

        setUnloadedGamesPlayed(0)
        setUnloadedGamesWon(0)

        setStatsInvalidated(false)
        setStatsLoading(false)
      }

      statsLoader()
      setStatsLoading(true)
    }
  }, [apiCall, gamesPlayed, gamesWon, rating, statsInvalidated, statsLoading])

  const incrementStats: IncrementStatsFunction = useCallback(
    (gamesPlayed: number, gamesWon: number) => {
      setSessionGamesPlayed(
        (sessionGamesPlayed) => sessionGamesPlayed + gamesPlayed,
      )
      setSessionGamesWon((sessionGamesWon) => sessionGamesWon + gamesWon)
      setUnloadedGamesPlayed(gamesPlayed)
      setUnloadedGamesWon(gamesWon)
      setStatsInvalidated(true)
    },
    // This needs to not have any dependencies to avoid extra games being added
    [],
  )

  const resetLastRating = useCallback(() => {
    setLastRating(undefined)
  }, [])

  return [stats, incrementStats, resetLastRating]
}
