/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import {
  useMemo,
  Dispatch,
  useState,
  useEffect,
  useContext,
  useCallback,
  SetStateAction,
} from 'react'
import Head from 'next/head'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import type { Key } from 'chessground/types'
import type { DrawShape } from 'chessground/draw'
import {
  getTrainingGame,
  logPuzzleGuesses,
  getTrainingPlayerStats,
} from 'src/api'
import {
  Loading,
  GameInfo,
  Feedback,
  PuzzleLog,
  StatsDisplay,
  BoardController,
  ContinueAgainstMaia,
  AuthenticatedWrapper,
  GameBoard,
} from 'src/components'
import { useTrainingController } from 'src/hooks/useTrainingController'
import { AllStats, useStats } from 'src/hooks/useStats'
import { TrainingGame, Status } from 'src/types/training'
import { ModalContext, WindowSizeContext } from 'src/contexts'
import { TrainingControllerContext } from 'src/contexts/TrainingControllerContext'

const statsLoader = async () => {
  const stats = await getTrainingPlayerStats()
  return {
    gamesPlayed: Math.max(0, stats.totalPuzzles),
    gamesWon: stats.puzzlesSolved,
    rating: stats.rating,
  }
}

const TrainPage: NextPage = () => {
  const router = useRouter()
  const { openedModals, setInstructionsModalProps: setInstructionsModalProps } =
    useContext(ModalContext)

  useEffect(() => {
    if (!openedModals.train) {
      setInstructionsModalProps({ instructionsType: 'train' })
    }
    return () => setInstructionsModalProps(undefined)
  }, [setInstructionsModalProps, openedModals.train])

  const [trainingGames, setTrainingGames] = useState<TrainingGame[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [status, setStatus] = useState<Status>('default')
  const [stats, incrementStats, updateRating] = useStats(statsLoader)
  const [userGuesses, setUserGuesses] = useState<string[]>([])
  const [previousGameResults, setPreviousGameResults] = useState<
    (TrainingGame & { result?: boolean; ratingDiff?: number })[]
  >([])

  const getNewGame = useCallback(async () => {
    let game
    try {
      game = await getTrainingGame()
    } catch (e) {
      router.push('/401')
      return
    }

    setStatus('default')
    setUserGuesses([])
    setCurrentIndex(trainingGames.length)
    setTrainingGames(trainingGames.concat([game]))
    setPreviousGameResults(previousGameResults.concat([{ ...game }]))
  }, [trainingGames, previousGameResults, router])

  useEffect(() => {
    if (currentIndex == trainingGames.length - 1) {
      setStatus('default')
    } else {
      setStatus('archived')
    }
  }, [currentIndex])

  const logGuess = useCallback(
    async (
      gameId: string,
      move: [string, string] | null,
      status: Status,
      setStatus: Dispatch<SetStateAction<Status>>,
      rating: number,
    ) => {
      if (currentIndex != trainingGames.length - 1) {
        return // No logging for past puzzles
      }

      const newGuesses = move
        ? userGuesses.concat([move[0] + move[1]])
        : userGuesses
      setUserGuesses(newGuesses)
      setStatus('loading')

      const response = await logPuzzleGuesses(
        gameId,
        newGuesses,
        status === 'forfeit',
      )

      if (status === 'forfeit') {
        setPreviousGameResults((prev) => {
          return prev.map((game, index) => {
            return index == currentIndex
              ? {
                  ...game,
                  result: false,
                  ratingDiff: response.puzzle_elo - rating,
                }
              : game
          })
        })

        // If the user forfeits, update their stats
        if (userGuesses.length == 0) {
          updateRating(response.puzzle_elo)
          incrementStats(1, 0)
        }
        return
      }

      if (response.correct_moves.includes(newGuesses[newGuesses.length - 1])) {
        setStatus('correct')
      } else {
        setStatus('incorrect')
      }

      if (userGuesses.length == 0) {
        const result = response.correct_moves.includes(newGuesses[0])
        // This was the first guess, which is the only one that counts for correctness
        // After waiting for a while after logging the guess to accomodate slow server,
        // update stats
        if (newGuesses.length && response.correct_moves) {
          setPreviousGameResults((prev) => {
            return prev.map((game, index) => {
              return index == currentIndex
                ? {
                    ...game,
                    result,
                    ratingDiff: response.puzzle_elo - rating,
                  }
                : game
            })
          })
        }

        updateRating(response.puzzle_elo)
        incrementStats(1, result ? 1 : 0)
      }
    },
    [currentIndex, trainingGames.length, userGuesses, incrementStats],
  )

  useEffect(() => {
    if (trainingGames.length === 0) getNewGame()
  }, [getNewGame, trainingGames.length])

  if (trainingGames.length && trainingGames[currentIndex])
    return (
      <Train
        status={status}
        setStatus={setStatus}
        trainingGame={trainingGames[currentIndex]}
        viewing={currentIndex !== trainingGames.length - 1}
        stats={stats}
        getNewGame={getNewGame}
        logGuess={logGuess}
        gamesController={
          <>
            <div className="relative bottom-0 flex h-full min-h-[38px] flex-1 flex-col justify-end overflow-auto">
              <PuzzleLog
                previousGameResults={previousGameResults}
                setCurrentIndex={setCurrentIndex}
              />
            </div>
          </>
        }
      />
    )
  return <Loading />
}

interface Props {
  trainingGame: TrainingGame
  gamesController: React.ReactNode
  stats: AllStats
  status: Status
  setStatus: Dispatch<SetStateAction<Status>>
  viewing?: boolean
  getNewGame: () => Promise<void>
  logGuess: (
    gameId: string,
    move: [string, string] | null,
    status: Status,
    setStatus: Dispatch<SetStateAction<Status>>,
    rating: number,
  ) => void
}

const Train: React.FC<Props> = ({
  trainingGame,
  gamesController,
  stats,
  status,
  setStatus,
  getNewGame,
  logGuess,
}: Props) => {
  const controller = useTrainingController(trainingGame)

  const { width } = useContext(WindowSizeContext)
  const isMobile = useMemo(() => width > 0 && width <= 670, [width])
  const [movePlotHover, setMovePlotHover] = useState<DrawShape | null>(null)

  useEffect(() => {
    if (controller.currentNode.fen === controller.puzzleStartingNode.fen) {
      setStatus('default')
    }
  }, [controller.currentNode])

  const onSelectSquare = useCallback(
    (square: Key) => {
      controller.reset()
      setStatus('default')
    },
    [controller],
  )

  const onPlayerMakeMove = useCallback(
    (playedMove: [string, string]) => {
      const moveUci = playedMove[0] + playedMove[1]
      controller.onPlayerGuess(moveUci)

      if (status !== 'correct' && status !== 'forfeit') {
        logGuess(
          trainingGame.id,
          playedMove,
          status,
          setStatus,
          stats.rating ?? 0,
        )
      }
    },
    [controller, logGuess, trainingGame.id, status, setStatus],
  )

  const setAndGiveUp = useCallback(() => {
    logGuess(trainingGame.id, null, 'forfeit', setStatus, stats.rating ?? 0)
    setStatus('forfeit')
  }, [trainingGame.id, logGuess, setStatus])

  const launchContinue = useCallback(() => {
    const url =
      '/play' + '?fen=' + encodeURIComponent(controller.currentNode.fen)

    window.open(url)
  }, [trainingGame, controller])

  const desktopLayout = (
    <>
      <div className="flex h-full flex-1 flex-col justify-center gap-1 py-10">
        <div className="mt-2 flex w-full flex-row items-center justify-center gap-1">
          <div
            style={{
              maxWidth: 'min(20vw, 100vw - 75vh)',
            }}
            className="flex h-[75vh] w-[40vh] flex-col gap-1"
          >
            <GameInfo title="Training" icon="target" type="train">
              <p className="text-secondary">
                Puzzle{' '}
                <span className="text-secondary/60">#{trainingGame.id}</span>
              </p>
              <p className="text-secondary">
                Rating of puzzle:{' '}
                {status !== 'correct' && status !== 'forfeit' ? (
                  <span className="text-secondary/60">hidden</span>
                ) : (
                  <span className="text-human-2">
                    {trainingGame.puzzle_elo}
                  </span>
                )}
              </p>
            </GameInfo>
            <ContinueAgainstMaia launchContinue={launchContinue} />
            {gamesController}
            <StatsDisplay stats={stats} />
          </div>
          <div className="relative flex aspect-square w-full max-w-[75vh]">
            <GameBoard
              game={trainingGame}
              currentNode={controller.currentNode}
              orientation={controller.orientation}
              onPlayerMakeMove={onPlayerMakeMove}
              availableMoves={controller.availableMovesMapped}
              shapes={movePlotHover ? [movePlotHover] : undefined}
              onSelectSquare={onSelectSquare}
            />
          </div>
          <div
            style={{
              maxWidth: 'min(20vw, 100vw - 75vh)',
            }}
            className="flex h-[75vh] w-[40vh] flex-col gap-1"
          >
            <div className="flex">
              <div
                style={{
                  maxHeight: 'min(20vw, 100vw - 75vh)',
                  maxWidth: 'min(20vw, 100vw - 75vh)',
                }}
                className="flex h-[40vh] w-[40vh] [&>div]:h-[inherit] [&>div]:max-h-[inherit] [&>div]:max-w-[inherit]"
              >
                {/* <MovePlot
                  data={data}
                  onMove={setCurrentMove}
                  currentMove={currentMove}
                  currentSquare={currentSquare}
                  disabled={status !== 'correct' && status !== 'forfeit'}
                  onMouseEnter={showArrow}
                  onMouseLeave={() => setMovePlotHover(null)}
                /> */}
              </div>
              <div
                style={{
                  background:
                    'linear-gradient(0deg, rgb(36, 36, 36) 0%, rgb(255, 137, 70) 100%)',
                }}
                className="-mr-1 h-full w-1"
              />
            </div>
            <div
              style={{
                background:
                  'linear-gradient(90deg, rgb(36, 36, 36) 0%, rgb(83, 167, 162) 100%)',
              }}
              className="-mt-1 h-1 w-full"
            />
            <div className="flex-none">
              {/* <PositionEvaluationContainer moveEvaluation={moveEvaluation} /> */}
            </div>
            <div className="flex flex-1 flex-col items-stretch">
              <Feedback
                status={status}
                game={trainingGame}
                setStatus={setStatus}
                setAndGiveUp={setAndGiveUp}
                controller={controller}
                getNewGame={getNewGame}
              />
            </div>
            <div className="flex-none">
              <BoardController
                orientation={controller.orientation}
                setOrientation={controller.setOrientation}
                currentNode={controller.currentNode}
                plyCount={controller.plyCount}
                goToNode={controller.goToNode}
                goToNextNode={controller.goToNextNode}
                goToPreviousNode={controller.goToPreviousNode}
                goToRootNode={controller.goToRootNode}
                gameTree={controller.gameTree}
              />
            </div>
          </div>
        </div>
        <div className="mr-8 flex items-center justify-center">
          {/* <HorizontalEvaluationBar
            min={0}
            max={1}
            value={moveEvaluation?.stockfish}
            label="Stockfish Evaluation"
          /> */}
        </div>
      </div>
    </>
  )

  const mobileLayout = (
    <>
      <div className="flex h-full flex-1 flex-col justify-center gap-1">
        <div className="mt-2 flex h-full flex-col items-start justify-start gap-1">
          <div className="flex h-auto w-full flex-col">
            <GameInfo title="Training" icon="target" type="train">
              <p className="text-secondary">
                Puzzle{' '}
                <span className="text-secondary/60">#{trainingGame.id}</span>
              </p>
              <p className="text-secondary">
                Rating of puzzle:{' '}
                {status !== 'correct' && status !== 'forfeit' ? (
                  <span className="text-secondary/60">hidden</span>
                ) : (
                  <span className="text-human-2">
                    {trainingGame.puzzle_elo}
                  </span>
                )}
              </p>
            </GameInfo>
          </div>
          <div className="relative flex aspect-square h-[100vw] w-screen">
            <GameBoard
              game={trainingGame}
              currentNode={controller.currentNode}
              orientation={controller.orientation}
              availableMoves={controller.availableMovesMapped}
              onPlayerMakeMove={onPlayerMakeMove}
              shapes={movePlotHover ? [movePlotHover] : undefined}
              onSelectSquare={onSelectSquare}
            />
          </div>
          <div className="flex h-auto w-full flex-col gap-1">
            <div className="flex-none">
              <BoardController
                orientation={controller.orientation}
                setOrientation={controller.setOrientation}
                currentNode={controller.currentNode}
                plyCount={controller.plyCount}
                goToNode={controller.goToNode}
                goToNextNode={controller.goToNextNode}
                goToPreviousNode={controller.goToPreviousNode}
                goToRootNode={controller.goToRootNode}
                gameTree={controller.gameTree}
              />
            </div>
            <div className="flex flex-1 flex-col items-stretch">
              <Feedback
                status={status}
                game={trainingGame}
                setStatus={setStatus}
                controller={controller}
                setAndGiveUp={setAndGiveUp}
                getNewGame={getNewGame}
              />
            </div>
            <StatsDisplay stats={stats} />
            <div className="flex">
              <div className="flex h-[20vh] w-screen flex-none [&>div]:h-[inherit] [&>div]:max-h-[inherit] [&>div]:max-w-[inherit]">
                {/* <MovePlot
                  data={data}
                  onMove={setCurrentMove}
                  currentMove={currentMove}
                  currentSquare={currentSquare}
                  disabled={status !== 'correct' && status !== 'forfeit'}
                  onMouseEnter={showArrow}
                  onMouseLeave={() => setMovePlotHover(null)}
                /> */}
              </div>
              <div
                style={{
                  background:
                    'linear-gradient(0deg, rgb(36, 36, 36) 0%, rgb(255, 137, 70) 100%)',
                }}
                className="-mt-1 h-full w-1"
              />
            </div>
            <div
              style={{
                background:
                  'linear-gradient(90deg, rgb(36, 36, 36) 0%, rgb(83, 167, 162) 100%)',
              }}
              className="-mt-1 h-1 w-full"
            />
            <div className="w-full flex-none">
              {/* <PositionEvaluationContainer moveEvaluation={moveEvaluation} /> */}
            </div>
            <ContinueAgainstMaia launchContinue={launchContinue} />
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <Head>
        <title>Maia Chess - Train</title>
        <meta
          name="description"
          content="Collection of chess training and analysis tools centered around Maia."
        />
      </Head>
      <TrainingControllerContext.Provider value={controller}>
        {trainingGame && (isMobile ? mobileLayout : desktopLayout)}
      </TrainingControllerContext.Provider>
    </>
  )
}

export default function AuthenticatedTrainPage() {
  return (
    <AuthenticatedWrapper>
      <TrainPage />
    </AuthenticatedWrapper>
  )
}
