import { motion } from 'framer-motion'
import React, { useState, useEffect, useContext } from 'react'

import { AuthContext } from 'src/contexts'
import { AnalysisWebGame } from 'src/types'
import { getLichessGames, getAnalysisGameList } from 'src/api'
import { getCustomAnalysesAsWebGames } from 'src/lib/customAnalysis'
import { FavoriteModal } from 'src/components/Common/FavoriteModal'
import {
  getFavoritesAsWebGames,
  addFavoriteGame,
  removeFavoriteGame,
  isFavoriteGame,
} from 'src/lib/favorites'

interface GameData {
  game_id: string
  maia_name: string
  result: string
  player_color: 'white' | 'black'
}

interface GameListProps {
  showCustom?: boolean
  showLichess?: boolean
  lichessId?: string
  userName?: string
}

export const GameList = ({
  showCustom = true,
  showLichess = true,
  lichessId,
  userName,
}: GameListProps) => {
  const { user } = useContext(AuthContext)

  // Determine available tabs based on props
  const availableTabs = ['favorites', 'play', 'hb']
  if (showCustom) availableTabs.push('custom')
  if (showLichess) availableTabs.push('lichess')

  const [selected, setSelected] = useState<
    'play' | 'hb' | 'custom' | 'lichess' | 'favorites'
  >(showCustom ? 'favorites' : 'play')
  const [hbSubsection, setHbSubsection] = useState<'hand' | 'brain'>('hand')
  const [games, setGames] = useState<AnalysisWebGame[]>([])

  const [gamesByPage, setGamesByPage] = useState<{
    [gameType: string]: { [page: number]: AnalysisWebGame[] }
  }>({
    play: {},
    hand: {},
    brain: {},
  })

  const [customAnalyses, setCustomAnalyses] = useState(() => {
    if (typeof window !== 'undefined') {
      return getCustomAnalysesAsWebGames()
    }
    return []
  })
  const [favoriteGames, setFavoriteGames] = useState(() => {
    if (typeof window !== 'undefined') {
      return getFavoritesAsWebGames()
    }
    return []
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  // Modal state for favoriting
  const [favoriteModal, setFavoriteModal] = useState<{
    isOpen: boolean
    game: AnalysisWebGame | null
  }>({ isOpen: false, game: null })

  const [fetchedCache, setFetchedCache] = useState<{
    [key: string]: { [page: number]: boolean }
  }>({
    play: {},
    hand: {},
    brain: {},
    lichess: {},
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
    lichess: 1,
  })

  // Update custom analyses and favorites when component mounts
  useEffect(() => {
    if (showCustom) {
      setCustomAnalyses(getCustomAnalysesAsWebGames())
    }
    setFavoriteGames(getFavoritesAsWebGames())
  }, [])

  useEffect(() => {
    const targetUser = lichessId || user?.lichessId
    if (targetUser && showLichess && !fetchedCache.lichess[1]) {
      setFetchedCache((prev) => ({
        ...prev,
        lichess: { ...prev.lichess, 1: true },
      }))

      getLichessGames(targetUser, (data) => {
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
  }, [user?.lichessId, lichessId, showLichess, fetchedCache.lichess])

  useEffect(() => {
    const targetUser = lichessId || user?.lichessId
    if (
      targetUser &&
      selected !== 'lichess' &&
      selected !== 'custom' &&
      selected !== 'favorites'
    ) {
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

              const playerLabel = userName || 'You'

              return {
                id: game.game_id,
                label:
                  game.player_color === 'white'
                    ? `${playerLabel} vs. ${maia}`
                    : `${maia} vs. ${playerLabel}`,
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

            // Store games by page instead of replacing
            setGamesByPage((prev) => ({
              ...prev,
              [gameType]: {
                ...prev[gameType],
                [currentPage]: parsedGames,
              },
            }))

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
  }, [
    user?.lichessId,
    lichessId,
    userName,
    selected,
    hbSubsection,
    currentPage,
    fetchedCache,
  ])

  useEffect(() => {
    if (selected === 'hb') {
      const gameType = hbSubsection
      if (totalPagesCache[gameType]) {
        setTotalPages(totalPagesCache[gameType])
      } else {
        setTotalPages(1) // Default to 1 page until data is loaded
      }
      setCurrentPage(currentPagePerTab[gameType] || 1)
    } else if (totalPagesCache[selected]) {
      setTotalPages(totalPagesCache[selected])
      setCurrentPage(currentPagePerTab[selected] || 1)
    } else if (
      (selected === 'lichess' && showLichess) ||
      (selected === 'custom' && showCustom)
    ) {
      setTotalPages(1)
      setCurrentPage(1)
    } else {
      // For other sections (like 'play'), default to page 1 until data loads
      setTotalPages(1)
      setCurrentPage(currentPagePerTab[selected] || 1)
    }
  }, [
    selected,
    hbSubsection,
    totalPagesCache,
    currentPagePerTab,
    showLichess,
    showCustom,
  ])

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

  const handleTabChange = (
    newTab: 'play' | 'hb' | 'custom' | 'lichess' | 'favorites',
  ) => {
    setSelected(newTab)
  }

  const handleFavoriteGame = (game: AnalysisWebGame) => {
    setFavoriteModal({ isOpen: true, game })
  }

  const handleSaveFavorite = (customName: string) => {
    if (favoriteModal.game) {
      addFavoriteGame(favoriteModal.game, customName)
      setFavoriteGames(getFavoritesAsWebGames())
    }
  }

  const handleRemoveFavorite = () => {
    if (favoriteModal.game) {
      removeFavoriteGame(favoriteModal.game.id)
      setFavoriteGames(getFavoritesAsWebGames())
    }
  }

  const getCurrentGames = () => {
    if (selected === 'play') {
      return gamesByPage.play[currentPage] || []
    } else if (selected === 'hb') {
      const gameType = hbSubsection
      return gamesByPage[gameType]?.[currentPage] || []
    } else if (selected === 'custom' && showCustom) {
      return customAnalyses
    } else if (selected === 'lichess' && showLichess) {
      return games
    } else if (selected === 'favorites') {
      return favoriteGames
    }
    return []
  }

  return (
    <div className="flex w-full flex-col overflow-hidden rounded border border-white border-opacity-10 md:w-[600px]">
      <div className="flex flex-row items-center justify-start gap-4 border-b border-white border-opacity-10 bg-background-1 px-2 py-3 md:px-4">
        <p className="text-xl font-bold md:text-xl">
          {userName ? `${userName}'s Games` : 'Your Games'}
        </p>
      </div>
      <div className="flex select-none items-center border-b-2 border-white border-opacity-10">
        {showCustom && (
          <Header
            label="★"
            name="favorites"
            selected={selected}
            setSelected={handleTabChange}
          />
        )}
        <div
          className={`grid flex-1 ${
            availableTabs.length === 3
              ? 'grid-cols-2'
              : availableTabs.length === 4
                ? 'grid-cols-3'
                : availableTabs.length === 5
                  ? 'grid-cols-4'
                  : 'grid-cols-5'
          }`}
        >
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
          {showCustom && (
            <Header
              label="Custom"
              name="custom"
              selected={selected}
              setSelected={handleTabChange}
            />
          )}
          {showLichess && (
            <Header
              label="Lichess"
              name="lichess"
              selected={selected}
              setSelected={handleTabChange}
            />
          )}
        </div>
      </div>

      {/* H&B Subsections */}
      {selected === 'hb' && (
        <div className="flex border-b border-white border-opacity-10">
          <button
            onClick={() => setHbSubsection('hand')}
            className={`flex-1 px-3 text-sm ${
              hbSubsection === 'hand'
                ? 'bg-background-2 text-primary'
                : 'bg-background-1/50 text-secondary hover:bg-background-2'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <span className="material-symbols-outlined !text-lg">
                hand_gesture
              </span>
              <span className="text-xs">Hand</span>
            </div>
          </button>
          <button
            onClick={() => setHbSubsection('brain')}
            className={`flex-1 px-3 text-sm ${
              hbSubsection === 'brain'
                ? 'bg-background-2 text-primary'
                : 'bg-background-1/50 text-secondary hover:bg-background-2'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <span className="material-symbols-outlined !text-lg">
                neurology
              </span>
              <span className="text-xs">Brain</span>
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
            {getCurrentGames().map((game, index) => {
              const isFavorited = isFavoriteGame(game.id)
              return (
                <div
                  key={index}
                  className={`group flex w-full items-center gap-2 ${
                    index % 2 === 0
                      ? 'bg-background-1/30 hover:bg-background-2'
                      : 'bg-background-1/10 hover:bg-background-2'
                  }`}
                >
                  <div className="flex h-full w-10 items-center justify-center bg-background-2 py-1 group-hover:bg-white/5">
                    <p className="text-sm text-secondary">
                      {selected === 'play' || selected === 'hb'
                        ? (currentPage - 1) * 25 + index + 1
                        : index + 1}
                    </p>
                  </div>
                  <a
                    href={`/analysis/${game.id}/${game.type}`}
                    className="flex flex-1 cursor-pointer items-center justify-between overflow-hidden py-1"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <p className="overflow-hidden text-ellipsis whitespace-nowrap text-sm text-primary">
                        {game.label}
                      </p>
                      {selected === 'favorites' &&
                        (game.type === 'hand' || game.type === 'brain') && (
                          <span className="material-symbols-outlined flex-shrink-0 !text-sm text-secondary">
                            {game.type === 'hand'
                              ? 'hand_gesture'
                              : 'neurology'}
                          </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                      {selected === 'favorites' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleFavoriteGame(game)
                          }}
                          className="flex items-center justify-center text-secondary transition hover:text-primary"
                          title="Edit favourite"
                        >
                          <span className="material-symbols-outlined !text-xs">
                            edit
                          </span>
                        </button>
                      )}
                      {selected !== 'favorites' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleFavoriteGame(game)
                          }}
                          className={`flex items-center justify-center transition ${
                            isFavorited
                              ? 'text-yellow-400 hover:text-yellow-300'
                              : 'text-secondary hover:text-primary'
                          }`}
                          title={
                            isFavorited ? 'Edit favourite' : 'Add to favourites'
                          }
                        >
                          <span
                            className={`material-symbols-outlined !text-xs ${isFavorited ? 'material-symbols-filled' : ''}`}
                          >
                            star
                          </span>
                        </button>
                      )}
                      <p className="whitespace-nowrap text-sm text-secondary">
                        {game.result.replace('1/2', '½').replace('1/2', '½')}
                      </p>
                    </div>
                  </a>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Pagination */}
      {(selected === 'play' || selected === 'hb') && totalPages > 1 && (
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
      <FavoriteModal
        isOpen={favoriteModal.isOpen}
        currentName={favoriteModal.game?.label || ''}
        onClose={() => setFavoriteModal({ isOpen: false, game: null })}
        onSave={handleSaveFavorite}
        onRemove={
          favoriteModal.game && isFavoriteGame(favoriteModal.game.id)
            ? handleRemoveFavorite
            : undefined
        }
      />
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
  name: 'play' | 'hb' | 'custom' | 'lichess' | 'favorites'
  selected: 'play' | 'hb' | 'custom' | 'lichess' | 'favorites'
  setSelected: (
    name: 'play' | 'hb' | 'custom' | 'lichess' | 'favorites',
  ) => void
}) {
  return (
    <button
      onClick={() => setSelected(name)}
      className={`relative flex items-center justify-center py-1 transition duration-200 ${
        selected === name
          ? 'bg-human-4/30'
          : 'bg-background-1/80 hover:bg-background-2'
      } ${name === 'favorites' ? 'px-3' : ''}`}
    >
      <div className="flex items-center justify-start gap-1">
        <p
          className={`text-xs transition duration-200 ${
            selected === name ? 'text-human-2' : 'text-primary'
          }`}
        >
          {label}
        </p>
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
