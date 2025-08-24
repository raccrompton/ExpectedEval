import Head from 'next/head'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { DelayedLoading } from 'src/components'
import { getAnalysisGameList } from 'src/api'
import { AnalysisListContext } from 'src/contexts'
import { useContext, useEffect, useState } from 'react'

const AnalysisHomePage: NextPage = () => {
  const { push } = useRouter()
  const { analysisTournamentList, analysisPlayList } =
    useContext(AnalysisListContext)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const redirectToGame = async () => {
      // First try to get play games
      if (analysisPlayList.length > 0) {
        const game = analysisPlayList[0]
        push(`/analysis/${game.id}/play`)
        return
      }

      // If no play games in context, try to fetch them directly
      try {
        const playGames = await getAnalysisGameList('play', 1)
        if (playGames.games && playGames.games.length > 0) {
          const gameId = playGames.games[0].game_id
          push(`/analysis/${gameId}/play`)
          return
        }
      } catch (error) {
        console.error('Error fetching play games:', error)
      }

      // If no play games available, fall back to tournament games
      if (analysisTournamentList) {
        const entries = Array.from(analysisTournamentList.entries()).sort(
          (a, b) => b[0].split('---')[1].localeCompare(a[0].split('---')[1]),
        )
        if (entries.length > 0) {
          const [firstPart, games] = entries[0]
          const gameId = firstPart.split('---')[0] + '/' + games[0].game_index
          push(`/analysis/${gameId}`)
          return
        }
      }

      // If no games available, redirect to analysis page
      push('/analysis')
      setLoading(false)
    }

    redirectToGame()
  }, [analysisTournamentList, analysisPlayList, push])

  return (
    <>
      <Head>
        <title>Chess Analysis</title>
        <meta
          name="description"
          content="Analyze chess games with human-aware AI. Go beyond perfect engine lines by analyzing games with real-world context."
        />
      </Head>
      <DelayedLoading isLoading={loading}>
        <div className="flex min-h-screen items-center justify-center bg-background-1">
          <div className="text-center">
            <h1 className="mb-8 text-4xl font-bold text-primary">Chess Analysis</h1>
            <p className="mb-8 text-lg text-secondary">Loading analysis interface...</p>
          </div>
        </div>
      </DelayedLoading>
    </>
  )
}

export default AnalysisHomePage
