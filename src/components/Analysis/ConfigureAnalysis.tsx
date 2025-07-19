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
    <div className="flex w-full flex-col items-start justify-start gap-1 p-4">
      <div className="flex w-full flex-col gap-0.5">
        <p className="text-xs text-secondary">Analyze using:</p>
        <select
          value={currentMaiaModel}
          className="cursor-pointer rounded border-none bg-human-4/60 p-1.5 text-sm text-primary/70 outline-none transition duration-300 hover:bg-human-4/80 hover:text-primary"
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
        background="bg-human-4/60 hover:bg-human-4/80 text-primary/70 hover:text-primary !px-2 !py-1.5 !text-sm"
      />
      {onAnalyzeEntireGame && (
        <div className="mt-2 w-full">
          <button
            onClick={onAnalyzeEntireGame}
            disabled={isAnalysisInProgress}
            className={`w-full rounded border border-human-4/40 px-2 py-1.5 text-sm transition duration-200 ${
              isAnalysisInProgress
                ? 'cursor-not-allowed bg-human-4/20 text-primary/40'
                : 'text-primary/70 hover:border-human-4/60 hover:bg-human-4/10 hover:text-primary'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-sm">
                {isAnalysisInProgress ? 'psychology' : 'analytics'}
              </span>
              <span>
                {isAnalysisInProgress
                  ? 'Analysis in Progress...'
                  : 'Analyze Entire Game'}
              </span>
            </div>
          </button>
        </div>
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
