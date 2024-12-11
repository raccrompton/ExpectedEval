import { useState, useMemo, useCallback, useEffect } from 'react'
import { Color, Move, Termination } from 'src/types'
import { Chess, Piece, SQUARES } from 'chess.ts'
import { PlayedGame, PlayGameConfig } from 'src/types/play'
import { AllStats } from '../useStats'

const nullFen = new Chess().fen()

const computeTermination = (chess: Chess): Termination | undefined => {
  if (!chess.gameOver()) {
    return undefined
  }

  if (chess.inDraw() || chess.inStalemate() || chess.inThreefoldRepetition()) {
    return {
      result: '1/2-1/2',
      winner: 'none',
      type: 'rules',
    }
  }

  const turn = chess.turn() == 'w' ? 'white' : 'black'

  if (chess.inCheckmate()) {
    return {
      result: turn == 'white' ? '0-1' : '1-0',
      winner: turn == 'white' ? 'black' : 'white',
      type: 'rules',
    }
  }
}

const movesUciToGame = (
  startFen: string | undefined,
  id: string,
  movesUci: string[],
  resigned: boolean,
  clock: number,
): PlayedGame => {
  const chess = new Chess(startFen || nullFen)

  const newMoves: Move[] = [
    {
      board: startFen || nullFen,
      check: chess.inCheck() ? 'white' : undefined,
    },
  ]

  for (let i = 0; i < movesUci.length; i += 1) {
    const moveUci = movesUci[i]

    const result = chess.move(moveUci, { sloppy: true })

    if (result == null) {
      throw new Error('invalid moves (' + movesUci + ')')
    }

    const checkTurn = chess.turn() == 'w' ? 'white' : 'black'

    newMoves.push({
      board: chess.fen(),
      san: result.san,
      lastMove: [result.from, result.to],
      uci: moveUci,
      check: chess.inCheck() ? checkTurn : undefined,
    })
  }

  const termination = resigned
    ? ({
        result: chess.turn() == 'w' ? '0-1' : '1-0',
        winner: chess.turn() == 'w' ? 'black' : 'white',
        type: clock > 0 ? 'resign' : 'time',
      } as Termination)
    : computeTermination(chess)

  const newGame: PlayedGame = {
    id: id,
    moves: newMoves,
    termination: termination,
    turn: chess.turn() == 'b' ? 'black' : 'white',
  }

  return newGame
}

export const usePlayController = (
  id: string,
  { player, playType, maiaVersion, timeControl, startFen }: PlayGameConfig,
) => {
  const [moves, setMoves] = useState<string[]>([])
  const [moveTimes, setMoveTimes] = useState<number[]>([])
  const [resigned, setResigned] = useState<boolean>(false)

  const [baseMinutes, incrementSeconds] =
    timeControl == 'unlimited' ? [0, 0] : timeControl.split('+').map(Number)
  const initialClockValue = baseMinutes * 60 * 1000

  const [whiteClock, setWhiteClock] = useState<number>(initialClockValue)
  const [blackClock, setBlackClock] = useState<number>(initialClockValue)
  const [lastMoveTime, setLastMoveTime] = useState<number>(0)

  const game = useMemo(
    () =>
      movesUciToGame(
        startFen,
        id,
        moves,
        resigned,
        Math.min(whiteClock, blackClock),
      ),
    [startFen, id, moves, resigned, whiteClock, blackClock],
  )

  const toPlay: Color | null = game.termination ? null : game.turn
  const playerActive = toPlay == player

  const { availableMoves, pieces } = useMemo(() => {
    const fen = game.moves[game.moves.length - 1].board

    const chess = new Chess(fen)

    const verboseMoves = chess.moves({ verbose: true })

    const cantMove = !playerActive || game.termination

    const availableMoves = cantMove
      ? []
      : verboseMoves.map((move) => {
          return {
            from: move.from,
            to: move.to,
            promotion: move.promotion,
            piece: move.piece,
          }
        })

    const pieces: Record<string, Piece> = {}
    for (const [square, i] of Object.entries(SQUARES)) {
      const piece = chess.get(square)
      if (piece) {
        pieces[square] = piece
      }
    }

    return { availableMoves, pieces }
  }, [playerActive, game])

  const updateClock = useCallback(
    (overrideTime: number | undefined = undefined): number => {
      if (moves.length < 2) {
        setMoveTimes([...moveTimes, 0])
        return 0 // Clock does not start until first two moves made
      }

      const now = Date.now()
      const elapsed =
        overrideTime === undefined ? now - lastMoveTime : overrideTime

      if (lastMoveTime > 0) {
        if (toPlay == 'white') {
          setWhiteClock(
            Math.max(whiteClock - elapsed + incrementSeconds * 1000, 0),
          )
        } else {
          setBlackClock(
            Math.max(blackClock - elapsed + incrementSeconds * 1000, 0),
          )
        }
      }

      setMoveTimes([...moveTimes, elapsed])
      setLastMoveTime(now)
      return elapsed
    },
    [
      moves.length,
      lastMoveTime,
      moveTimes,
      toPlay,
      whiteClock,
      blackClock,
      incrementSeconds,
    ],
  )

  // Game end by time
  useEffect(() => {
    if (playerActive && moves.length > 1 && timeControl != 'unlimited') {
      const timeRemaining = player == 'white' ? whiteClock : blackClock
      const timeout = setTimeout(() => {
        updateClock()
        setResigned(true)
      }, timeRemaining)

      return () => clearTimeout(timeout)
    }
  }, [
    blackClock,
    moves.length,
    player,
    playerActive,
    timeControl,
    updateClock,
    whiteClock,
  ])

  const reset = () => {
    setMoves([])
    setMoveTimes([])
    setResigned(false)
    setLastMoveTime(0)
    setWhiteClock(initialClockValue)
    setBlackClock(initialClockValue)
  }

  const makeMove = async (moveUci: string): Promise<void> => {
    throw new Error('poorly provided PlayController')
  }

  const setCurrentSquare = async (key: string | null) => undefined

  const stats: AllStats = {
    lifetime: undefined,
    session: { gamesWon: 0, gamesPlayed: 0 },
    lastRating: undefined,
    rating: 0,
  }

  return {
    game,
    player,
    playType,
    maiaVersion,
    toPlay,
    playerActive,
    moves,
    moveTimes,
    availableMoves,
    pieces,
    timeControl,
    whiteClock,
    blackClock,
    lastMoveTime,
    stats,
    setMoves,
    setMoveTimes,
    setResigned,
    reset,
    makeMove,
    updateClock,
    setCurrentSquare,
  }
}
