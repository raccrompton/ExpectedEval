/* eslint-disable @typescript-eslint/no-explicit-any */
import { Chess } from 'chess.ts'
import { defaults } from 'chessground/state'
import { useCallback, useContext } from 'react'
import Chessground from '@react-chess/chessground'
import type { DrawBrushes, DrawShape } from 'chessground/draw'
import type { Key } from 'chessground/types'

import { useChessSound } from 'src/hooks'
import { BaseGame, Check, GameNode } from 'src/types'
import { GameControllerContext } from 'src/contexts'
import { PlayTreeControllerContext } from 'src/contexts/PlayTreeControllerContext/PlayTreeControllerContext'

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
  currentNode?: GameNode
  shapes?: DrawShape[]
  brushes?: DrawBrushes
}

export const GameBoard: React.FC<Props> = ({
  game,
  moves,
  move,
  currentNode,
  setCurrentMove,
  setCurrentSquare,
  shapes,
  brushes,
}: Props) => {
  const { currentIndex, orientation } = useContext(GameControllerContext)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const treeCtx: any = useContext(PlayTreeControllerContext as any)
  const boardOrientation: 'white' | 'black' =
    treeCtx?.orientation || orientation
  const { playSound } = useChessSound()

  const after = useCallback(
    (from: string, to: string) => {
      if (setCurrentMove) setCurrentMove([from, to])
      if (setCurrentSquare) setCurrentSquare(null)

      const currentFen = currentNode
        ? currentNode.fen
        : move
          ? move.fen
          : game.moves[currentIndex]?.board
      if (currentFen) {
        const chess = new Chess(currentFen)
        const pieceAtDestination = chess.get(to)
        const isCapture = !!pieceAtDestination

        playSound(isCapture)
      } else {
        playSound(false)
      }
    },
    [
      setCurrentMove,
      setCurrentSquare,
      move,
      game.moves,
      currentIndex,
      playSound,
      currentNode,
    ],
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
          brushes: { ...defaults().drawable.brushes, ...brushes },
        },
        fen: currentNode
          ? currentNode.fen
          : move
            ? move.fen
            : game.moves[currentIndex]?.board,
        lastMove: currentNode
          ? currentNode.move
            ? ([currentNode.move.slice(0, 2), currentNode.move.slice(2, 4)] as [
                Key,
                Key,
              ])
            : []
          : move
            ? move.move
            : [...((game.moves[currentIndex]?.lastMove ?? []) as any)],
        check: currentNode
          ? currentNode.check
          : move
            ? move.check
            : game.moves[currentIndex]?.check,
        orientation: boardOrientation,
      }}
    />
  )
}
