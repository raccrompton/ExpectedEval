import { useContext } from 'react'

import { ModalContext } from 'src/contexts'
import { InstructionsType } from 'src/components/modals/InstructionsModal'

interface Props {
  id: string
  rating: number
  hideRating: boolean
  instructionsType: InstructionsType
}

export const PuzzleInfo: React.FC<Props> = ({
  id,
  rating,
  hideRating,
  instructionsType,
}: Props) => {
  const { setInstructionsModalProps } = useContext(ModalContext)
  return (
    <div className="flex w-full flex-col items-start justify-start overflow-hidden md:rounded">
      <div className="flex w-full flex-col gap-1 bg-background-1 p-3">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center justify-start gap-1">
            <span className="material-symbols-outlined">target</span>
            <h2 className="text-xl font-semibold">Training</h2>
          </div>
          <button
            className="material-symbols-outlined duration-200 hover:text-human-3"
            onClick={() => {
              setInstructionsModalProps({ instructionsType: instructionsType })
            }}
          >
            help
          </button>
        </div>
        <p className="text-xs text-secondary">
          Play Maia-inspired puzzles and practice tricky tactics! Only your
          first attempt counts towards your puzzle rating.
        </p>
      </div>
      <div className="flex w-full flex-col gap-1 bg-background-1/60 p-3">
        <p className="text-sm text-secondary">
          Rating of puzzle:{' '}
          {hideRating ? (
            <span className="text-secondary/60">hidden</span>
          ) : (
            <span className="text-human-2">{rating}</span>
          )}
        </p>
      </div>
    </div>
  )
}
