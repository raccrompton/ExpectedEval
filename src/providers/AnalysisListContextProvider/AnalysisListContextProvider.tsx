import { ReactNode, useContext, useEffect, useState } from 'react'

import { AuthContext, AnalysisListContext } from 'src/contexts'
import { getAnalysisList, getLichessGames } from 'src/api'
import { AnalysisLichessGame, AnalysisTournamentGame } from 'src/types'
import { useRouter } from 'next/router'

export const AnalysisListContextProvider: React.FC<{ children: ReactNode }> = ({
  children,
}: {
  children: ReactNode
}) => {
  const router = useRouter()
  const { user } = useContext(AuthContext)

  const [analysisTournamentList, setAnalysisTournamentList] = useState<Map<
    string,
    AnalysisTournamentGame[]
  > | null>(null)
  const [analysisLichessList, setAnalysisLichessList] = useState<
    AnalysisLichessGame[]
  >([])

  useEffect(() => {
    async function getAndSetData() {
      let response
      try {
        response = await getAnalysisList()
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
      getLichessGames(user?.lichessId, (data) => {
        const playerColor =
          data.players.white.user?.id == user?.lichessId ? 'white' : 'black'

        const result = data.pgn.match(/\[Result\s+"(.+?)"\]/)[1] || '?'

        const game = {
          id: data.id,
          white:
            playerColor === 'white'
              ? 'You'
              : data.players.white.user?.id || 'Anonymous',
          whiteRating: data.players.white.rating,
          black:
            playerColor === 'black'
              ? 'You'
              : data.players.black.user?.id || 'Anonymous',
          blackRating: data.players.black.rating,
          result: result,
          pgn: data.pgn,
        }

        setAnalysisLichessList((x) => [...x, game])
      })
    }
  }, [user?.lichessId])

  return (
    <AnalysisListContext.Provider
      value={{ analysisTournamentList, analysisLichessList }}
    >
      {children}
    </AnalysisListContext.Provider>
  )
}
