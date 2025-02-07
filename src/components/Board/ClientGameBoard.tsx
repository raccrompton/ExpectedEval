/* eslint-disable @typescript-eslint/no-explicit-any */
import { defaults } from 'chessground/state'
import type { Key } from 'chessground/types'
import Chessground from '@react-chess/chessground'
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import type { DrawBrushes, DrawShape } from 'chessground/draw'

import { BaseGame, Check } from 'src/types'
import { ClientGameControllerContext } from 'src/contexts'

interface Props {
  game: BaseGame
  moves?: Map<string, string[]>
  setCurrentMove?: (move: [string, string] | null) => void
  setCurrentSquare?: Dispatch<SetStateAction<Key | null>>
  move?: {
    fen: string
    move: [string, string]
    check?: Check
  }
  shapes?: DrawShape[]
  brushes?: DrawBrushes
}

export const ClientGameBoard: React.FC<Props> = ({
  game,
  moves,
  move,
  setCurrentMove,
  setCurrentSquare,
  shapes,
  brushes,
}: Props) => {
  const { currentNode, orientation } = useContext(ClientGameControllerContext)

  const after = useCallback(
    (from: string, to: string) => {
      if (setCurrentMove) setCurrentMove([from, to])
      if (setCurrentSquare) setCurrentSquare(null)
    },
    [setCurrentMove, setCurrentSquare],
  )

  const currentMove = useMemo(() => {
    if (!currentNode) return null

    return {
      fen: currentNode.fen,
      move: currentNode.move
        ? ([currentNode.move.slice(0, 2), currentNode.move.slice(2, 4)] as [
            Key,
            Key,
          ])
        : undefined,
      check: currentNode.check,
    }
  }, [currentNode])

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
          brushes: { ...defaults().drawable.brushes, ...brushes },
        },
        fen: currentMove?.fen,
        lastMove: currentMove?.move as Key[],
        check: currentMove?.check,
        orientation,
      }}
    />
  )
}
