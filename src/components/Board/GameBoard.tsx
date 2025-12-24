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

import { useRef, useEffect, useState } from 'react'
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'

/** Props for the GameBoard component */
interface GameBoardProps {
  /** Position in FEN notation (defaults to starting position) */
  fen?: string
  /** Board orientation - 'white' (default) or 'black' */
  orientation?: 'white' | 'black'
}

/** Standard chess starting position FEN */
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/**
 * Renders an interactive chess board using Chessground (Lichess library).
 * Displays the position specified by FEN and updates when props change.
 */
export function GameBoard({
  fen = STARTING_FEN,
  orientation = 'white',
}: GameBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [ground, setGround] = useState<Api | null>(null)

  useEffect(() => {
    if (!boardRef.current) {
      return
    }

    const api = Chessground(boardRef.current, {
      fen,
      orientation,
      viewOnly: true,
      coordinates: true,
      animation: {
        enabled: true,
        duration: 150,
      },
    })

    setGround(api)

    return () => {
      api.destroy()
    }
  }, [])

  useEffect(() => {
    if (ground) {
      ground.set({ fen, orientation })
    }
  }, [ground, fen, orientation])

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
        }
        .cg-wrap {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  )
}
