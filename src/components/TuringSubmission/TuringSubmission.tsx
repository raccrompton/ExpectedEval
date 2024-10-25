import classNames from 'classnames'
import { useCallback, useContext, useEffect, useState } from 'react'
import { TuringControllerContext } from 'src/contexts'
import styles from './TuringSubmission.module.scss'

export const TuringSubmission: React.FC = () => {
  const { game, submitGuess, getNewGame, commentController } = useContext(
    TuringControllerContext,
  )
  const [comment, setComment] = commentController
  const [selected, setSelected] = useState<'white' | 'black' | null>(null)

  const handleSubmit = useCallback(() => {
    if (selected) {
      submitGuess(selected, comment)
    }
  }, [selected, submitGuess, comment])

  useEffect(() => {
    setSelected(null)
  }, [game])

  if (game?.result)
    return (
      <div className={styles.container}>
        <h2>
          Guess {game.result.correct ? 'correct' : 'incorrect'}, <br />
          {game.result.bot} was the bot
        </h2>
        <div className={styles.info}>
          <h3>
            {game.result.timeControl} · {game.result.gameType}
          </h3>
          <div>
            <p className={styles.circle}>●</p>
            {game.result.whitePlayer.title && (
              <span className={styles.title}>
                {game.result.whitePlayer.title}
              </span>
            )}
            {game.result.whitePlayer.name}
            <span>({game.result.whitePlayer.rating})</span>
            {game.result.bot === 'white' ? '🤖' : undefined}
          </div>
          <div>
            <p className={styles.circle}>○</p>
            {game.result.blackPlayer.title && (
              <span className={styles.title}>
                {game.result.blackPlayer.title}
              </span>
            )}
            {game.result.blackPlayer.name}
            <span>({game.result.blackPlayer.rating})</span>{' '}
            {game.result.bot === 'black' ? '🤖' : undefined}
          </div>
        </div>
        <button onClick={getNewGame}>NEXT</button>
      </div>
    )

  return (
    <div className={styles.container}>
      <div>
        <h2>Who is the bot?</h2>
        <div
          className={classNames(styles.group, {
            [styles.selected]: selected != undefined,
          })}
        >
          <button
            className={classNames(styles.none, styles.left, {
              [styles.selected]: selected == 'white',
            })}
            onClick={() => setSelected('white')}
          >
            White {selected == 'white' && '🤖'}
          </button>
          <div className={styles.switch}>
            <input
              type="radio"
              checked={selected === 'white'}
              className={styles.toggleWhite}
              onClick={() => setSelected('white')}
            />
            <input
              type="radio"
              checked={selected === null}
              disabled={selected !== null}
              className={styles.toggleNull}
            />
            <input
              type="radio"
              checked={selected === 'black'}
              className={styles.toggleBlack}
              onClick={() => setSelected('black')}
            />
            <div className={styles.slider}></div>
          </div>
          <button
            className={classNames(styles.none, styles.right, {
              [styles.selected]: selected == 'black',
            })}
            onClick={() => setSelected('black')}
          >
            {selected == 'black' && '🤖'} Black
          </button>
        </div>
      </div>
      <button
        onClick={handleSubmit}
        disabled={!selected}
        className={styles.submit}
      >
        Submit
      </button>
      <textarea
        placeholder="Optional justification"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
    </div>
  )
}
