/* eslint-disable @typescript-eslint/no-explicit-any */
import { Chess } from 'chess.ts'
import { defaults } from 'chessground/state'
import type { Key } from 'chessground/types'
import Chessground from '@react-chess/chessground'
import type { DrawBrushes, DrawShape } from 'chessground/draw'
import { ClientBaseGame, Check, GameNode, Color } from 'src/types'
import {
  useMemo,
  Dispatch,
  useCallback,
  SetStateAction,
  useEffect,
} from 'react'

interface Props {
  game: ClientBaseGame
  moves?: Map<string, string[]>
  currentNode: GameNode
  orientation: Color
  goToNode: (node: GameNode) => void
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
  currentNode,
  orientation,
  goToNode,
  setCurrentMove,
  setCurrentSquare,
  shapes,
  brushes,
}: Props) => {
  useEffect(() => {
    console.log(currentNode)
  }, [currentNode])

  const after = useCallback(
    (from: string, to: string) => {
      if (!game.tree || !currentNode) return

      if (setCurrentMove) setCurrentMove([from, to])
      if (setCurrentSquare) setCurrentSquare(null)

      const chess = new Chess(currentNode.fen) // Use currentNode.fen

      const moveAttempt = chess.move({ from: from, to: to })

      if (moveAttempt) {
        const newFen = chess.fen()
        const moveString = from + to
        const san = moveAttempt.san

        if (currentNode.mainChild?.move === moveString) {
          goToNode(currentNode.mainChild)
        } else {
          const newVariation = game.tree.addVariation(
            currentNode,
            newFen,
            moveString,
            san,
          )
          goToNode(newVariation)
        }
      }
    },
    [setCurrentMove, setCurrentSquare, currentNode, game.tree, goToNode],
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
