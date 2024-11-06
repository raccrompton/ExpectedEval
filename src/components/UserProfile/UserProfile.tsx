/* eslint-disable prettier/prettier */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable import/named */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { useRouter } from 'next/router'
import React, { useState, useEffect, useContext } from 'react'

import {
  HandIcon,
  BrainIcon,
  TrainIcon,
  TuringIcon,
  RegularPlayIcon,
  UserIcon,
} from '../Icons/icons'
import GameList from './GameList'
import { getPlayerStats } from 'src/api'
import { AuthContext, WindowSizeContext } from 'src/contexts'
import { ProfileColumn } from '../ProfileColumn/ProfileColumn'

const UserProfile: React.FC = () => {
  const router = useRouter()
  const { user } = useContext(AuthContext)
  const { isMobile } = useContext(WindowSizeContext)

  if (!user?.lichessId) router.push('/')

  const [stats, setStats] = useState({
    regularRating: 0,
    regularWins: 0,
    regularDraws: 0,
    regularGames: 0,
    regularMax: 0,
    regularMin: 0,
    regularHours: 0,

    handRating: 0,
    handWins: 0,
    handDraws: 0,
    handGames: 0,
    handMax: 0,
    handMin: 0,
    handHours: 0,

    brainRating: 0,
    brainWins: 0,
    brainDraws: 0,
    brainGames: 0,
    brainMax: 0,
    brainMin: 0,
    brainHours: 0,

    trainRating: 0,
    trainCorrect: 0,
    trainGames: 0,
    trainMax: 0,
    trainMin: 0,
    trainHours: 0,

    botNotRating: 0,
    botNotCorrect: 0,
    botNotWrong: 0,
    botNotMax: 0,
    botNotMin: 0,
    botNotHours: 0,
  })

  useEffect(() => {
    const fetchStats = async () => {
      const playerStats = await getPlayerStats()
      setStats(playerStats)
    }

    fetchStats()
  }, [])

  const desktopLayout = () => (
    <div className="flex h-full w-full flex-col items-start justify-center gap-6 px-[4%] md:py-[2%]">
      <div className="flex flex-row items-center gap-4">
        <div className="*:w-16 *:fill-primary">{UserIcon}</div>
        <h1 className="text-3xl font-semibold">{user?.displayName}</h1>
      </div>
      <div className="flex flex-col gap-6 md:flex-row">
        <GameList />
        <div className="grid h-full w-full grid-cols-2 gap-6">
          <ProfileColumn
            icon={<RegularPlayIcon />}
            name="REGULAR"
            data={{
              rating: stats.regularRating,
              highest: stats.regularMax,
              hours: stats.regularHours,
              games: stats.regularGames,
              wins: stats.regularWins,
              draws: stats.regularDraws,
            }}
          />
          <ProfileColumn
            icon={<HandIcon />}
            name="HAND"
            data={{
              rating: stats.handRating,
              highest: stats.handMax,
              hours: stats.handHours,
              games: stats.handGames,
              wins: stats.handWins,
              draws: stats.handDraws,
            }}
          />
          <ProfileColumn
            icon={<BrainIcon />}
            name="BRAIN"
            data={{
              rating: stats.brainRating,
              highest: stats.brainMax,
              hours: stats.brainHours,
              games: stats.brainGames,
              wins: stats.brainWins,
              draws: stats.brainDraws,
            }}
          />
          <ProfileColumn
            icon={<TrainIcon />}
            name="TRAIN"
            data={{
              rating: stats.trainRating,
              highest: stats.trainMax,
              hours: stats.trainHours,
              games: stats.trainGames,
              wins: stats.trainCorrect,
            }}
          />
          <ProfileColumn
            icon={<TuringIcon />}
            name="BOT/NOT"
            data={{
              rating: stats.botNotRating,
              highest: stats.botNotMax,
              hours: stats.botNotHours,
              games: stats.botNotCorrect + stats.botNotWrong,
              wins: stats.botNotCorrect,
              losses: stats.botNotWrong,
            }}
          />
        </div>
      </div>
    </div>
  )

  const mobileLayout = () => (
    <div className="mt-6 flex flex-col gap-3 px-[4%]">
      <div className="flex flex-row items-center gap-3">
        <div className="*:w-12 *:fill-primary">{UserIcon}</div>
        <h1 className="text-3xl font-semibold">{user?.displayName}</h1>
      </div>
      <div className="flex w-full flex-col gap-6">
        <GameList />
        <div className="flex h-full w-full flex-col flex-wrap justify-start gap-6">
          <ProfileColumn
            icon={<RegularPlayIcon />}
            name="REGULAR"
            data={{
              rating: stats.regularRating,
              highest: stats.regularMax,
              hours: stats.regularHours,
              games: stats.regularGames,
              wins: stats.regularWins,
              draws: stats.regularDraws,
            }}
          />
          <ProfileColumn
            icon={<HandIcon />}
            name="HAND"
            data={{
              rating: stats.handRating,
              highest: stats.handMax,
              hours: stats.handHours,
              games: stats.handGames,
              wins: stats.handWins,
              draws: stats.handDraws,
            }}
          />
          <ProfileColumn
            icon={<BrainIcon />}
            name="BRAIN"
            data={{
              rating: stats.brainRating,
              highest: stats.brainMax,
              hours: stats.brainHours,
              games: stats.brainGames,
              wins: stats.brainWins,
              draws: stats.brainDraws,
            }}
          />
          <ProfileColumn
            icon={<TrainIcon />}
            name="TRAIN"
            data={{
              rating: stats.trainRating,
              highest: stats.trainMax,
              hours: stats.trainHours,
              games: stats.trainGames,
              wins: stats.trainCorrect,
            }}
          />
          <ProfileColumn
            icon={<TuringIcon />}
            name="BOT/NOT"
            data={{
              rating: stats.botNotRating,
              highest: stats.botNotMax,
              hours: stats.botNotHours,
              games: stats.botNotCorrect + stats.botNotWrong,
              wins: stats.botNotCorrect,
              losses: stats.botNotWrong,
            }}
          />
        </div>
      </div>
    </div>
  )

  return <>{isMobile ? mobileLayout() : desktopLayout()}</>
}

export default UserProfile
