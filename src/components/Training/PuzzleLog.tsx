import { Dispatch, SetStateAction } from 'react'

import { TrainingGame } from 'src/types/training'

interface Props {
  previousGameResults: (TrainingGame & {
    result?: boolean
    ratingDiff?: number
  })[]
  setCurrentIndex: Dispatch<SetStateAction<number>>
}

export const PuzzleLog: React.FC<Props> = ({
  previousGameResults,
  setCurrentIndex,
}: Props) => {
  return (
    <div className="flex flex-row flex-wrap items-start justify-start gap-1 overflow-y-auto">
      {previousGameResults.map((game, index) => (
        <button
          key={game.id}
          onClick={() => setCurrentIndex(index)}
          className={`${game.result ? 'bg-engine-4' : game.result === undefined ? 'bg-button-secondary' : 'bg-human-4'} flex h-10 w-10 cursor-pointer flex-col items-center justify-center rounded-sm`}
        >
          {game.ratingDiff ? (
            <>
              <i
                className={`material-symbols-outlined -mt-1 ${game.ratingDiff >= 0 ? 'text-blue-200' : 'text-red-300'}`}
              >
                {game.ratingDiff >= 0 ? 'arrow_drop_up' : 'arrow_drop_down'}
              </i>
              <p
                className={`-mt-2 text-xs tracking-widest ${game.ratingDiff >= 0 ? 'text-blue-200' : 'text-red-300'}`}
              >
                {game.ratingDiff >= 0 && '+'}
                {game.ratingDiff}
              </p>
            </>
          ) : (
            <></>
          )}
        </button>
      ))}
    </div>
  )
}
