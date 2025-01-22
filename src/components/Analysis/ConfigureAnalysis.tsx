import Link from 'next/link'
import React from 'react'

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
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm text-secondary">Analyze using:</p>
        <select
          value={currentMaiaModel}
          className="cursor-pointer rounded border-none bg-human-4/40 p-2 text-primary/70 outline-none transition duration-300 hover:bg-human-4/60 hover:text-primary"
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
        background="bg-human-4/40 hover:bg-human-4/60 text-primary/70 hover:text-primary"
      />
      <p className="mt-2 text-sm text-secondary">
        If you are having performance issues, you can switch to our legacy{' '}
        <Link
          href={window.location.href.replace('/analyze', '/analysis')}
          className="text-primary/80 underline transition duration-200 hover:text-primary/100"
        >
          Analysis Lite
        </Link>{' '}
        to continue your analysis without Maia 2.
      </p>
    </div>
  )
}
