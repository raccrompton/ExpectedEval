import Link from 'next/link'
import React from 'react'
import { useLocalStorage } from 'src/hooks'

import { ContinueAgainstMaia } from 'src/components'

interface Props {
  currentMaiaModel: string
  setCurrentMaiaModel: (model: string) => void
  launchContinue: () => void
  MAIA_MODELS: string[]
}

export const ConfigureAnalysis: React.FC<Props> = ({
  currentMaiaModel,
  setCurrentMaiaModel,
  launchContinue,
  MAIA_MODELS,
}: Props) => {
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
    </div>
  )
}
