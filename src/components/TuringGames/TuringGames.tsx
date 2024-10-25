/* eslint-disable jsx-a11y/no-static-element-interactions */
import classNames from 'classnames'
import { useContext } from 'react'
import { TuringControllerContext } from 'src/contexts'
import styles from './TuringGames.module.scss'

export const TuringGames: React.FC = () => {
  const { gameIds, setCurrentId, games } = useContext(TuringControllerContext)
  return (
    <div className={styles.container}>
      {gameIds.map((id) => (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <span
          key={id}
          onClick={() => setCurrentId(id)}
          className={classNames({
            [styles.current]: !games[id].result,
            [styles.correct]: games[id].result?.correct,
            [styles.incorrect]: !(games[id].result?.correct ?? true),
          })}
        />
      ))}
    </div>
  )
}
