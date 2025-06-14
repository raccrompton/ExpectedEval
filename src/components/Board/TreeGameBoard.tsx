/* eslint-disable @typescript-eslint/no-explicit-any */
import { Chess } from 'chess.ts'
import { defaults } from 'chessground/state'
import {
  useCallback,
  useContext,
  useMemo,
  Dispatch,
  SetStateAction,
} from 'react'
import Chessground from '@react-chess/chessground'
import type { DrawBrushes, DrawShape } from 'chessground/draw'
import type { Key } from 'chessground/types'

import { useChessSound } from 'src/hooks'
import { BaseGame, Check, GameNode, ClientBaseGame, Color } from 'src/types'
import {
  GameControllerContext,
  AnalysisGameControllerContext,
  TuringTreeControllerContext,
} from 'src/contexts'
import { PlayTreeControllerContext } from 'src/contexts/PlayTreeControllerContext/PlayTreeControllerContext'
import { TrainingTreeControllerContext } from 'src/contexts/TrainingTreeControllerContext/TrainingTreeControllerContext'

interface Props {
  // Game data
  game?: BaseGame | ClientBaseGame

  // Board state
  currentNode?: GameNode
  orientation?: Color
  moves?: Map<string, string[]>

  // Current move state (for training/analysis)
  move?: {
    fen: string
    move: [string, string]
    check?: Check
  }

  // Fallback data for legacy compatibility
  currentIndex?: number

  // Event handlers
  setCurrentMove?: (move: [string, string] | null) => void
  setCurrentSquare?:
    | ((key: string | null) => void)
    | Dispatch<SetStateAction<Key | null>>

  // Visual elements
  shapes?: DrawShape[]
  brushes?: DrawBrushes

  // Analysis-specific functionality
  goToNode?: (node: GameNode) => void
  gameTree?: any
}

export const TreeGameBoard: React.FC<Props> = ({
  game,
  currentNode,
  orientation = 'white',
  moves,
  move,
  currentIndex,
  setCurrentMove,
  setCurrentSquare,
  shapes,
  brushes,
  goToNode,
  gameTree,
}: Props) => {
  const { playSound } = useChessSound()

  const after = useCallback(
    (from: string, to: string) => {
      if (setCurrentMove) setCurrentMove([from, to])
      if (setCurrentSquare) setCurrentSquare(null)

      // Determine current FEN for sound calculation
      const currentFen = currentNode
        ? currentNode.fen
        : move
          ? move.fen
          : game?.moves?.[currentIndex || 0]?.board

      if (currentFen) {
        const chess = new Chess(currentFen)
        const pieceAtDestination = chess.get(to)
        const isCapture = !!pieceAtDestination

        // Handle analysis board move creation (if gameTree and goToNode are provided)
        if (
          gameTree &&
          goToNode &&
          currentNode &&
          game &&
          'tree' in game &&
          game.tree
        ) {
          const moveAttempt = chess.move({ from: from, to: to })
          if (moveAttempt) {
            playSound(isCapture)

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
        } else {
          playSound(isCapture)
        }
      } else {
        playSound(false)
      }
    },
    [
      setCurrentMove,
      setCurrentSquare,
      currentNode,
      move,
      game,
      currentIndex,
      playSound,
      gameTree,
      goToNode,
    ],
  )

  // Determine board configuration
  const boardConfig = useMemo(() => {
    // For training: prioritize move result over currentNode when a move is made
    const fen = move
      ? move.fen
      : currentNode
        ? currentNode.fen
        : game?.moves?.[currentIndex || 0]?.board

    const lastMove = move
      ? move.move
      : currentNode
        ? currentNode.move
          ? ([currentNode.move.slice(0, 2), currentNode.move.slice(2, 4)] as [
              Key,
              Key,
            ])
          : []
        : [...((game?.moves?.[currentIndex || 0]?.lastMove ?? []) as any)]

    const check = move
      ? move.check
      : currentNode
        ? currentNode.check
        : game?.moves?.[currentIndex || 0]?.check

    return {
      fen,
      lastMove,
      check,
      orientation: orientation as 'white' | 'black',
    }
  }, [move, currentNode, game, currentIndex, orientation])

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
        fen: boardConfig.fen,
        lastMove: boardConfig.lastMove as Key[],
        check: boardConfig.check,
        orientation: boardConfig.orientation,
      }}
    />
  )
}
