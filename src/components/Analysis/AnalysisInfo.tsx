import { useContext } from 'react'

import { Player, Termination } from 'src/types'
import { ModalContext, ThemeContext } from 'src/contexts'

interface Props {
  id: string
  whitePlayer: Player
  blackPlayer: Player
  termination: Termination
}

export const AnalysisInfo: React.FC<Props> = ({
  id,
  whitePlayer,
  blackPlayer,
  termination,
}: Props) => {
  const { theme } = useContext(ThemeContext)
  const { setInstructionsModalProps } = useContext(ModalContext)

  return (
    <div className="flex w-full flex-col items-start justify-start overflow-hidden bg-background-1 md:rounded">
      <div className="flex w-full items-center justify-between bg-background-2 p-2 md:p-3">
        <div className="flex items-center justify-start gap-1.5 md:text-2xl">
          <span className="material-symbols-outlined">bar_chart</span>
          <h2 className="font-semibold">Analysis</h2>
        </div>
        <button
          className="material-symbols-outlined duration-200 hover:text-human-3"
          onClick={() => {
            setInstructionsModalProps({ instructionsType: 'train' })
          }}
        >
          help
        </button>
      </div>
      <div className="flex w-full flex-col p-2 text-sm text-secondary md:p-3 md:text-base">
        <div className="flex w-full items-center justify-between">
          <p>
            {theme == 'dark' ? '●' : '○'} {whitePlayer?.name ?? 'Unknown'}{' '}
            {whitePlayer?.rating ? `(${whitePlayer.rating})` : null}
          </p>
          <p>
            {termination.winner === 'white' ? (
              <span className="text-engine-3">1</span>
            ) : termination.winner === 'black' ? (
              <span className="text-human-3">0</span>
            ) : (
              <span>1/2</span>
            )}
          </p>
        </div>
        <div className="flex w-full items-center justify-between">
          <p>
            {theme == 'light' ? '●' : '○'} {blackPlayer?.name ?? 'Unknown'}{' '}
            {blackPlayer?.rating ? `(${blackPlayer.rating})` : null}
          </p>
          <p>
            {termination.winner === 'black' ? (
              <span className="text-engine-3">1</span>
            ) : termination.winner === 'white' ? (
              <span className="text-human-3">0</span>
            ) : (
              <span>1/2</span>
            )}
          </p>
        </div>{' '}
        {termination ? (
          <p className="text-center capitalize">
            {termination.winner !== 'none'
              ? `${termination.winner} wins`
              : 'draw'}
          </p>
        ) : null}
      </div>
    </div>
  )
}
