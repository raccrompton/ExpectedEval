import { Dispatch, SetStateAction } from 'react'

import { TrainingGame } from 'src/types/training'

interface Props {
  previousGameResults: (TrainingGame & { result?: boolean })[]
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
          className={`${game.result ? 'bg-engine-4' : game.result === undefined ? 'bg-button-secondary' : 'bg-human-4'} h-7 w-7 cursor-pointer rounded-sm`}
        />
      ))}
    </div>
  )
}
