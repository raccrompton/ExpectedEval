/* eslint-disable jsx-a11y/click-events-have-key-events */
import { Chess } from 'chess.ts'
import { useContext, useEffect, useState } from 'react'

import { Move, PlayedGame } from 'src/types'
import { GameControllerContext } from 'src/contexts'

interface Props {
  game: PlayedGame
  whitePlayer: string
  blackPlayer: string
  maiaVersion: string
}

export const ExportGame: React.FC<Props> = ({
  game,
  whitePlayer,
  blackPlayer,
  maiaVersion,
}) => {
  const [fen, setFen] = useState('')
  const [pgn, setPgn] = useState('')
  const { currentIndex } = useContext(GameControllerContext)

  useEffect(() => {
    const chess = new Chess()
    game.moves.forEach((move) => {
      if (move.san) {
        chess.move(move.san)
      }
    })
    setPgn(chess.pgn())
  }, [game.moves])

  useEffect(() => {
    const initial = new Chess(game.moves[0].board)
    initial.addHeader('ID', game.id)
    initial.addHeader('Event', `Play v. ${maiaVersion}`)
    initial.addHeader('Site', `https://maiachess.com/`)
    initial.addHeader('White', whitePlayer)
    initial.addHeader('Black', blackPlayer)
    if (game.termination) {
      initial.addHeader('Result', game.termination.result)
      if (game.termination.condition) {
        initial.addHeader('Termination', game.termination.condition)
      }
    }
    game.moves.forEach((move, index) => {
      if (!move.san || index > currentIndex) {
        return
      }

      initial.move(move.san)
    })
    setFen(game.moves[currentIndex].board)
    setPgn(initial.pgn())
  }, [currentIndex, game.moves])

  const copy = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <p className="select-none text-sm font-semibold tracking-wider text-secondary">
            FEN
          </p>
          <i
            tabIndex={0}
            role="button"
            onClick={() => copy(fen)}
            className="material-symbols-outlined select-none text-base text-secondary hover:text-primary"
          >
            content_copy
          </i>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => copy(fen)}
          className="border-1 group flex cursor-pointer overflow-x-hidden rounded border border-white/5 bg-background-1/50 px-4 py-2"
        >
          <p className="whitespace-nowrap text-xs text-secondary group-hover:text-secondary/80">
            {fen}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <p className="select-none text-sm font-semibold tracking-wider text-secondary">
            PGN
          </p>
          <i
            tabIndex={0}
            role="button"
            onClick={() => copy(pgn)}
            className="material-symbols-outlined select-none text-base text-secondary hover:text-primary"
          >
            content_copy
          </i>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => copy(pgn)}
          className="border-1 group flex cursor-pointer overflow-x-hidden rounded border border-white/5 bg-background-1/50 px-4 py-2"
        >
          <p className="whitespace-pre-wrap text-xs text-secondary group-hover:text-secondary/80">
            {pgn}
          </p>
        </div>
      </div>
    </div>
  )
}
