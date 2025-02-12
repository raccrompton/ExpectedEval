import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useContext, useEffect } from 'react'

import { Loading } from 'src/components'
import { AnalysisListContext } from 'src/contexts'
import { useLocalStorage } from 'src/hooks'

const AnalysisPage: NextPage = () => {
  const { push } = useRouter()
  const [preferLegacyAnalysis] = useLocalStorage('preferLegacyAnalysis', false)
  const { analysisTournamentList } = useContext(AnalysisListContext)

  useEffect(() => {
    if (analysisTournamentList) {
      const entries = Array.from(analysisTournamentList.entries()).sort(
        (a, b) => b[0].split('---')[1].localeCompare(a[0].split('---')[1]),
      )
      const [firstPart, games] = entries[0]
      const gameId = firstPart.split('---')[0] + '/' + games[0].game_index
      if (preferLegacyAnalysis) {
        push(`/analysis/legacy/${gameId}`)
      } else {
        push(`/analysis/${gameId}`)
      }
    }
  }, [analysisTournamentList, preferLegacyAnalysis, push])

  return <Loading />
}

export default AnalysisPage
