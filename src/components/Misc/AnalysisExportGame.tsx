/* eslint-disable jsx-a11y/click-events-have-key-events */
import { Chess } from 'chess.ts'
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { AnalyzedGame, GameNode } from 'src/types'

interface Props {
  game: AnalyzedGame
  currentNode: GameNode
  whitePlayer: string
  blackPlayer: string
  event: string
}

export const AnalysisExportGame: React.FC<Props> = ({
  game,
  currentNode,
  whitePlayer,
  blackPlayer,
  event,
}) => {
  const [pgn, setPgn] = useState('')

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
    if (!game.tree) return

    game.tree.setHeader('ID', game.id)
    game.tree.setHeader('Event', event)
    game.tree.setHeader('Site', `https://maiachess.com/`)
    game.tree.setHeader('White', whitePlayer)
    game.tree.setHeader('Black', blackPlayer)
    if (game.termination) {
      game.tree.setHeader('Result', game.termination.result)
      if (game.termination.condition) {
        game.tree.setHeader('Termination', game.termination.condition)
      }
    }

    setPgn(game.tree.toPGN())
  }, [currentNode, game.moves])

  const copy = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full flex-col gap-0.5">
        <div className="flex w-full items-center justify-between">
          <p className="select-none text-sm font-semibold tracking-wider text-secondary">
            FEN
          </p>
          <i
            tabIndex={0}
            role="button"
            onClick={() => copy(currentNode.fen)}
            className="material-symbols-outlined select-none text-sm text-secondary hover:text-primary"
          >
            content_copy
          </i>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => copy(currentNode.fen)}
          className="border-1 group flex w-full cursor-pointer overflow-x-hidden rounded border border-white/5 bg-background-1/50 px-3 py-2"
        >
          <p className="whitespace-nowrap text-xs text-secondary group-hover:text-secondary/80">
            {currentNode.fen}
          </p>
        </div>
      </div>
      <div className="flex w-full flex-col gap-0.5">
        <div className="flex w-full items-center justify-between">
          <p className="select-none text-sm font-semibold tracking-wider text-secondary">
            PGN
          </p>
          <i
            tabIndex={0}
            role="button"
            onClick={() => copy(pgn)}
            className="material-symbols-outlined select-none text-sm text-secondary hover:text-primary"
          >
            content_copy
          </i>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => copy(pgn)}
          className="group flex max-h-32 w-full cursor-pointer overflow-x-hidden overflow-y-scroll rounded border border-white/5 bg-background-1/50 p-3"
        >
          <p className="whitespace-pre-wrap text-xs text-secondary group-hover:text-secondary/80">
            {pgn}
          </p>
        </div>
      </div>
    </div>
  )
}
