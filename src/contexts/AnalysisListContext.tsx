import { useRouter } from 'next/router'
import { AuthContext } from 'src/contexts'
import React, { ReactNode, useContext, useEffect, useState } from 'react'
import { MaiaGameListEntry, WorldChampionshipGameListEntry } from 'src/types'
import {
  fetchWorldChampionshipGameList,
  streamLichessGames,
  fetchMaiaGameList,
} from 'src/api'

interface IAnalysisListContext {
  analysisTournamentList: Map<string, WorldChampionshipGameListEntry[]> | null
  analysisLichessList: MaiaGameListEntry[]
  analysisPlayList: MaiaGameListEntry[]
  analysisHandList: MaiaGameListEntry[]
  analysisBrainList: MaiaGameListEntry[]
}

export const AnalysisListContext = React.createContext<IAnalysisListContext>({
  analysisTournamentList: null,
  analysisLichessList: [],
  analysisPlayList: [],
  analysisHandList: [],
  analysisBrainList: [],
})

export const AnalysisListContextProvider: React.FC<{ children: ReactNode }> = ({
  children,
}: {
  children: ReactNode
}) => {
  const router = useRouter()
  const { user } = useContext(AuthContext)

  const [analysisTournamentList, setAnalysisTournamentList] = useState<Map<
    string,
    WorldChampionshipGameListEntry[]
  > | null>(null)
  const [analysisLichessList, setAnalysisLichessList] = useState<
    MaiaGameListEntry[]
  >([])
  const [analysisPlayList, setAnalysisPlayList] = useState<MaiaGameListEntry[]>(
    [],
  )
  const [analysisHandList, setAnalysisHandList] = useState<MaiaGameListEntry[]>(
    [],
  )
  const [analysisBrainList, setAnalysisBrainList] = useState<
    MaiaGameListEntry[]
  >([])

  useEffect(() => {
    async function getAndSetData() {
      let response
      try {
        response = await fetchWorldChampionshipGameList()
      } catch (e) {
        router.push('/401')
        return
      }

      const newList = new Map(Object.entries(response))
      setAnalysisTournamentList(newList)
    }

    getAndSetData()
  }, [router])

  useEffect(() => {
    if (user?.lichessId) {
      streamLichessGames(user?.lichessId, (data) => {
        const result = data.pgn.match(/\[Result\s+"(.+?)"\]/)[1] || '?'

        const game: MaiaGameListEntry = {
          id: data.id,
          type: 'pgn',
          label: `${data.players.white.user?.id || 'Unknown'} vs. ${data.players.black.user?.id || 'Unknown'}`,
          result: result,
          pgn: data.pgn,
        }

        setAnalysisLichessList((x) => [...x, game])
      })
    }
  }, [user?.lichessId])

  useEffect(() => {
    if (user?.lichessId) {
      const playRequest = fetchMaiaGameList('play', 1)
      const handRequest = fetchMaiaGameList('hand', 1)
      const brainRequest = fetchMaiaGameList('brain', 1)

      Promise.all([playRequest, handRequest, brainRequest]).then((data) => {
        const [play, hand, brain] = data

        const parse = (
          game: {
            game_id: string
            maia_name: string
            result: string
            player_color: 'white' | 'black'
          },
          type: string,
        ) => {
          const raw = game.maia_name.replace('_kdd_', ' ')
          const maia = raw.charAt(0).toUpperCase() + raw.slice(1)

          return {
            id: game.game_id,
            label:
              game.player_color === 'white'
                ? `You vs. ${maia}`
                : `${maia} vs. You`,
            result: game.result,
            type,
          }
        }

        setAnalysisPlayList(
          play.games.map((game: never) => parse(game, 'play')),
        )
        setAnalysisHandList(
          hand.games.map((game: never) => parse(game, 'hand')),
        )
        setAnalysisBrainList(
          brain.games.map((game: never) => parse(game, 'brain')),
        )
      })
    }
  }, [user?.lichessId])

  return (
    <AnalysisListContext.Provider
      value={{
        analysisTournamentList,
        analysisLichessList,
        analysisPlayList,
        analysisHandList,
        analysisBrainList,
      }}
    >
      {children}
    </AnalysisListContext.Provider>
  )
}
