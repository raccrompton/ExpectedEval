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
import { buildUrl } from 'src/api'
import styles from './UserProfile.module.scss'
import { AuthContext, WindowSizeContext } from 'src/contexts'
import { ProfileColumn } from '../ProfileColumn/ProfileColumn'

const getPlayerStats = async () => {
  const res = await fetch(buildUrl('auth/get_player_stats'))
  const data = await res.json()
  return {
    regularRating: data.play_elo as number,
    regularWins: data.play_won as number,
    regularDraws: data.play_drawn as number,
    regularGames: data.play_games_played as number,
    regularMax: data.play_elo_max as number,
    regularMin: data.play_elo_min as number,
    regularHours: data.play_game_time as number,

    handRating: data.hand_elo as number,
    handWins: data.hand_won as number,
    handDraws: data.hand_drawn as number,
    handGames: data.hand_games_played as number,
    handMax: data.hand_elo_max as number,
    handMin: data.hand_elo_min as number,
    handHours: data.hand_game_time as number,

    brainRating: data.brain_elo as number,
    brainWins: data.brain_won as number,
    brainDraws: data.brain_drawn as number,
    brainGames: data.brain_games_played as number,
    brainMax: data.brain_elo_max as number,
    brainMin: data.brain_elo_min as number,
    brainHours: data.brain_game_time as number,

    trainRating: data.puzzles_elo as number,
    trainCorrect: data.puzzles_correct as number,
    trainGames: data.puzzles_played as number,
    trainMax: data.puzzles_elo_max as number,
    trainMin: data.puzzles_elo_min as number,
    trainHours: data.puzzle_game_time as number,

    botNotRating: data.turing_elo as number,
    botNotCorrect: data.turing_guesses_correct as number,
    botNotWrong: data.turing_guesses_wrong as number,
    botNotMax: data.turing_elo_max as number,
    botNotMin: data.turing_elo_min as number,
    botNotHours: data.turing_game_time as number,
  }
}

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
    <div className={styles.page}>
      <div className={styles.header}>
        {UserIcon}
        <h1>{user?.displayName}</h1>
      </div>
      <div className="flex flex-col gap-6 md:flex-row">
        <GameList />
        <div className="flex h-full w-full flex-row flex-wrap justify-start gap-6">
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
    <div className={styles.page}>
      <div className={styles.header}>
        {UserIcon}
        <h1>{user?.displayName}</h1>
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
