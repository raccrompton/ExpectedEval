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
import { Chess } from 'chess.ts'
import classNames from 'classnames'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import type { Key } from 'chessground/types'
import type { DrawShape } from 'chessground/draw'

import {
  getTrainingPlayerStats,
  getTrainingGame,
  logPuzzleGuesses,
} from 'src/api'
import {
  Loading,
  MovePlot,
  Feedback,
  GameInfo,
  BoardController,
  AuthenticatedWrapper,
  VerticalEvaluationBar,
  PositionEvaluationContainer,
} from 'src/components'
import styles from 'src/styles/App.module.scss'
import { useTrainingController } from 'src/hooks'
import { AllStats, useStats } from 'src/hooks/useStats'
import { TrainingGame, Status } from 'src/types/training'
import { StatsDisplay } from 'src/components/StatsDisplay'
import { ModalContext, WindowSizeContext } from 'src/contexts'
import { GameBoard } from 'src/components/GameBoard/GameBoard'
import { HorizontalEvaluationBar } from 'src/components/HorizontalEvaluationBar'
import { GameControllerContext } from 'src/contexts/GameControllerContext/GameControllerContext'

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
  const [loading, setLoading] = useState(false)
  const [stats, incrementStats] = useStats(statsLoader)
  const [userGuesses, setUserGuesses] = useState<string[]>([])
  const [previousGameResults, setPreviousGameResults] = useState<
    { id: string; result?: boolean }[]
  >([])

  const getNewGame = useCallback(async () => {
    setLoading(true)
    let game
    try {
      game = await getTrainingGame()
    } catch (e) {
      router.push('/401')
      return
    }

    setLoading(false)
    setStatus('default')
    setUserGuesses([])
    setTrainingGames(trainingGames.concat([game]))
    setCurrentIndex(trainingGames.length)
    setPreviousGameResults(previousGameResults.concat([{ id: game.id }]))
  }, [trainingGames, previousGameResults, router])

  useEffect(() => {
    if (currentIndex == trainingGames.length - 1) {
      setStatus('default')
    } else {
      setStatus('archived')
    }
  }, [currentIndex])

  const logGuess = useCallback(
    async (gameId, move, status, setStatus) => {
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
                }
              : game
          })
        })
        return
      }

      if (response.correct_moves.includes(newGuesses[newGuesses.length - 1])) {
        setStatus('correct')
      } else {
        setStatus('incorrect')
      }

      if (userGuesses.length == 0) {
        const result = response.correct_moves.includes(newGuesses[0])
        // This was the first guess, which is thte only one that counts for correctness
        // After waiting for a while after logging the guess to accomodate slow server,
        // update stats
        if (newGuesses.length && response.correct_moves) {
          setPreviousGameResults((prev) => {
            return prev.map((game, index) => {
              return index == currentIndex
                ? {
                    ...game,
                    result,
                  }
                : game
            })
          })
        }

        await new Promise((r) => setTimeout(r, 500))
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
            <div className={styles.moves}>
              <div className={styles.games}>
                {previousGameResults.map((game, index) => (
                  <span
                    key={game.id}
                    onClick={() => setCurrentIndex(index)}
                    className={classNames({
                      [styles.current]: game.result === undefined,
                      [styles.correct]: game.result,
                      [styles.incorrect]: !(game.result ?? true),
                    })}
                  />
                ))}
              </div>
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
    move: string[] | null,
    status: Status,
    setStatus: Dispatch<SetStateAction<Status>>,
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
  const { width } = useContext(WindowSizeContext)
  const isMobile = useMemo(() => width > 0 && width <= 670, [width])
  const [latestGuess, setLatestGuess] = useState<string | null>(null)
  const [movePlotHover, setMovePlotHover] = useState<DrawShape | null>(null)

  const trainingController = useTrainingController(trainingGame)

  const {
    moves,
    controller,
    moveEvaluation,
    setCurrentMove,
    data,
    move,
    parseMove,
    currentMove,
    currentSquare,
    setCurrentSquare,
  } = trainingController

  const turn =
    new Chess(trainingGame.moves[trainingGame.targetIndex].board).turn() === 'w'
      ? 'white'
      : 'black'

  useEffect(() => {
    setMovePlotHover(null)
  }, [trainingGame.id])

  useEffect(() => {
    if (status === 'incorrect' && !currentMove) {
      setStatus('default')
    }
  }, [currentMove, status])

  const setAndSaveCurrentMove = useCallback(
    (playedMove: null | [string, string]) => {
      setCurrentMove(playedMove)

      if (playedMove != null && status !== 'correct' && status !== 'forfeit') {
        setLatestGuess(parseMove(playedMove)?.san || null)
        logGuess(trainingGame.id, playedMove, status, setStatus)
      }
    },
    [setCurrentMove, logGuess, trainingGame.id, status, setStatus],
  )

  const setAndGiveUp = useCallback(() => {
    logGuess(trainingGame.id, null, 'forfeit', setStatus)
    setStatus('forfeit')
  }, [trainingGame.id, logGuess, setStatus])

  const showArrow = (node: { data: { move: string } }) => {
    const move = node.data.move
    const orig = move.slice(0, 2)
    const dest = move.slice(2, 4)
    setMovePlotHover({
      brush: 'green',
      orig: orig as Key,
      dest: dest as Key,
    })
  }

  const launchContinue = useCallback(() => {
    const fen = trainingGame.moves[controller.currentIndex].board

    const url = '/play' + '?fen=' + encodeURIComponent(fen)

    window.open(url)
  }, [trainingGame, controller])

  const desktopLayout = (
    <>
      <div className={styles.outer}>
        <div className={styles.container}>
          <div className={styles.side}>
            <div className={styles.info}>
              <GameInfo
                {...trainingGame}
                whitePlayer={
                  status === 'correct' || status === 'forfeit'
                    ? trainingGame.whitePlayer
                    : {
                        name: 'Unknown',
                        rating: 0,
                      }
                }
                blackPlayer={
                  status === 'correct' || status === 'forfeit'
                    ? trainingGame.blackPlayer
                    : {
                        name: 'Unknown',
                        rating: 0,
                      }
                }
                type={trainingGame.gameType}
                showId={false}
                instructionsType="train"
              />
            </div>
            <div className={styles.play}>
              <button onClick={launchContinue}>Continue Against Maia</button>
            </div>
            {gamesController}
            <StatsDisplay stats={stats} />
          </div>
          <div className={styles.board}>
            <GameBoard
              move={move}
              game={trainingGame}
              moves={moves}
              setCurrentMove={setAndSaveCurrentMove}
              setCurrentSquare={setCurrentSquare}
              shapes={movePlotHover ? [movePlotHover] : undefined}
            />
          </div>
          <div>
            <VerticalEvaluationBar
              value={moveEvaluation?.maia}
              label="Maia Probability"
            />
          </div>
          <div className={styles.side}>
            <div className={styles.map}>
              <div className={styles.scatter}>
                <MovePlot
                  data={data}
                  onMove={setCurrentMove}
                  currentMove={currentMove}
                  currentSquare={currentSquare}
                  disabled={status !== 'correct' && status !== 'forfeit'}
                  onMouseEnter={showArrow}
                  onMouseLeave={() => setMovePlotHover(null)}
                />
              </div>
              <div className={styles.human}></div>
            </div>
            <div className={styles.ai}></div>
            <div className={styles.analysis}>
              <PositionEvaluationContainer moveEvaluation={moveEvaluation} />
            </div>
            <div className={styles.feedback}>
              <Feedback
                status={status}
                game={trainingGame}
                setStatus={setStatus}
                latestGuess={latestGuess}
                setAndGiveUp={setAndGiveUp}
                trainingController={trainingController}
                getNewGame={getNewGame}
              />
            </div>
            {/* <div className={styles.moves}>
              <MovesContainer
                game={trainingGame}
                setCurrentMove={setCurrentMove}
                highlightIndices={[trainingGame.targetIndex]}
                mobile
              />
            </div> */}
            <div className={styles.controls}>
              <BoardController setCurrentMove={setCurrentMove} />
            </div>
          </div>
        </div>
        <div className={styles.sf}>
          <HorizontalEvaluationBar
            min={0}
            max={1}
            value={moveEvaluation?.stockfish}
            label="Stockfish Evaluation"
          />
        </div>
      </div>
    </>
  )

  const mobileLayout = (
    <>
      <div className={styles.outer}>
        <div className={styles.container}>
          <div className={styles.side}>
            <div className={styles.info}>
              <GameInfo
                {...trainingGame}
                whitePlayer={
                  status === 'correct' || status === 'forfeit'
                    ? trainingGame.whitePlayer
                    : {
                        name: 'Unknown',
                        rating: 0,
                      }
                }
                blackPlayer={
                  status === 'correct' || status === 'forfeit'
                    ? trainingGame.blackPlayer
                    : {
                        name: 'Unknown',
                        rating: 0,
                      }
                }
                type={trainingGame.gameType}
                showId={false}
                instructionsType="train"
              />
            </div>
            <div className={styles.play}>
              <button onClick={launchContinue}>Continue Against Maia</button>
            </div>
          </div>
          <div className={styles.board}>
            <GameBoard
              game={trainingGame}
              moves={moves}
              setCurrentMove={setAndSaveCurrentMove}
              setCurrentSquare={setCurrentSquare}
              move={move}
              shapes={movePlotHover ? [movePlotHover] : undefined}
            />
          </div>
          <div className={styles.side}>
            <div className={styles.feedback}>
              <Feedback
                status={status}
                game={trainingGame}
                setStatus={setStatus}
                latestGuess={latestGuess}
                trainingController={trainingController}
                setAndGiveUp={setAndGiveUp}
                getNewGame={getNewGame}
              />
            </div>
            <div className={styles.map}>
              <div className={styles.scatter}>
                <MovePlot
                  data={data}
                  onMove={setCurrentMove}
                  currentMove={currentMove}
                  currentSquare={currentSquare}
                  disabled={status !== 'correct' && status !== 'forfeit'}
                  onMouseEnter={showArrow}
                  onMouseLeave={() => setMovePlotHover(null)}
                />
              </div>
              <div className={styles.human}></div>
            </div>
            <div className={styles.ai}></div>
            <div className={styles.analysis}>
              <PositionEvaluationContainer moveEvaluation={moveEvaluation} />
            </div>
            {/* <div className={styles.moves}>
              <MovesContainer
                game={trainingGame}
                setCurrentMove={setCurrentMove}
                highlightIndices={[trainingGame.targetIndex]}
                mobile
              />
            </div> */}
            <div className={styles.controls}>
              <BoardController setCurrentMove={setCurrentMove} />
            </div>
            <StatsDisplay stats={stats} />
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
      <GameControllerContext.Provider
        value={{
          ...controller,
          orientation: turn,
        }}
      >
        {trainingGame && (isMobile ? mobileLayout : desktopLayout)}
      </GameControllerContext.Provider>
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
