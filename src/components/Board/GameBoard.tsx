/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useContext } from 'react'
import type { DrawShape } from 'chessground/draw'
import Chessground from '@react-chess/chessground'

import { BaseGame, Check } from 'src/types'
import { GameControllerContext } from 'src/contexts'

interface Props {
  game: BaseGame
  moves?: Map<string, string[]>
  setCurrentMove?: (move: [string, string] | null) => void
  setCurrentSquare?: (key: string | null) => void
  move?: {
    fen: string
    move: [string, string]
    check?: Check
  }
  shapes?: DrawShape[]
}

export const GameBoard: React.FC<Props> = ({
  game,
  moves,
  move,
  setCurrentMove,
  setCurrentSquare,
  shapes,
}: Props) => {
  const { currentIndex, orientation } = useContext(GameControllerContext)

  const after = useCallback(
    (from: string, to: string) => {
      if (setCurrentMove) setCurrentMove([from, to])
      if (setCurrentSquare) setCurrentSquare(null)
    },
    [setCurrentMove, setCurrentSquare],
  )

  return (
    <Chessground
      contained
      config={{
        movable: {
          free: false,
          dests: moves as any,
          events: {
            after,
          },
        },
        events: {
          select: (key) => {
            setCurrentMove && setCurrentMove(null)
            setCurrentSquare && setCurrentSquare(key)
          },
        },
        drawable: {
          autoShapes: shapes || [],
        },
        fen: move ? move.fen : game.moves[currentIndex]?.board,
        lastMove: move
          ? move.move
          : [...((game.moves[currentIndex]?.lastMove ?? []) as any)],
        check: move ? move.check : game.moves[currentIndex]?.check,
        orientation,
      }}
    />
  )
}
