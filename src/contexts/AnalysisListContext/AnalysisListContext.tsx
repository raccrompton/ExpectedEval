import React from 'react'

import { AnalysisLichessGame, AnalysisTournamentGame } from 'src/types'

interface IAnalysisListContext {
  analysisTournamentList: Map<string, AnalysisTournamentGame[]> | null
  analysisLichessList: AnalysisLichessGame[]
}

export const AnalysisListContext = React.createContext<IAnalysisListContext>({
  analysisTournamentList: null,
  analysisLichessList: [],
})
