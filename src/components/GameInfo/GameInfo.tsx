import { useContext } from 'react'
import { ModalContext, ThemeContext } from 'src/contexts'
import { Player, Termination } from 'src/types'
import { InstructionsType } from 'src/components/modals/InstructionsModal'
import { HelpIcon } from 'src/components/Icons/icons'

import styles from './GameInfo.module.scss'

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
      <div className={styles.container}>
        <div className={styles.headerContainer}>
          <h3>
            {prettyTypes[type]}
            {showId ? (
              <>
                {' '}
                &middot; <span className={styles.id}>{id}</span>
              </>
            ) : null}
          </h3>
          <button
            className={styles.helpButton}
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
          <div className={styles.termination}>
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
