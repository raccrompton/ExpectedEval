import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { AnimatePresence, motion } from 'framer-motion'
import { Chess } from 'chess.ts'
import Chessground from '@react-chess/chessground'
import { getLichessTVGame, streamLichessGame } from 'src/api/lichess/streaming'

interface LiveGameData {
  gameId: string
  white?: {
    name: string
    rating?: number
  }
  black?: {
    name: string
    rating?: number
  }
  currentFen?: string
  isLive?: boolean
}

export const LiveChessBoard: React.FC = () => {
  const router = useRouter()
  const [liveGame, setLiveGame] = useState<LiveGameData | null>(null)
  const [currentFen, setCurrentFen] = useState<string>(
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  )
  const [isHovered, setIsHovered] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortController = useRef<AbortController | null>(null)

  const handleGameStart = useCallback((gameData: any) => {
    console.log('Live board - Game started:', gameData)
    if (gameData.fen) {
      setCurrentFen(gameData.fen)
    }
    setLiveGame({
      gameId: gameData.id || gameData.gameId,
      white: gameData.players?.white?.user || gameData.white,
      black: gameData.players?.black?.user || gameData.black,
      currentFen: gameData.fen,
      isLive: true,
    })
  }, [])

  const handleMove = useCallback((moveData: any) => {
    console.log('Live board - New move:', moveData)
    if (moveData.fen) {
      setCurrentFen(moveData.fen)
    }
  }, [])

  const handleStreamComplete = useCallback(() => {
    console.log('Live board - Stream completed')
    // Try to get a new live game
    fetchNewGame()
  }, [])

  const fetchNewGame = useCallback(async () => {
    try {
      setError(null)
      const tvGame = await getLichessTVGame()

      // Stop current stream if any
      if (abortController.current) {
        abortController.current.abort()
      }

      // Start new stream
      abortController.current = new AbortController()

      setLiveGame({
        gameId: tvGame.gameId,
        white: tvGame.white,
        black: tvGame.black,
        isLive: true,
      })

      // Start streaming the new game
      streamLichessGame(
        tvGame.gameId,
        handleGameStart,
        handleMove,
        handleStreamComplete,
        abortController.current.signal,
      ).catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Live board streaming error:', err)
          setError('Connection lost')
        }
      })
    } catch (err) {
      console.error('Error fetching new live game:', err)
      setError('Failed to load live game')
    }
  }, [handleGameStart, handleMove, handleStreamComplete])

  useEffect(() => {
    // Initial fetch
    fetchNewGame()

    // Cleanup on unmount
    return () => {
      if (abortController.current) {
        abortController.current.abort()
      }
    }
  }, []) // Remove fetchNewGame dependency to prevent re-renders

  const handleClick = () => {
    if (liveGame?.gameId) {
      router.push(`/analysis/stream/${liveGame.gameId}`)
    }
  }

  // Convert FEN to chessground position
  const chess = new Chess(currentFen)
  const position = chess.board()
  const pieces = new Map()

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = position[rank][file]
      if (piece) {
        const square =
          String.fromCharCode('a'.charCodeAt(0) + file) + (8 - rank).toString()
        const color = piece.color === 'w' ? 'white' : 'black'
        const role =
          piece.type === 'n'
            ? 'knight'
            : piece.type === 'b'
              ? 'bishop'
              : piece.type === 'r'
                ? 'rook'
                : piece.type === 'q'
                  ? 'queen'
                  : piece.type === 'k'
                    ? 'king'
                    : 'pawn'
        pieces.set(square, { color, role })
      }
    }
  }

  return (
    <motion.div
      className="absolute bottom-4 left-4 z-20 hidden cursor-pointer md:block"
      initial={{ opacity: 0.4, scale: 1.0 }}
      animate={{
        opacity: isHovered ? 0.9 : 0.4,
        scale: isHovered ? 1.01 : 1.0,
      }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="relative">
        {/* Live indicator */}
        {liveGame?.isLive && (
          <div className="absolute -right-4 -top-4 z-10 flex items-center gap-1 rounded-full bg-red-500 px-2 py-1">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            <span className="text-xs font-semibold text-white">LIVE</span>
          </div>
        )}

        {/* Chess board */}
        <div className="aspect-square h-24 w-24">
          <Chessground
            contained
            config={{
              fen: currentFen,
              viewOnly: true,
              coordinates: false,
              drawable: {
                enabled: false,
              },
              highlight: {
                lastMove: true,
                check: true,
              },
              animation: {
                enabled: true,
                duration: 200,
              },
            }}
          />
        </div>

        <AnimatePresence>
          {/* Game info on hover */}
          {isHovered && liveGame && (
            <motion.div
              className="absolute left-[calc(100%+0.5rem)] top-3 flex w-48 flex-col items-center justify-center rounded border border-white/10 bg-background-1/60"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex w-full items-center justify-center border-b border-white/10 py-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-human-2">
                  Lichess TV Analysis
                </span>
              </div>
              <div className="flex flex-row items-center gap-1 px-2 pt-2 text-xxs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full border bg-white" />
                    <span className="font-medium">
                      {liveGame.white?.name || 'White'}
                    </span>
                    {liveGame.white?.rating && (
                      <span className="text-secondary">
                        ({liveGame.white.rating})
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-secondary">vs.</span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-black" />
                    <span className="font-medium">
                      {liveGame.black?.name || 'Black'}
                    </span>
                    {liveGame.black?.rating && (
                      <span className="text-secondary">
                        ({liveGame.black.rating})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-1.5 flex items-center justify-start px-2 pb-2">
                <span className="text-xxs text-secondary">
                  Click to watch live analysis →
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
