import { Chess, Piece, SQUARES } from 'chess.ts'
import { useMemo, useState, useCallback, useEffect } from 'react'
import {
  PlayGameConfig,
  GameTree,
  GameNode,
  Color,
  Termination,
  Check,
} from 'src/types'
import { PlayedGame } from 'src/types/play'
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

export const usePlayMaiaController = (id: string, config: PlayGameConfig) => {
  // Core game state
  const [gameTree, setGameTree] = useState<GameTree>(
    () => new GameTree(config.startFen || nullFen),
  )
  const [moveTimes, setMoveTimes] = useState<number[]>([])
  const [resigned, setResigned] = useState<boolean>(false)

  // Clock state
  const [baseMinutes, incrementSeconds] =
    config.timeControl == 'unlimited'
      ? [0, 0]
      : config.timeControl.split('+').map(Number)
  const initialClockValue = baseMinutes * 60 * 1000

  const [whiteClock, setWhiteClock] = useState<number>(initialClockValue)
  const [blackClock, setBlackClock] = useState<number>(initialClockValue)
  const [lastMoveTime, setLastMoveTime] = useState<number>(0)

  // Navigation state
  const [currentNode, setCurrentNode] = useState<GameNode | undefined>(() =>
    gameTree.getRoot(),
  )
  const [orientation, setOrientation] = useState<'white' | 'black'>(
    config.player,
  )

  // Derived game state
  const moveList = useMemo(() => gameTree.toMoveArray(), [gameTree])

  const game: PlayedGame = useMemo(() => {
    const mainLine = gameTree.getMainLine()
    const lastNode = mainLine[mainLine.length - 1]
    const chess = new Chess(lastNode.fen)

    const termination = resigned
      ? ({
          result: chess.turn() == 'w' ? '0-1' : '1-0',
          winner: chess.turn() == 'w' ? 'black' : 'white',
          type: Math.min(whiteClock, blackClock) > 0 ? 'resign' : 'time',
        } as Termination)
      : computeTermination(chess)

    // Build moves array for compatibility
    const moves = []
    const rootNode = gameTree.getRoot()
    const rootChess = new Chess(rootNode.fen)
    moves.push({
      board: rootNode.fen,
      check: rootChess.inCheck()
        ? ((rootChess.turn() === 'w' ? 'white' : 'black') as Check)
        : false,
    })

    for (let i = 1; i < mainLine.length; i++) {
      const node = mainLine[i]
      const nodeChess = new Chess(node.fen)
      moves.push({
        board: node.fen,
        san: node.san || undefined,
        lastMove: node.move
          ? ([node.move.slice(0, 2), node.move.slice(2, 4)] as [string, string])
          : undefined,
        uci: node.move || undefined,
        check: nodeChess.inCheck()
          ? ((nodeChess.turn() === 'w' ? 'white' : 'black') as Check)
          : false,
      })
    }

    return {
      id,
      moves,
      tree: gameTree,
      termination,
      turn: chess.turn() == 'b' ? 'black' : 'white',
    }
  }, [gameTree, resigned, whiteClock, blackClock, id])

  const toPlay: Color | null = game.termination ? null : game.turn
  const playerActive = toPlay == config.player

  // Available moves and pieces
  const { availableMoves, pieces } = useMemo(() => {
    if (!currentNode) return { availableMoves: [], pieces: {} }

    const chess = new Chess(currentNode.fen)
    const verboseMoves = chess.moves({ verbose: true })

    const cantMove = !playerActive || game.termination

    const availableMoves = cantMove
      ? []
      : verboseMoves.map((move) => ({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
          piece: move.piece,
        }))

    const pieces: Record<string, Piece> = {}
    for (const [square] of Object.entries(SQUARES)) {
      const piece = chess.get(square)
      if (piece) {
        pieces[square] = piece
      }
    }

    return { availableMoves, pieces }
  }, [currentNode, playerActive, game.termination])

  // Navigation helpers
  const goToNode = useCallback((node: GameNode) => setCurrentNode(node), [])
  const goToNextNode = useCallback(() => {
    if (currentNode?.mainChild) setCurrentNode(currentNode.mainChild)
  }, [currentNode])
  const goToPreviousNode = useCallback(() => {
    if (currentNode?.parent) setCurrentNode(currentNode.parent)
  }, [currentNode])
  const goToRootNode = useCallback(
    () => setCurrentNode(gameTree.getRoot()),
    [gameTree],
  )

  const plyCount = useMemo(() => gameTree.getMainLine().length, [gameTree])

  // Clock management
  const updateClock = useCallback(
    (overrideTime: number | undefined = undefined): number => {
      if (moveList.length < 2) {
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
      moveList.length,
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
    if (
      playerActive &&
      moveList.length > 1 &&
      config.timeControl != 'unlimited'
    ) {
      const timeRemaining = config.player == 'white' ? whiteClock : blackClock
      const timeout = setTimeout(() => {
        updateClock()
        setResigned(true)
      }, timeRemaining)

      return () => clearTimeout(timeout)
    }
  }, [
    blackClock,
    moveList.length,
    config.player,
    playerActive,
    config.timeControl,
    updateClock,
    whiteClock,
  ])

  // Move handling
  const addMove = useCallback(
    (moveUci: string) => {
      const mainLine = gameTree.getMainLine()
      const lastNode = mainLine[mainLine.length - 1]
      const chess = new Chess(lastNode.fen)
      const result = chess.move(moveUci, { sloppy: true })

      if (result) {
        const newTree = new GameTree(gameTree.getRoot().fen)
        // Rebuild tree with existing moves plus new move
        const existingMoves = gameTree.toMoveArray()
        let node = newTree.getRoot()

        for (const move of [...existingMoves, moveUci]) {
          const tempChess = new Chess(node.fen)
          const tempResult = tempChess.move(move, { sloppy: true })
          if (tempResult) {
            node = newTree.addMainMove(
              node,
              tempChess.fen(),
              move,
              tempResult.san,
            )
          }
        }

        setGameTree(newTree)
        setCurrentNode(node) // Move to the new position
      }
    },
    [gameTree],
  )

  const addMoveWithTime = useCallback(
    (moveUci: string, moveTime: number) => {
      addMove(moveUci)
      setMoveTimes([...moveTimes, moveTime])
    },
    [addMove, moveTimes],
  )

  // Legacy compatibility
  const setMoves = useCallback(
    (newMoves: string[]) => {
      const newTree = new GameTree(config.startFen || nullFen)
      let node = newTree.getRoot()

      for (const move of newMoves) {
        const chess = new Chess(node.fen)
        const result = chess.move(move, { sloppy: true })
        if (result) {
          node = newTree.addMainMove(node, chess.fen(), move, result.san)
        }
      }

      setGameTree(newTree)
      setCurrentNode(node)
    },
    [config.startFen],
  )

  const reset = () => {
    setGameTree(new GameTree(config.startFen || nullFen))
    setCurrentNode(gameTree.getRoot())
    setMoveTimes([])
    setResigned(false)
    setLastMoveTime(0)
    setWhiteClock(initialClockValue)
    setBlackClock(initialClockValue)
  }

  const makeMove = async (moveUci: string): Promise<void> => {
    throw new Error('makeMove should be overridden by the consuming component')
  }

  const stats: AllStats = {
    lifetime: undefined,
    session: { gamesWon: 0, gamesPlayed: 0 },
    lastRating: undefined,
    rating: 0,
  }

  return {
    // Game state
    game,
    gameTree,
    currentNode,
    player: config.player,
    playType: config.playType,
    maiaVersion: config.maiaVersion,
    toPlay,
    playerActive,
    moveList,
    moves: moveList,
    moveTimes,
    availableMoves,
    pieces,
    timeControl: config.timeControl,
    whiteClock,
    blackClock,
    lastMoveTime,
    stats,

    setCurrentNode,
    goToNode,
    goToNextNode,
    goToPreviousNode,
    goToRootNode,
    plyCount,
    orientation,
    setOrientation,

    addMove,
    addMoveWithTime,
    setMoves,
    setMoveTimes,
    setResigned,
    reset,
    makeMove,
    updateClock,
  }
}
