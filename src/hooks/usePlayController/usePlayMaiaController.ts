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
  const [gameTree, setGameTree] = useState<GameTree>(
    () => new GameTree(config.startFen || nullFen),
  )
  const [treeVersion, setTreeVersion] = useState<number>(0)
  const [resigned, setResigned] = useState<boolean>(false)

  const [baseMinutes, incrementSeconds] =
    config.timeControl == 'unlimited'
      ? [0, 0]
      : config.timeControl.split('+').map(Number)
  const initialClockValue = baseMinutes * 60 * 1000

  const [whiteClock, setWhiteClock] = useState<number>(initialClockValue)
  const [blackClock, setBlackClock] = useState<number>(initialClockValue)
  const [lastMoveTime, setLastMoveTime] = useState<number>(0)

  const [currentNode, setCurrentNode] = useState<GameNode>(gameTree.getRoot())
  const [orientation, setOrientation] = useState<'white' | 'black'>(
    config.player,
  )

  const moveList = useMemo(
    () => gameTree.toMoveArray(),
    [gameTree, treeVersion],
  )

  const moveTimes = useMemo(
    () => gameTree.toTimeArray(),
    [gameTree, treeVersion],
  )

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
  }, [gameTree, treeVersion, resigned, whiteClock, blackClock, id])

  const toPlay: Color | null = game.termination ? null : game.turn
  const playerActive = toPlay == config.player

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
  }, [currentNode, playerActive, game.termination, treeVersion])

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

  const plyCount = useMemo(
    () => gameTree.getMainLine().length,
    [gameTree, treeVersion],
  )

  const updateClock = useCallback(
    (overrideTime: number | undefined = undefined): number => {
      if (moveList.length < 2) {
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

      setLastMoveTime(now)
      return elapsed
    },
    [
      moveList.length,
      lastMoveTime,
      toPlay,
      whiteClock,
      blackClock,
      incrementSeconds,
    ],
  )

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

  const addMove = useCallback(
    (moveUci: string) => {
      const newNode = gameTree.addMoveToMainLine(moveUci)
      if (newNode) {
        setCurrentNode(newNode)
        // Force re-render by incrementing tree version
        setTreeVersion((prev) => prev + 1)
      }
    },
    [gameTree],
  )

  const addMoveWithTime = useCallback(
    (moveUci: string, moveTime: number) => {
      const newNode = gameTree.addMoveToMainLine(moveUci, moveTime)
      if (newNode) {
        setCurrentNode(newNode)
        // Force re-render by incrementing tree version
        setTreeVersion((prev) => prev + 1)
      }
    },
    [gameTree],
  )

  const reset = () => {
    const newTree = new GameTree(config.startFen || nullFen)
    setGameTree(newTree)
    setCurrentNode(newTree.getRoot())
    setResigned(false)
    setLastMoveTime(0)
    setWhiteClock(initialClockValue)
    setBlackClock(initialClockValue)
    setTreeVersion((prev) => prev + 1)
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
    setResigned,
    reset,
    makeMove,
    updateClock,
  }
}
