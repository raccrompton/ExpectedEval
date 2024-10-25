import { Color } from 'src/types'
import { useState, useEffect, useContext } from 'react'
import classNames from 'classnames'

import styles from './GameClock.module.scss'
import { AuthContext, ThemeContext } from 'src/contexts'
import { PlayControllerContext } from 'src/contexts/PlayControllerContext'

interface Props {
  player: Color
  reversed: boolean
}

export const GameClock: React.FC<Props> = (
  props: React.PropsWithChildren<Props>,
) => {
  const { theme } = useContext(ThemeContext)
  const { user } = useContext(AuthContext)
  const { timeControl, player, toPlay, whiteClock, blackClock, lastMoveTime } =
    useContext(PlayControllerContext)

  const [referenceTime, setReferenceTime] = useState<number>(Date.now())

  const playerClock = props.player == 'white' ? whiteClock : blackClock
  const active = toPlay == props.player

  const clock = Math.max(
    active && lastMoveTime > 0
      ? playerClock - referenceTime + lastMoveTime
      : playerClock,
    0,
  )

  useEffect(() => {
    setReferenceTime(Date.now())

    if (active) {
      const interval = setInterval(() => setReferenceTime(Date.now()), 50)
      return () => clearInterval(interval)
    }

    return () => undefined
  }, [active, setReferenceTime])

  const minutes = Math.floor(clock / 60000)
  const seconds = Math.floor(clock / 1000) - minutes * 60
  const tenths = Math.floor(clock / 100) - seconds * 10 - minutes * 600

  const showTenths = minutes < 1 && seconds <= 20

  return (
    <div
      className={classNames(styles.clock, {
        [styles.active]: active,
        [styles.reversed]: props.reversed,
      })}
    >
      <div className={styles.time}>
        {minutes}:{('00' + seconds).slice(-2)}
        {showTenths ? '.' + tenths : null}
      </div>
      <div className={styles.player}>
        {(theme == 'dark') != (props.player == 'black') ? '●' : '○'}{' '}
        {player == props.player ? user?.displayName : 'Maia'}
      </div>
    </div>
  )
}
