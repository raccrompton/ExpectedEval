import { motion } from 'framer-motion'
import React, { useState, useEffect, useContext } from 'react'

import { AuthContext } from 'src/contexts'
import { AnalysisWebGame } from 'src/types'
import { getLichessGames, getAnalysisGameList } from 'src/api'

export const GameList = () => {
  const { user } = useContext(AuthContext)
  const [selected, setSelected] = useState<'play' | 'hand' | 'brain' | 'pgn'>(
    'play',
  )
  const [games, setGames] = useState<AnalysisWebGame[]>([])
  const [playGames, setPlayGames] = useState<AnalysisWebGame[]>([])
  const [handGames, setHandGames] = useState<AnalysisWebGame[]>([])
  const [brainGames, setBrainGames] = useState<AnalysisWebGame[]>([])

  useEffect(() => {
    if (user?.lichessId) {
      getLichessGames(user?.lichessId, (data) => {
        const result = data.pgn.match(/\[Result\s+"(.+?)"\]/)[1] || '?'

        const game: AnalysisWebGame = {
          id: data.id,
          label: `${data.players.white.user?.id || 'Unknown'} vs. ${data.players.black.user?.id || 'Unknown'}`,
          result: result,
          type: 'pgn',
        }

        setGames((x) => [...x, game])
      })
    }
  }, [user?.lichessId])

  useEffect(() => {
    if (user?.lichessId) {
      const playRequest = getAnalysisGameList('play', 1)
      const handRequest = getAnalysisGameList('hand', 1)
      const brainRequest = getAnalysisGameList('brain', 1)

      Promise.all([playRequest, handRequest, brainRequest]).then((data) => {
        const [play, hand, brain] = data

        const parse = (
          game: {
            game_id: string
            maia_name: string
            result: string
            player_color: 'white' | 'black'
          },
          type: string,
        ) => {
          const raw = game.maia_name.replace('_kdd_', ' ')
          const maia = raw.charAt(0).toUpperCase() + raw.slice(1)

          return {
            id: game.game_id,
            label:
              game.player_color === 'white'
                ? `You vs. ${maia}`
                : `${maia} vs. You`,
            result: game.result,
            type,
          }
        }

        setPlayGames(play.games.map((game: never) => parse(game, 'play')))
        setHandGames(hand.games.map((game: never) => parse(game, 'hand')))
        setBrainGames(brain.games.map((game: never) => parse(game, 'brain')))
      })
    }
  }, [user?.lichessId])

  return (
    <div className="flex w-full flex-col overflow-hidden rounded border border-white border-opacity-10 md:w-[600px]">
      <div className="flex flex-row items-center justify-start gap-4 border-b border-white border-opacity-10 bg-background-1 px-4 py-4 md:px-6">
        <p className="text-2xl font-bold md:text-2xl">Your Games</p>
      </div>
      <div className="grid select-none grid-cols-4 border-b-2 border-white border-opacity-10">
        <Header
          label="Play"
          name="play"
          selected={selected}
          setSelected={setSelected}
        />
        <Header
          label="Hand"
          name="hand"
          selected={selected}
          setSelected={setSelected}
        />
        <Header
          label="Brain"
          name="brain"
          selected={selected}
          setSelected={setSelected}
        />
        <Header
          label="Lichess"
          name="pgn"
          selected={selected}
          setSelected={setSelected}
        />
      </div>
      <div className="red-scrollbar flex max-h-64 flex-col overflow-y-scroll md:max-h-[60vh]">
        {(selected === 'play'
          ? playGames
          : selected === 'hand'
            ? handGames
            : selected === 'brain'
              ? brainGames
              : games
        ).map((game, index) => (
          <a
            key={index}
            href={`/analysis/${game.id}/${selected}`}
            className={`group flex w-full cursor-pointer items-center gap-2 pr-2 ${index % 2 === 0 ? 'bg-background-1/40' : 'bg-background-1/20'} hover:bg-background-1/80`}
          >
            <div className="flex h-full w-10 items-center justify-center bg-background-1 py-1 group-hover:bg-white/5">
              <p className="text-secondary">{index + 1}</p>
            </div>
            <div className="flex flex-1 items-center justify-between py-1">
              <p className="text-secondary">{game.label}</p>
              <p className="text-secondary">{game.result}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

function Header({
  name,
  label,
  selected,
  setSelected,
}: {
  label: string
  name: 'play' | 'hand' | 'brain' | 'pgn'
  selected: 'play' | 'hand' | 'brain' | 'pgn'
  setSelected: (name: 'play' | 'hand' | 'brain' | 'pgn') => void
}) {
  return (
    <button
      onClick={() => setSelected(name)}
      className={`relative flex items-center justify-center py-1 ${selected === name ? 'bg-human-4/20' : 'bg-background-1/60 hover:bg-background-1'} transition duration-200`}
    >
      <div className="flex items-center justify-start gap-1">
        <p
          className={`transition duration-200 ${selected === name ? 'text-human-2/80' : 'text-primary/80'} `}
        >
          {label}
        </p>
        <i
          className={`material-symbols-outlined text-base transition duration-200 ${selected === name ? 'text-human-2/80' : 'text-primary/80'}`}
        >
          keyboard_arrow_down
        </i>
      </div>
      {selected === name && (
        <motion.div
          layoutId="underline"
          className="absolute -bottom-0.5 h-0.5 w-full bg-human-2/80"
        ></motion.div>
      )}
    </button>
  )
}
