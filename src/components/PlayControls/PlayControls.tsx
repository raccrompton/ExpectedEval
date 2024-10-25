import styles from './PlayControls.module.scss'

interface Props {
  playerActive: boolean
  gameOver: boolean
  resign?: () => void
  offerDraw?: () => void
  playAgain?: () => void
}

export const PlayControls: React.FC<Props> = ({
  playerActive,
  gameOver,
  resign,
  offerDraw,
  playAgain,
}: Props) => {
  return (
    <div>
      {gameOver ? (
        <div className={styles.container}>
          {playAgain ? <button onClick={playAgain}>Play again</button> : null}
        </div>
      ) : (
        <div className={styles.container}>
          {playerActive ? 'Your turn' : 'Waiting for opponent'}
          {offerDraw ? <button onClick={offerDraw}>Offer draw</button> : null}
          {resign ? <button onClick={resign}>Resign</button> : null}
        </div>
      )}
    </div>
  )
}
