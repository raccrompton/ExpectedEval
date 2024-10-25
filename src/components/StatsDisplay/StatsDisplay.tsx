import classNames from 'classnames'
import { useEffect, useState } from 'react'

import styles from './StatsDisplay.module.scss'
import { AllStats, SingleStats } from 'src/hooks/useStats'
import { CaretUpIcon, CaretDownIcon } from 'src/components/Icons/icons'

interface SingleProps {
  stats: SingleStats | undefined
}

const SingleStatsDisplay: React.FC<SingleProps> = ({ stats }: SingleProps) => {
  const winPercentage = stats ? (stats.gamesWon / stats.gamesPlayed) * 100 : 0

  return (
    <div className={styles.singleStats}>
      <div>
        <div className={classNames({ [styles.notLoaded]: stats == undefined })}>
          {stats?.gamesWon || 0}
        </div>
        <div className={styles.label}>Correct</div>
      </div>
      <div>
        <div className={classNames({ [styles.notLoaded]: stats == undefined })}>
          {stats?.gamesPlayed || 0}
        </div>
        <div className={styles.label}>Played</div>
      </div>
      <div>
        <div className={classNames({ [styles.notLoaded]: stats == undefined })}>
          {Number.isNaN(winPercentage) ? '-' : Math.trunc(winPercentage)}%
        </div>
        <div className={styles.label}>Rate</div>
      </div>
    </div>
  )
}

interface RatingDiffProps {
  diff: number
}

const RatingDiffDisplay: React.FC<RatingDiffProps> = ({
  diff,
}: RatingDiffProps) => {
  const icon = diff < 0 ? CaretDownIcon : CaretUpIcon
  const sign = diff < 0 ? '–' : '+'

  return (
    <div className={classNames(styles.diff, { [styles.decrease]: diff < 0 })}>
      {icon} {sign + Math.abs(diff)}
    </div>
  )
}

interface Props {
  stats: AllStats
  hideSession?: boolean
}

export const StatsDisplay: React.FC<Props> = ({
  hideSession,
  stats,
}: Props) => {
  const [cachedRating, setCachedRating] = useState<number | undefined>(0)

  useEffect(() => {
    if (stats.rating == undefined) {
      return
    }
    setCachedRating(stats.rating)
  }, [stats])

  return (
    <div className={styles.stats}>
      <div className={styles.rating}>
        <div className={styles.label}>Your rating</div>
        <div
          className={classNames(styles.ratingNum, {
            [styles.notLoaded]: cachedRating == undefined,
            [styles.cachedRating]: stats.rating == undefined,
          })}
        >
          {cachedRating || 0}
          {stats.rating != undefined && stats.lastRating != undefined ? (
            <RatingDiffDisplay diff={stats.rating - stats.lastRating} />
          ) : null}
        </div>
      </div>
      {hideSession ? null : (
        <div className={styles.sessionStats}>
          <div className={styles.label}>This session</div>
          <SingleStatsDisplay stats={stats.sessionStats} />
        </div>
      )}
      <div className={styles.lifetimeStats}>
        <div className={styles.label}>Lifetime</div>
        <SingleStatsDisplay stats={stats.lifetimeStats} />
      </div>
    </div>
  )
}
