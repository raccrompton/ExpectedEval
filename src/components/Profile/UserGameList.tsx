import { motion } from 'framer-motion'
import React, { useState, useEffect } from 'react'

import { AnalysisWebGame } from 'src/types'
import { getAnalysisGameList } from 'src/api'

interface GameData {
  game_id: string
  maia_name: string
  result: string
  player_color: 'white' | 'black'
}

interface UserGameListProps {
  lichessId: string
  userName: string
}

export const UserGameList = ({ lichessId, userName }: UserGameListProps) => {
  const [selected, setSelected] = useState<'play' | 'hb'>('play')
  const [hbSubsection, setHbSubsection] = useState<'hand' | 'brain'>('hand')
  const [playGames, setPlayGames] = useState<AnalysisWebGame[]>([])
  const [handGames, setHandGames] = useState<AnalysisWebGame[]>([])
  const [brainGames, setBrainGames] = useState<AnalysisWebGame[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const [fetchedCache, setFetchedCache] = useState<{
    [key: string]: { [page: number]: boolean }
  }>({
    play: {},
    hand: {},
    brain: {},
  })

  const [totalPagesCache, setTotalPagesCache] = useState<{
    [key: string]: number
  }>({})

  const [currentPagePerTab, setCurrentPagePerTab] = useState<{
    [key: string]: number
  }>({
    play: 1,
    hand: 1,
    brain: 1,
  })

  useEffect(() => {
    if (lichessId) {
      const gameType = selected === 'hb' ? hbSubsection : selected
      const isAlreadyFetched = fetchedCache[gameType]?.[currentPage]

      if (!isAlreadyFetched) {
        setLoading(true)

        setFetchedCache((prev) => ({
          ...prev,
          [gameType]: { ...prev[gameType], [currentPage]: true },
        }))

        getAnalysisGameList(gameType, currentPage, lichessId)
          .then((data) => {
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
                    ? `${userName} vs. ${maia}`
                    : `${maia} vs. ${userName}`,
                result: game.result,
                type,
              }
            }

            const parsedGames = data.games.map((game: GameData) =>
              parse(game, gameType),
            )
            const calculatedTotalPages =
              data.total_pages || Math.ceil(data.total_games / 25)

            setTotalPagesCache((prev) => ({
              ...prev,
              [gameType]: calculatedTotalPages,
            }))

            if (gameType === 'play') {
              setPlayGames(parsedGames)
            } else if (gameType === 'hand') {
              setHandGames(parsedGames)
            } else if (gameType === 'brain') {
              setBrainGames(parsedGames)
            }

            setLoading(false)
          })
          .catch(() => {
            setFetchedCache((prev) => {
              const newCache = { ...prev }
              delete newCache[gameType][currentPage]
              return newCache
            })
            setLoading(false)
          })
      }
    }
  }, [lichessId, selected, hbSubsection, currentPage, fetchedCache, userName])

  useEffect(() => {
    if (selected === 'hb') {
      const gameType = hbSubsection
      if (totalPagesCache[gameType]) {
        setTotalPages(totalPagesCache[gameType])
      }
      setCurrentPage(currentPagePerTab[gameType])
    } else if (totalPagesCache[selected]) {
      setTotalPages(totalPagesCache[selected])
    }

    if (selected !== 'hb') {
      setCurrentPage(currentPagePerTab[selected])
    }
  }, [selected, hbSubsection, totalPagesCache, currentPagePerTab])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      if (selected === 'hb') {
        const gameType = hbSubsection
        setCurrentPagePerTab((prev) => ({
          ...prev,
          [gameType]: newPage,
        }))
      } else {
        setCurrentPagePerTab((prev) => ({
          ...prev,
          [selected]: newPage,
        }))
      }
    }
  }

  const handleTabChange = (newTab: 'play' | 'hb') => {
    setSelected(newTab)
  }

  const getCurrentGames = () => {
    if (selected === 'play') {
      return playGames
    } else if (selected === 'hb') {
      return hbSubsection === 'hand' ? handGames : brainGames
    }
    return []
  }

  return (
    <div className="flex w-full flex-col overflow-hidden rounded border border-white border-opacity-10 md:w-[600px]">
      <div className="flex flex-row items-center justify-start gap-4 border-b border-white border-opacity-10 bg-background-1 px-2 py-3 md:px-4">
        <p className="text-xl font-bold md:text-xl">{userName}&apos;s Games</p>
      </div>
      <div className="grid select-none grid-cols-2 border-b-2 border-white border-opacity-10">
        <Header
          label="Play"
          name="play"
          selected={selected}
          setSelected={handleTabChange}
        />
        <Header
          label="H&B"
          name="hb"
          selected={selected}
          setSelected={handleTabChange}
        />
      </div>

      {/* H&B Subsections */}
      {selected === 'hb' && (
        <div className="flex border-b border-white border-opacity-10">
          <button
            onClick={() => setHbSubsection('hand')}
            className={`flex-1 px-3 py-1.5 text-sm ${
              hbSubsection === 'hand'
                ? 'bg-background-2 text-primary'
                : 'bg-background-1/50 text-secondary hover:bg-background-2'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-xs">
                hand_gesture
              </span>
              <span className="text-xs">Hand ({handGames.length})</span>
            </div>
          </button>
          <button
            onClick={() => setHbSubsection('brain')}
            className={`flex-1 px-3 py-1.5 text-sm ${
              hbSubsection === 'brain'
                ? 'bg-background-2 text-primary'
                : 'bg-background-1/50 text-secondary hover:bg-background-2'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-xs">
                psychology
              </span>
              <span className="text-xs">Brain ({brainGames.length})</span>
            </div>
          </button>
        </div>
      )}

      <div className="red-scrollbar flex max-h-64 flex-col overflow-y-scroll md:max-h-96">
        {loading ? (
          <div className="flex h-full items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
          </div>
        ) : (
          <>
            {getCurrentGames().map((game, index) => (
              <a
                key={index}
                href={`/analysis/${game.id}/${game.type}`}
                className={`group flex w-full cursor-pointer items-center gap-2 pr-2 ${
                  index % 2 === 0
                    ? 'bg-background-1/30 hover:bg-background-2'
                    : 'bg-background-1/10 hover:bg-background-2'
                }`}
              >
                <div className="flex h-full w-10 items-center justify-center bg-background-2 py-1 group-hover:bg-white/5">
                  <p className="text-sm text-secondary">
                    {(currentPage - 1) * 100 + index + 1}
                  </p>
                </div>
                <div className="flex flex-1 items-center justify-between overflow-hidden py-1">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <p className="overflow-hidden text-ellipsis whitespace-nowrap text-sm text-primary">
                      {game.label}
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-sm text-secondary">
                    {game.result}
                  </p>
                </div>
              </a>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 border-t border-white border-opacity-10 bg-background-1 py-2">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center text-secondary hover:text-primary disabled:opacity-50"
          >
            <span className="material-symbols-outlined">first_page</span>
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center text-secondary hover:text-primary disabled:opacity-50"
          >
            <span className="material-symbols-outlined">arrow_back_ios</span>
          </button>
          <span className="text-sm text-secondary">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center text-secondary hover:text-primary disabled:opacity-50"
          >
            <span className="material-symbols-outlined">arrow_forward_ios</span>
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center text-secondary hover:text-primary disabled:opacity-50"
          >
            <span className="material-symbols-outlined">last_page</span>
          </button>
        </div>
      )}
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
  name: 'play' | 'hb'
  selected: 'play' | 'hb'
  setSelected: (name: 'play' | 'hb') => void
}) {
  return (
    <button
      onClick={() => setSelected(name)}
      className={`relative flex items-center justify-center py-0.5 ${
        selected === name
          ? 'bg-human-4/30'
          : 'bg-background-1/80 hover:bg-background-2'
      } transition duration-200`}
    >
      <div className="flex items-center justify-start gap-1">
        <p
          className={`text-sm transition duration-200 ${
            selected === name ? 'text-human-2' : 'text-primary'
          }`}
        >
          {label}
        </p>
        <i
          className={`material-symbols-outlined text-base transition duration-200 ${
            selected === name ? 'text-human-2/80' : 'text-primary/80'
          }`}
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
