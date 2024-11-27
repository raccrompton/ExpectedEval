import { Chess } from 'chess.ts'
import { useEffect, useState } from 'react'

import { Move } from 'src/types'

interface Props {
  moves: Move[]
}

export const ExportGame: React.FC<Props> = ({ moves }) => {
  const [pgn, setPgn] = useState('')

  useEffect(() => {
    const chess = new Chess()
    moves.forEach((move) => {
      if (move.san) {
        chess.move(move.san)
      }
    })
    setPgn(chess.pgn())
  }, [moves])

  const copy = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="flex flex-row items-center justify-center gap-2">
      <div className="flex h-10 items-center overflow-hidden rounded border border-primary/10 bg-background-1">
        <div className="flex w-[500px] items-center justify-start bg-background-1 px-4">
          <p className="whitespace-nowrap text-sm text-secondary">
            {moves[moves.length - 1].board}
          </p>
        </div>
        <button
          onClick={() => copy(moves[moves.length - 1].board)}
          className="flex h-10 w-10 min-w-10 items-center justify-center border-l border-primary/10 bg-background-2 transition duration-200 hover:bg-background-3"
        >
          <span className="material-symbols-outlined text-xl">
            content_copy
          </span>
        </button>
      </div>
      <button
        onClick={() => copy(pgn)}
        className="flex h-10 items-center justify-center rounded border border-primary/10 bg-background-2 px-4 py-1 transition duration-300 hover:bg-background-3"
      >
        Copy PGN
      </button>
    </div>
  )
}
