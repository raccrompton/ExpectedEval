import styles from 'src/styles/App.module.scss'
import { LeaderboardColumn } from 'src/components/LeaderboardColumn/LeaderboardColumn'
import {
  BrainIcon,
  HandIcon,
  RegularPlayIcon,
  TrainIcon,
  TuringIcon,
} from 'src/components/Icons/icons'
import { useCallback, useEffect, useState } from 'react'
import { getLeaderboard } from 'src/api'

const Leaderboard: React.FC = () => {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [leaderboard, setLeaderboard] = useState<
    {
      icon: JSX.Element
      name: string
      ranking: { display_name: string; elo: number }[]
    }[]
  >()
  const fetchLeaderboard = useCallback(async () => {
    const lb = await getLeaderboard()
    setLastUpdated(new Date(lb.last_updated + 'Z'))
    setLeaderboard([
      {
        icon: <RegularPlayIcon />,
        name: 'Regular',
        ranking: lb.play_leaders,
      },
      {
        icon: <TrainIcon />,
        name: 'Train',
        ranking: lb.puzzles_leaders,
      },
      {
        icon: <HandIcon />,
        name: 'Hand',
        ranking: lb.hand_leaders,
      },
      {
        icon: <BrainIcon />,
        name: 'Brain',
        ranking: lb.brain_leaders,
      },

      {
        icon: <TuringIcon />,
        name: 'Bot/Not',
        ranking: lb.turing_leaders,
      },
    ])
  }, [])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  return (
    <div className={styles.leaderboardPage}>
      <div className={styles.leaderboardHeader}>
        <h1 className="text-4xl font-bold">Rating Leaderboards</h1>
        <p>
          Last Updated:{' '}
          {lastUpdated
            ? lastUpdated.toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })
            : '...'}
        </p>
      </div>
      <div className={styles.leaderboardContainer}>
        {leaderboard?.map((column, index) => (
          <LeaderboardColumn key={index} {...column} />
        ))}
      </div>
    </div>
  )
}

const LeaderboardPage: React.FC = () => {
  return (
    <>
      <Leaderboard />
    </>
  )
}

export default LeaderboardPage
