import { PieceSymbol } from 'chess.ts'
import styles from './HandBrainPlayControls.module.scss'
import classNames from 'classnames'
import { Color } from 'src/types'

const pieceTypes: PieceSymbol[] = ['k', 'q', 'r', 'b', 'n', 'p']

const pieceStyleMap = {
  p: styles.pawn,
  k: styles.king,
  q: styles.queen,
  r: styles.rook,
  b: styles.bishop,
  n: styles.knight,
}

const colorStyleMap = {
  white: styles.white,
  black: styles.black,
}

interface Props {
  isBrain: boolean
  color: Color
  movablePieceTypes: PieceSymbol[]
  selectedPiece?: PieceSymbol
  playerActive: boolean
  gameOver: boolean
  selectPiece: (selectedPiece: PieceSymbol) => void
  resign?: () => void
  offerDraw?: () => void
  playAgain?: () => void
}

export const HandBrainPlayControls: React.FC<Props> = ({
  playerActive,
  gameOver,
  isBrain,
  color,
  selectedPiece,
  movablePieceTypes,
  selectPiece,
  resign,
  offerDraw,
  playAgain,
}: Props) => {
  const status = playerActive
    ? isBrain
      ? selectedPiece
        ? 'Waiting for hand'
        : 'Select a piece'
      : selectedPiece
        ? 'Your turn'
        : 'Waiting for brain'
    : 'Waiting for opponent'

  return (
    <div>
      <div className={styles.container}>
        {gameOver ? (
          <>
            {playAgain ? <button onClick={playAgain}>Play again</button> : null}
          </>
        ) : (
          <>
            <p className={styles.roleBlurb}>
              {isBrain ? 'You are the brain' : 'You are the hand'}
            </p>
            <p>{status}</p>

            {isBrain ? (
              <div className={styles.piecesContainer}>
                {pieceTypes.map((p) => (
                  <button
                    key={p}
                    onClick={() => selectPiece(p)}
                    className={styles.pieceButton}
                    disabled={
                      movablePieceTypes.indexOf(p) == -1 ||
                      !playerActive ||
                      !!selectedPiece
                    }
                  >
                    <div
                      className={classNames([
                        styles.piece,
                        colorStyleMap[color],
                        pieceStyleMap[p],
                      ])}
                    ></div>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.selectedPieceDisplay}>
                {selectedPiece ? (
                  <div
                    className={classNames([
                      styles.piece,
                      colorStyleMap[color],
                      pieceStyleMap[selectedPiece],
                    ])}
                  ></div>
                ) : null}
              </div>
            )}
            {offerDraw ? <button onClick={offerDraw}>Offer draw</button> : null}
            {resign ? <button onClick={resign}>Resign</button> : null}
          </>
        )}
      </div>
    </div>
  )
}
