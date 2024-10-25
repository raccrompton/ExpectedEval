import { AuthContext } from 'src/contexts'
import React, { useState, useEffect, useContext } from 'react'

import { getLichessGames } from 'src/api'
import { AnalysisLichessGame } from 'src/types'

export default function GameList() {
  const { user } = useContext(AuthContext)
  const [games, setGames] = useState<AnalysisLichessGame[]>([])

  useEffect(() => {
    if (user?.lichessId) {
      getLichessGames(user?.lichessId, (data) => {
        const playerColor =
          data.players.white.user?.id == user?.lichessId ? 'white' : 'black'
        const result = data.pgn.match(/\[Result\s+"(.+?)"\]/)[1] || '?'

        const game = {
          id: data.id,
          white:
            playerColor == 'white'
              ? 'You'
              : data.players.white.user?.id || 'Anonymous',
          black:
            playerColor == 'black'
              ? 'You'
              : data.players.black.user?.id || 'Anonymous',
          result: result,
          pgn: data.pgn,
        }

        setGames((x) => [...x, game])
      })
    }
  }, [user?.lichessId])

  return (
    <div className="flex w-full flex-col md:w-[500px]">
      <div className="flex flex-row items-center justify-start gap-4 bg-background-2 px-6 py-5 md:px-8">
        <p className="text-2xl font-bold md:text-3xl">YOUR GAMES</p>
      </div>

      <div className="flex max-h-96 flex-col overflow-y-scroll bg-background-1">
        {games.map((game, index) => (
          <a
            key={index}
            href={`/analysis/${game.id}/lichess`}
            className="group flex w-full cursor-pointer items-center gap-2 pr-2 hover:bg-background-2"
          >
            <div className="flex h-full w-10 items-center justify-center bg-background-2 group-hover:bg-background-3">
              <p className="text-muted">{index + 1}</p>
            </div>
            <div className="flex flex-1 items-center justify-between py-1">
              <p className="text-primary">
                {game.white} vs. {game.black}
              </p>
              <p className="text-muted">{game.result}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
