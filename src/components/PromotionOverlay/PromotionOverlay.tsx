/* eslint-disable @typescript-eslint/no-explicit-any */
import { useContext } from 'react'
import { GameControllerContext } from 'src/contexts'
import { Color } from 'src/types'
import styles from './PromotionOverlay.module.scss'
import classNames from 'classnames'

interface Props {
  player: Color
  file: string
  selectPromotion: (piece: string) => void
}

export const PromotionOverlay: React.FC<Props> = ({
  player,
  file,
  selectPromotion,
}: Props) => {
  const { orientation } = useContext(GameControllerContext)

  const pieces = ['q', 'n', 'r', 'b']
  const flipped = orientation == 'black'

  if (flipped) {
    pieces.reverse()
  }

  const offset = file.charCodeAt(0) - 'a'.charCodeAt(0)
  const offsetPct = 100 * ((flipped ? 7 - offset : offset) / 8)

  return (
    <>
      <div
        className={classNames(styles.overlay, {
          [styles.flipped]: flipped,
        })}
      >
        <div
          className={styles.container}
          style={{ marginLeft: offsetPct + '%' }}
        >
          {pieces.map((piece) => (
            <button
              className={styles.piece}
              key={piece}
              onClick={() => selectPromotion(piece)}
            >
              {piece}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
