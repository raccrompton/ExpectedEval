/**
 * FILE: GameBoard.tsx
 *
 * PURPOSE:
 * React wrapper for chessground, the Lichess chess board library.
 * Displays an interactive chess board that can show any position.
 *
 * HOW IT FITS IN:
 * - Used by: pages/index.tsx to display the main analysis board
 * - Depends on: chessground library, globals.css for board styling
 *
 * KEY CONCEPTS:
 * - useRef: React hook to get a reference to a DOM element (chessground needs this)
 * - useEffect: React hook to run code after component mounts (initialize chessground)
 * - Cleanup function: Returned from useEffect to run when component unmounts
 */

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import type { Key } from 'chessground/types'
import { Chess } from 'chessops/chess'
import { parseFen } from 'chessops/fen'
import { makeSquare } from 'chessops/util'

/** Props for the GameBoard component */
interface GameBoardProps {
  /** Position in FEN notation (defaults to starting position) */
  fen?: string
  /** Board orientation - 'white' (default) or 'black' */
  orientation?: 'white' | 'black'
  /** Callback when a move is made (from, to, optional promotion) */
  onMove?: (from: string, to: string, promotion?: string) => void
  /** If true, board is view-only (no moves allowed) */
  viewOnly?: boolean
}

/** Standard chess starting position FEN */
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/**
 * Compute legal move destinations from FEN using chessops.
 * Returns format expected by chessground: Map<square, destinations[]>
 */
function computeDests(fen: string): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>()

  const setup = parseFen(fen)
  if (!setup.isOk) return dests

  const pos = Chess.fromSetup(setup.value)
  if (!pos.isOk) return dests

  for (const [from, destSet] of pos.value.allDests()) {
    const fromKey = makeSquare(from) as Key
    const toKeys: Key[] = []
    for (const to of destSet) {
      toKeys.push(makeSquare(to) as Key)
    }
    if (toKeys.length > 0) {
      dests.set(fromKey, toKeys)
    }
  }

  return dests
}

/**
 * Get whose turn it is from FEN.
 */
function getTurnColor(fen: string): 'white' | 'black' {
  const parts = fen.split(' ')
  return parts[1] === 'b' ? 'black' : 'white'
}

/**
 * Renders an interactive chess board using Chessground (Lichess library).
 * Displays the position specified by FEN and updates when props change.
 */
export function GameBoard({
  fen = STARTING_FEN,
  orientation = 'white',
  onMove,
  viewOnly = false,
}: GameBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [ground, setGround] = useState<Api | null>(null)

  // Compute legal destinations when FEN changes
  const dests = useMemo(() => computeDests(fen), [fen])
  const turnColor = useMemo(() => getTurnColor(fen), [fen])

  // Stable move handler
  const handleMove = useCallback(
    (from: Key, to: Key) => {
      if (onMove) {
        onMove(from, to)
      }
    },
    [onMove]
  )

  useEffect(() => {
    if (!boardRef.current) {
      return
    }

    const isInteractive = !viewOnly && !!onMove

    const api = Chessground(boardRef.current, {
      fen,
      orientation,
      viewOnly: !isInteractive,
      coordinates: true,
      animation: {
        enabled: true,
        duration: 150,
      },
      movable: isInteractive
        ? {
            free: false,
            color: turnColor,
            dests,
            showDests: true,
            events: {
              after: handleMove,
            },
          }
        : undefined,
    })

    setGround(api)

    return () => {
      api.destroy()
    }
  }, [])

  useEffect(() => {
    if (ground) {
      const isInteractive = !viewOnly && !!onMove

      ground.set({
        fen,
        orientation,
        viewOnly: !isInteractive,
        turnColor,
        movable: isInteractive
          ? {
              free: false,
              color: turnColor,
              dests,
              showDests: true,
              events: {
                after: handleMove,
              },
            }
          : undefined,
      })
    }
  }, [ground, fen, orientation, viewOnly, onMove, dests, turnColor, handleMove])

  return (
    <div data-testid="game-board" className="board-container">
      <div
        ref={boardRef}
        className="cg-wrap"
        role="img"
        aria-label="Chess board showing current position"
      />
      <style jsx>{`
        .board-container {
          width: 100%;
          max-width: 560px;
          aspect-ratio: 1;
          position: relative;
          overflow: hidden;
        }
        .cg-wrap {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  )
}
