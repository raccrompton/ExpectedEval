import Head from 'next/head'
import React, { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import {
  BrainIcon,
  HandIcon,
  RegularPlayIcon,
  TrainIcon,
  BotOrNotIcon,
} from 'src/components/Common/Icons'
import { getLeaderboard } from 'src/api'
import { LeaderboardColumn, DelayedLoading } from 'src/components'
import { LeaderboardProvider } from 'src/components/Leaderboard/LeaderboardContext'

const Leaderboard: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [leaderboard, setLeaderboard] = useState<
    {
      icon: React.JSX.Element
      ranking: { display_name: string; elo: number }[]
      name: 'Regular' | 'Train' | 'Bot/Not' | 'Hand' | 'Brain'
      id: 'regular' | 'train' | 'turing' | 'hand' | 'brain'
    }[]
  >()

  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    )

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60)
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`

    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    const lb = await getLeaderboard()
    setLastUpdated(new Date(lb.last_updated + 'Z'))
    setLeaderboard([
      {
        id: 'regular',
        icon: <RegularPlayIcon />,
        name: 'Regular',
        ranking: lb.play_leaders,
      },
      {
        id: 'train',
        icon: <TrainIcon />,
        name: 'Train',
        ranking: lb.puzzles_leaders,
      },
      {
        id: 'turing',
        icon: <BotOrNotIcon />,
        name: 'Bot/Not',
        ranking: lb.turing_leaders,
      },
      {
        id: 'hand',
        icon: <HandIcon />,
        name: 'Hand',
        ranking: lb.hand_leaders,
      },
      {
        id: 'brain',
        icon: <BrainIcon />,
        name: 'Brain',
        ranking: lb.brain_leaders,
      },
    ])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.2,
        staggerChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 4 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.25,
        ease: [0.25, 0.46, 0.45, 0.94],
        type: 'tween',
      },
    },
    exit: {
      opacity: 0,
      y: -4,
      transition: {
        duration: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94],
        type: 'tween',
      },
    },
  }

  return (
    <LeaderboardProvider>
      <DelayedLoading isLoading={loading}>
        <AnimatePresence mode="wait">
          <motion.div
            key="leaderboard-content"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ willChange: 'transform, opacity' }}
            className="mx-auto flex h-full w-[90%] flex-col items-start justify-center gap-4 py-[1%]"
          >
            <Head>
              <title>Leaderboard – Maia Chess</title>
              <meta
                name="description"
                content="View top-ranked players across all Maia Chess game modes. Competitive leaderboards for regular play, puzzles, bot detection, hand & brain chess with live ratings and statistics."
              />
            </Head>
            <motion.div
              variants={itemVariants}
              className="flex w-full flex-col items-start justify-between md:flex-row md:items-end"
            >
              <h1 className="text-3xl font-bold">Rating Leaderboards</h1>
              <p className="text-sm text-secondary">
                Last updated: {lastUpdated ? getTimeAgo(lastUpdated) : '...'}
              </p>
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="grid h-full w-full grid-cols-1 justify-start gap-3 md:grid-cols-2 lg:grid-cols-3"
            >
              {leaderboard?.map((column, index) => (
                <LeaderboardColumn key={index} {...column} />
              ))}
            </motion.div>
            <motion.div variants={itemVariants} className="my-2 w-full">
              <p className="text-xs text-secondary">
                <span className="font-medium">Note:</span> Each leaderboard
                column only features players who have played atleast one game of
                the corresponding type within the last 7 days.
              </p>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </DelayedLoading>
    </LeaderboardProvider>
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
