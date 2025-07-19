import Link from 'next/link'
import React from 'react'
import { useLocalStorage } from 'src/hooks'
import { AnalyzedGame } from 'src/types'

import { ContinueAgainstMaia } from 'src/components'

interface Props {
  currentMaiaModel: string
  setCurrentMaiaModel: (model: string) => void
  launchContinue: () => void
  MAIA_MODELS: string[]
  game: AnalyzedGame
  onDeleteCustomGame?: () => void
  onAnalyzeEntireGame?: () => void
  isAnalysisInProgress?: boolean
}

export const ConfigureAnalysis: React.FC<Props> = ({
  currentMaiaModel,
  setCurrentMaiaModel,
  launchContinue,
  MAIA_MODELS,
  game,
  onDeleteCustomGame,
  onAnalyzeEntireGame,
  isAnalysisInProgress = false,
}: Props) => {
  const isCustomGame = game.type === 'custom-pgn' || game.type === 'custom-fen'

  return (
    <div className="flex w-full flex-col items-start justify-start gap-1 p-3">
      <div className="flex w-full flex-col gap-0.5">
        <p className="text-xs text-secondary">Analyze using:</p>
        <select
          value={currentMaiaModel}
          className="cursor-pointer rounded-sm border-none bg-human-4/60 p-1 text-xs text-primary/70 outline-none transition duration-300 hover:bg-human-4/80 hover:text-primary"
          onChange={(e) => setCurrentMaiaModel(e.target.value)}
        >
          {MAIA_MODELS.map((model) => (
            <option value={model} key={model}>
              {model.replace('maia_kdd_', 'Maia ')}
            </option>
          ))}
        </select>
      </div>
      <ContinueAgainstMaia
        launchContinue={launchContinue}
        background="bg-human-4/60 !rounded-sm hover:bg-human-4/80 text-primary/70 hover:text-primary !px-2 !py-1 !text-xs"
      />
      {onAnalyzeEntireGame && (
        <button
          onClick={onAnalyzeEntireGame}
          disabled={isAnalysisInProgress}
          className="flex w-full items-center gap-1.5 rounded-sm bg-human-4/60 !px-2 !py-1 !text-sm text-primary/70 transition duration-200 hover:bg-human-4/80 hover:text-primary"
        >
          <div className="flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined !text-sm">
              network_intelligence
            </span>
            <span className="text-xs">
              {isAnalysisInProgress
                ? 'Analysis in progress...'
                : 'Analyze entire game'}
            </span>
          </div>
        </button>
      )}
      {isCustomGame && onDeleteCustomGame && (
        <div className="mt-2 w-full">
          <button
            onClick={onDeleteCustomGame}
            className="text-xs text-secondary transition duration-200 hover:text-human-4"
          >
            <span className="underline">Delete</span> this stored Custom Game
          </button>
        </div>
      )}
    </div>
  )
}
