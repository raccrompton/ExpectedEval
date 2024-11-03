import { useContext } from 'react'

import { Player, Termination } from 'src/types'
import { HelpIcon } from 'src/components/Icons/icons'
import { ModalContext, ThemeContext } from 'src/contexts'
import { InstructionsType } from 'src/components/modals/InstructionsModal'

interface Props {
  termination?: Termination
  blackPlayer?: Player
  whitePlayer?: Player
  type?: string
  id: string
  showId: boolean
  instructionsType: InstructionsType
}

export const GameInfo: React.FC<Props> = (props: Props) => {
  const {
    termination,
    blackPlayer,
    whitePlayer,
    type = 'Unknown',
    id,
    showId,
    instructionsType,
  } = props

  const { theme } = useContext(ThemeContext)

  const { setInstructionsModalProps } = useContext(ModalContext)

  const prettyTypes: { [type: string]: string } = {
    againstMaia: 'vs. Maia',
    handAndBrain: 'Hand and Brain',
    turing: 'Bot-or-not',
    blitz: 'Analysis',
    train: 'Training',
  }

  return (
    <>
      <div className="flex flex-col rounded-l bg-background-1/80 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">
            {prettyTypes[type]}
            {showId ? (
              <>
                {' '}
                &middot; <span className="font-light">{id}</span>
              </>
            ) : null}
          </h3>
          <button
            className="h-5 w-5 transition duration-200 *:h-5 *:w-5 *:hover:text-human-2"
            onClick={() => {
              setInstructionsModalProps({ instructionsType: instructionsType })
            }}
          >
            {HelpIcon}
          </button>
        </div>
        <hr />
        <div>
          {theme == 'dark' ? '●' : '○'} {whitePlayer?.name ?? 'Unknown'}{' '}
          {whitePlayer?.rating ? `(${whitePlayer.rating})` : null}
        </div>
        <div>
          {theme == 'light' ? '●' : '○'} {blackPlayer?.name ?? 'Unknown'}{' '}
          {blackPlayer?.rating ? `(${blackPlayer.rating})` : null}
        </div>
        {termination ? (
          <div className="p-1 text-center">
            {termination.result}
            {', '}
            {termination.winner !== 'none'
              ? `${termination.winner} wins`
              : 'draw'}
          </div>
        ) : null}
      </div>
    </>
  )
}
