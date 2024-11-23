import React from 'react'

import { AnalysisWebGame, AnalysisTournamentGame } from 'src/types'

interface IAnalysisListContext {
  analysisTournamentList: Map<string, AnalysisTournamentGame[]> | null
  analysisLichessList: AnalysisWebGame[]
  analysisPlayList: AnalysisWebGame[]
  analysisHandList: AnalysisWebGame[]
  analysisBrainList: AnalysisWebGame[]
}

export const AnalysisListContext = React.createContext<IAnalysisListContext>({
  analysisTournamentList: null,
  analysisLichessList: [],
  analysisPlayList: [],
  analysisHandList: [],
  analysisBrainList: [],
})
