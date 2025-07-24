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
  useRef,
} from 'react'
import Head from 'next/head'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import type { Key } from 'chessground/types'
import type { DrawShape } from 'chessground/draw'
import { Chess, PieceSymbol } from 'chess.ts'
import { AnimatePresence, motion } from 'framer-motion'
import {
  getTrainingGame,
  logPuzzleGuesses,
  getTrainingPlayerStats,
} from 'src/api'
import {
  trackPuzzleStarted,
  trackPuzzleMoveAttempted,
  trackPuzzleCompleted,
} from 'src/lib/analytics'
import {
  DelayedLoading,
  GameInfo,
  Feedback,
  PuzzleLog,
  StatsDisplay,
  BoardController,
  ContinueAgainstMaia,
  AuthenticatedWrapper,
  GameBoard,
  PromotionOverlay,
  DownloadModelModal,
  Highlight,
  MoveMap,
  BlunderMeter,
  MovesByRating,
} from 'src/components'
import { useTrainingController } from 'src/hooks/useTrainingController'
import { useAnalysisController } from 'src/hooks/useAnalysisController'
import { AllStats, useStats } from 'src/hooks/useStats'
import { TrainingGame, Status } from 'src/types/training'
import { MaiaEvaluation, StockfishEvaluation } from 'src/types'
import { ModalContext, WindowSizeContext, useTour } from 'src/contexts'
import { TrainingControllerContext } from 'src/contexts/TrainingControllerContext'
import {
  convertTrainingGameToAnalyzedGame,
  getCurrentPlayer,
  getAvailableMovesArray,
  requiresPromotion,
} from 'src/lib/train/utils'
import { mockAnalysisData } from 'src/lib/analysis/mockAnalysisData'
import { tourConfigs } from 'src/constants/tours'

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
  const { startTour, tourState } = useTour()

  const [trainingGames, setTrainingGames] = useState<TrainingGame[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [status, setStatus] = useState<Status>('default')
  const [stats, incrementStats, updateRating] = useStats(statsLoader)
  const [userGuesses, setUserGuesses] = useState<string[]>([])
  const [previousGameResults, setPreviousGameResults] = useState<
    (TrainingGame & { result?: boolean; ratingDiff?: number })[]
  >([])
  const [initialTourCheck, setInitialTourCheck] = useState(false)
  const [loadingGame, setLoadingGame] = useState(false)

  useEffect(() => {
    if (!initialTourCheck && tourState.ready) {
      setInitialTourCheck(true)
      // Always attempt to start the tour - the tour context will handle completion checking
      startTour(tourConfigs.train.id, tourConfigs.train.steps, false)
    }
  }, [initialTourCheck, startTour, tourState.ready])

  const getNewGame = useCallback(async () => {
    setLoadingGame(true)
    let game
    try {
      game = await getTrainingGame()
    } catch (e) {
      router.push('/401')
      return
    }

    // Track puzzle started
    trackPuzzleStarted(game.id, stats?.rating || 0)

    setStatus('default')
    setUserGuesses([])
    setCurrentIndex(trainingGames.length)
    setTrainingGames(trainingGames.concat([game]))
    setPreviousGameResults(previousGameResults.concat([{ ...game }]))
    setLoadingGame(false)
  }, [trainingGames, previousGameResults, router, stats?.rating])

  const logGuess = useCallback(
    async (
      gameId: string,
      move: [string, string] | null,
      status: Status,
      setStatus: Dispatch<SetStateAction<Status>>,
      rating: number,
    ) => {
      const puzzleIdx = currentIndex

      if (puzzleIdx != trainingGames.length - 1) {
        return // No logging for past puzzles
      }

      const newGuesses = move
        ? userGuesses.concat([move[0] + move[1]])
        : userGuesses
      setUserGuesses(newGuesses)
      setStatus('loading')

      // Track move attempt if a move was made
      if (move) {
        const moveUci = move[0] + move[1]
        trackPuzzleMoveAttempted(gameId, moveUci, newGuesses.length, false) // Will update correctness after response
      }

      const response = await logPuzzleGuesses(
        gameId,
        newGuesses,
        status === 'forfeit',
      )

      if (status === 'forfeit') {
        setPreviousGameResults((prev) => {
          return prev.map((game, index) => {
            return index === puzzleIdx
              ? {
                  ...game,
                  result: false,
                  ratingDiff: game.ratingDiff ?? response.puzzle_elo - rating,
                }
              : game
          })
        })

        // Track puzzle completion (forfeit)
        trackPuzzleCompleted(
          gameId,
          'forfeit',
          newGuesses.length,
          0, // No time tracking for forfeit
          response.puzzle_elo,
          response.puzzle_elo - rating,
        )

        // If the user forfeits, update their stats
        if (userGuesses.length === 0) {
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
              return index === puzzleIdx
                ? {
                    ...game,
                    result,
                    ratingDiff: response.puzzle_elo - rating,
                  }
                : game
            })
          })
        }

        // Track puzzle completion (correct/incorrect)
        trackPuzzleCompleted(
          gameId,
          result ? 'correct' : 'forfeit',
          newGuesses.length,
          0, // No time tracking implemented yet
          response.puzzle_elo,
          response.puzzle_elo - rating,
        )

        updateRating(response.puzzle_elo)
        incrementStats(1, result ? 1 : 0)
      }
    },
    [currentIndex, trainingGames.length, userGuesses, incrementStats],
  )

  useEffect(() => {
    if (trainingGames.length === 0 && !loadingGame) getNewGame()
  }, [getNewGame, trainingGames.length, loadingGame])

  if (loadingGame || trainingGames.length === 0) {
    return (
      <DelayedLoading isLoading={true}>
        <div></div>
      </DelayedLoading>
    )
  }

  if (trainingGames.length && trainingGames[currentIndex])
    return (
      <Train
        key={trainingGames[currentIndex].id}
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

  return (
    <DelayedLoading isLoading={true}>
      <div></div>
    </DelayedLoading>
  )
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

  const analyzedGame = useMemo(() => {
    return convertTrainingGameToAnalyzedGame(trainingGame)
  }, [trainingGame])

  const analysisController = useAnalysisController(
    analyzedGame,
    controller.orientation,
  )

  const { width } = useContext(WindowSizeContext)
  const isMobile = useMemo(() => width > 0 && width <= 670, [width])
  const [hoverArrow, setHoverArrow] = useState<DrawShape | null>(null)
  const analysisSyncedRef = useRef(false)
  const [promotionFromTo, setPromotionFromTo] = useState<
    [string, string] | null
  >(null)
  const [userAnalysisEnabled, setUserAnalysisEnabled] = useState<boolean | null>(null) // User's choice, null means not set

  const showAnalysis =
    status === 'correct' || status === 'forfeit' || status === 'archived'

  // Analysis is enabled when:
  // 1. Puzzle is complete (showAnalysis is true) AND
  // 2. User hasn't explicitly disabled it, OR user has explicitly enabled it
  const analysisEnabled = showAnalysis && (userAnalysisEnabled !== false)

  const handleToggleAnalysis = useCallback(() => {
    setUserAnalysisEnabled(prev => {
      // If user hasn't made a choice yet, set it to the opposite of current state
      if (prev === null) {
        return !analysisEnabled
      }
      // Otherwise, toggle the user's explicit choice
      return !prev
    })
  }, [analysisEnabled])

  // Create empty data structures for when analysis is disabled
  const emptyBlunderMeterData = useMemo(
    () => ({
      goodMoves: { moves: [], probability: 0 },
      okMoves: { moves: [], probability: 0 },
      blunderMoves: { moves: [], probability: 0 },
    }),
    [],
  )

  const emptyRecommendations = useMemo(
    () => ({
      maia: undefined,
      stockfish: undefined,
    }),
    [],
  )

  const currentPlayer = useMemo(() => {
    const currentNode = analysisEnabled && showAnalysis
      ? analysisController.currentNode
      : controller.currentNode
    return getCurrentPlayer(currentNode)
  }, [analysisEnabled, showAnalysis, analysisController.currentNode, controller.currentNode])

  useEffect(() => {
    if (analysisEnabled && showAnalysis && !analysisSyncedRef.current) {
      // Set the analysis controller to the current training controller's node
      // Only sync once when analysis mode is first enabled
      analysisController.setCurrentNode(controller.currentNode)
      analysisSyncedRef.current = true
    } else if (!showAnalysis || !analysisEnabled) {
      // Reset sync flag when exiting analysis mode
      analysisSyncedRef.current = false
    }
  }, [analysisEnabled, showAnalysis, analysisController, controller.currentNode])

  const onSelectSquare = useCallback(
    (square: Key) => {
      if (!analysisEnabled && !showAnalysis) {
        controller.reset()
        setStatus('default')
      }
    },
    [controller, analysisEnabled, showAnalysis],
  )

  const onPlayerMakeMove = useCallback(
    (playedMove: [string, string] | null) => {
      if (!playedMove) return

      if (analysisEnabled && showAnalysis) {
        const availableMoves = getAvailableMovesArray(
          analysisController.availableMoves,
        )

        if (requiresPromotion(playedMove, availableMoves)) {
          setPromotionFromTo(playedMove)
          return
        }

        // Single move or already has promotion
        const moveUci = playedMove[0] + playedMove[1]

        if (!analysisController.currentNode || !analyzedGame.tree) return

        const chess = new Chess(analysisController.currentNode.fen)
        const moveAttempt = chess.move({
          from: moveUci.slice(0, 2),
          to: moveUci.slice(2, 4),
          promotion: moveUci[4] ? (moveUci[4] as PieceSymbol) : undefined,
        })

        if (moveAttempt) {
          const newFen = chess.fen()
          const moveString =
            moveAttempt.from +
            moveAttempt.to +
            (moveAttempt.promotion ? moveAttempt.promotion : '')
          const san = moveAttempt.san

          if (analysisController.currentNode.mainChild?.move === moveString) {
            analysisController.goToNode(
              analysisController.currentNode.mainChild,
            )
          } else {
            const newVariation = analyzedGame.tree.addVariation(
              analysisController.currentNode,
              newFen,
              moveString,
              san,
              analysisController.currentMaiaModel,
            )
            analysisController.goToNode(newVariation)
          }
        }
      } else {
        // In puzzle mode, check for promotions in available moves
        const availableMoves = getAvailableMovesArray(
          controller.availableMovesMapped,
        )

        if (requiresPromotion(playedMove, availableMoves)) {
          setPromotionFromTo(playedMove)
          return
        }

        const moveUci = playedMove[0] + playedMove[1]
        controller.onPlayerGuess(moveUci)

        const currentStatus = status as Status
        if (currentStatus !== 'correct' && currentStatus !== 'forfeit') {
          logGuess(
            trainingGame.id,
            playedMove,
            currentStatus,
            setStatus,
            stats.rating ?? 0,
          )
        }
      }
    },
    [
      controller,
      logGuess,
      trainingGame.id,
      status,
      setStatus,
      showAnalysis,
      analysisController,
      analyzedGame,
    ],
  )

  const onPlayerSelectPromotion = useCallback(
    (piece: string) => {
      if (!promotionFromTo) {
        return
      }
      setPromotionFromTo(null)
      const moveUci = promotionFromTo[0] + promotionFromTo[1] + piece

      if (analysisEnabled && showAnalysis) {
        // In analysis mode
        if (!analysisController.currentNode || !analyzedGame.tree) return

        const chess = new Chess(analysisController.currentNode.fen)
        const moveAttempt = chess.move({
          from: moveUci.slice(0, 2),
          to: moveUci.slice(2, 4),
          promotion: piece as PieceSymbol,
        })

        if (moveAttempt) {
          const newFen = chess.fen()
          const moveString = moveUci
          const san = moveAttempt.san

          if (analysisController.currentNode.mainChild?.move === moveString) {
            analysisController.goToNode(
              analysisController.currentNode.mainChild,
            )
          } else {
            const newVariation = analyzedGame.tree.addVariation(
              analysisController.currentNode,
              newFen,
              moveString,
              san,
              analysisController.currentMaiaModel,
            )
            analysisController.goToNode(newVariation)
          }
        }
      } else {
        // In puzzle mode
        controller.onPlayerGuess(moveUci)

        const currentStatus = status as Status
        if (currentStatus !== 'correct' && currentStatus !== 'forfeit') {
          logGuess(
            trainingGame.id,
            promotionFromTo,
            currentStatus,
            setStatus,
            stats.rating ?? 0,
          )
        }
      }
    },
    [
      promotionFromTo,
      setPromotionFromTo,
      showAnalysis,
      analysisController,
      analyzedGame,
      controller,
      status,
      logGuess,
      trainingGame.id,
      setStatus,
      stats.rating,
    ],
  )

  const setAndGiveUp = useCallback(() => {
    logGuess(trainingGame.id, null, 'forfeit', setStatus, stats.rating ?? 0)
    setStatus('forfeit')
  }, [trainingGame.id, logGuess, setStatus, stats.rating])

  const launchContinue = useCallback(() => {
    const currentNode = showAnalysis
      ? analysisController.currentNode
      : controller.currentNode
    const url = '/play' + '?fen=' + encodeURIComponent(currentNode.fen)
    window.open(url)
  }, [controller, analysisController, showAnalysis])

  const hover = useCallback(
    (move?: string) => {
      if (move && analysisEnabled && showAnalysis) {
        setHoverArrow({
          orig: move.slice(0, 2) as Key,
          dest: move.slice(2, 4) as Key,
          brush: 'green',
          modifiers: { lineWidth: 10 },
        })
      } else {
        setHoverArrow(null)
      }
    },
    [analysisEnabled, showAnalysis],
  )

  const makeMove = useCallback(
    (move: string) => {
      if (
        !analysisEnabled ||
        !showAnalysis ||
        !analysisController.currentNode ||
        !analyzedGame.tree
      )
        return

      const chess = new Chess(analysisController.currentNode.fen)
      const moveAttempt = chess.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move[4] ? (move[4] as PieceSymbol) : undefined,
      })

      if (moveAttempt) {
        const newFen = chess.fen()
        const moveString =
          moveAttempt.from +
          moveAttempt.to +
          (moveAttempt.promotion ? moveAttempt.promotion : '')
        const san = moveAttempt.san

        if (analysisController.currentNode.mainChild?.move === moveString) {
          analysisController.goToNode(analysisController.currentNode.mainChild)
        } else {
          const newVariation = analyzedGame.tree.addVariation(
            analysisController.currentNode,
            newFen,
            moveString,
            san,
            analysisController.currentMaiaModel,
          )
          analysisController.goToNode(newVariation)
        }
      }
    },
    [showAnalysis, analysisController, analyzedGame],
  )

  /**
   * No-op handlers for blurred analysis components in puzzle mode
   */
  const mockHover = useCallback(() => {
    // Intentionally empty - no interaction allowed in puzzle mode
  }, [])
  const mockMakeMove = useCallback(() => {
    // Intentionally empty - no moves allowed in puzzle mode
  }, [])
  const mockSetHoverArrow = useCallback(() => {
    // Intentionally empty - no hover arrows in puzzle mode
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.2,
        staggerChildren: 0.05,
      },
    },
  }

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 4,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.25,
        ease: [0.25, 0.46, 0.45, 0.94],
        type: 'tween',
      },
    },
    exit: {
      opacity: 0,
      y: -4,
      transition: {
        duration: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94],
        type: 'tween',
      },
    },
  }

  const desktopLayout = (
    <motion.div
      className="flex h-full w-full flex-col items-center py-4 md:py-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{ willChange: 'transform, opacity' }}
    >
      <div className="flex h-full w-[90%] flex-row gap-4">
        <motion.div
          className="flex h-[85vh] w-72 min-w-60 max-w-72 flex-col gap-2 overflow-hidden 2xl:min-w-72"
          variants={itemVariants}
          style={{ willChange: 'transform, opacity' }}
        >
          <GameInfo title="Puzzles" icon="target" type="train">
            <div className="flex w-full flex-col justify-start text-sm text-secondary 2xl:text-base">
              <span>
                Puzzle{' '}
                <span className="text-secondary/60">#{trainingGame.id}</span>
              </span>
              <span>
                Rating:{' '}
                {status !== 'correct' && status !== 'forfeit' ? (
                  <span className="text-secondary/60">hidden</span>
                ) : (
                  <span className="text-human-2">
                    {trainingGame.puzzle_elo}
                  </span>
                )}
              </span>
            </div>
          </GameInfo>
          <ContinueAgainstMaia
            launchContinue={launchContinue}
            sourcePage="puzzles"
            currentFen={controller.currentNode?.fen || ''}
          />
          {gamesController}
          <StatsDisplay stats={stats} />
        </motion.div>

        <motion.div
          className="flex h-[85vh] w-[45vh] flex-col gap-2 2xl:w-[55vh]"
          variants={itemVariants}
          style={{ willChange: 'transform, opacity' }}
        >
          <div
            id="train-page"
            className="relative flex aspect-square w-[45vh] 2xl:w-[55vh]"
          >
            <GameBoard
              game={trainingGame}
              currentNode={
                analysisEnabled && showAnalysis
                  ? analysisController.currentNode
                  : controller.currentNode
              }
              orientation={
                analysisEnabled && showAnalysis
                  ? analysisController.orientation
                  : controller.orientation
              }
              onPlayerMakeMove={onPlayerMakeMove}
              availableMoves={
                analysisEnabled && showAnalysis
                  ? analysisController.availableMoves
                  : controller.availableMovesMapped
              }
              shapes={
                analysisEnabled && showAnalysis
                  ? hoverArrow
                    ? [...analysisController.arrows, hoverArrow]
                    : [...analysisController.arrows]
                  : hoverArrow
                    ? [hoverArrow]
                    : []
              }
              onSelectSquare={onSelectSquare}
              goToNode={analysisEnabled && showAnalysis ? analysisController.goToNode : undefined}
              gameTree={analysisEnabled && showAnalysis ? analyzedGame.tree : undefined}
            />
            {promotionFromTo ? (
              <PromotionOverlay
                player={currentPlayer}
                file={promotionFromTo[1].slice(0, 1)}
                onPlayerSelectPromotion={onPlayerSelectPromotion}
              />
            ) : null}
          </div>
          <BoardController
            orientation={
              analysisEnabled && showAnalysis
                ? analysisController.orientation
                : controller.orientation
            }
            setOrientation={
              analysisEnabled && showAnalysis
                ? analysisController.setOrientation
                : controller.setOrientation
            }
            currentNode={
              analysisEnabled && showAnalysis
                ? analysisController.currentNode
                : controller.currentNode
            }
            plyCount={
              analysisEnabled && showAnalysis ? analysisController.plyCount : controller.plyCount
            }
            goToNode={
              analysisEnabled && showAnalysis ? analysisController.goToNode : controller.goToNode
            }
            goToNextNode={
              analysisEnabled && showAnalysis
                ? analysisController.goToNextNode
                : controller.goToNextNode
            }
            goToPreviousNode={
              analysisEnabled && showAnalysis
                ? analysisController.goToPreviousNode
                : controller.goToPreviousNode
            }
            goToRootNode={
              analysisEnabled && showAnalysis
                ? analysisController.goToRootNode
                : controller.goToRootNode
            }
            gameTree={
              analysisEnabled && showAnalysis ? analysisController.gameTree : controller.gameTree
            }
          />
          <div className="flex w-full flex-1">
            <Feedback
              status={status}
              game={trainingGame}
              setStatus={setStatus}
              setAndGiveUp={setAndGiveUp}
              controller={controller}
              getNewGame={getNewGame}
            />
          </div>
        </motion.div>
        <motion.div
          id="analysis"
          className="flex h-[calc(85vh)] w-full flex-col gap-2 xl:h-[calc(55vh+4.5rem)]"
          variants={itemVariants}
          style={{ willChange: 'transform, opacity' }}
        >
          {/* Analysis Toggle Bar - only show when puzzle is complete */}
          {showAnalysis && (
            <div className="flex items-center justify-between rounded bg-background-1 px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">analytics</span>
                <h3 className="font-semibold">Analysis</h3>
              </div>
              <button
                onClick={handleToggleAnalysis}
                className={`flex items-center gap-2 rounded px-3 py-1 text-sm transition-colors ${
                  analysisEnabled
                    ? 'bg-human-4 text-white hover:bg-human-4/80'
                    : 'bg-background-2 text-secondary hover:bg-background-3'
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {analysisEnabled ? 'visibility' : 'visibility_off'}
                </span>
                {analysisEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          )}

          <div className="relative">
            {/* Large screens (xl+): Side by side layout */}
            <div className="hidden xl:flex xl:h-[calc((55vh+4.5rem)/2)]">
              <div className="flex h-full w-full overflow-hidden rounded border-[0.5px] border-white/40">
                <div className="flex h-full w-auto min-w-[40%] max-w-[40%] border-r-[0.5px] border-white/40">
                  <div className="relative w-full">
                    <Highlight
                      setCurrentMaiaModel={
                        analysisEnabled && showAnalysis
                          ? analysisController.setCurrentMaiaModel
                          : () => void 0
                      }
                      hover={analysisEnabled && showAnalysis ? hover : mockHover}
                      makeMove={analysisEnabled && showAnalysis ? makeMove : mockMakeMove}
                      currentMaiaModel={
                        analysisEnabled && showAnalysis
                          ? analysisController.currentMaiaModel
                          : 'maia_kdd_1500'
                      }
                      recommendations={
                        analysisEnabled && showAnalysis
                          ? analysisController.moveRecommendations
                          : emptyRecommendations
                      }
                      moveEvaluation={
                        analysisEnabled && showAnalysis
                          ? (analysisController.moveEvaluation as {
                              maia?: MaiaEvaluation
                              stockfish?: StockfishEvaluation
                            })
                          : {
                              maia: undefined,
                              stockfish: undefined,
                            }
                      }
                      colorSanMapping={
                        analysisEnabled && showAnalysis
                          ? analysisController.colorSanMapping
                          : {}
                      }
                      boardDescription={
                        analysisEnabled && showAnalysis
                          ? analysisController.boardDescription
                          : {
                              segments: [
                                {
                                  type: 'text',
                                  content:
                                    'Complete the puzzle to unlock analysis, or analysis is disabled.',
                                },
                              ],
                            }
                      }
                    />
                    {!showAnalysis && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded bg-background-1/80 backdrop-blur-sm">
                        <div className="rounded bg-background-2/90 p-4 text-center shadow-lg">
                          <span className="material-symbols-outlined mb-2 text-3xl text-human-3">
                            lock
                          </span>
                          <p className="font-medium text-primary">
                            Analysis Locked
                          </p>
                          <p className="text-sm text-secondary">
                            Complete the puzzle to unlock analysis
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex h-full w-full bg-background-1">
                  <MovesByRating
                    moves={
                      showAnalysis
                        ? analysisController.movesByRating
                        : mockAnalysisData.movesByRating
                    }
                    colorSanMapping={
                      showAnalysis
                        ? analysisController.colorSanMapping
                        : mockAnalysisData.colorSanMapping
                    }
                  />
                </div>
              </div>
            </div>

            {/* Smaller screens (below xl): Combined Highlight + BlunderMeter container */}
            <div className="flex h-[calc((85vh)*0.4)] overflow-hidden rounded border-[0.5px] border-white/40 bg-background-1 xl:hidden">
              <div className="flex h-full w-full border-r-[0.5px] border-white/40">
                <Highlight
                  setCurrentMaiaModel={
                    showAnalysis
                      ? analysisController.setCurrentMaiaModel
                      : () => void 0
                  }
                  hover={showAnalysis ? hover : mockHover}
                  makeMove={showAnalysis ? makeMove : mockMakeMove}
                  currentMaiaModel={
                    showAnalysis
                      ? analysisController.currentMaiaModel
                      : 'maia_kdd_1500'
                  }
                  recommendations={
                    showAnalysis
                      ? analysisController.moveRecommendations
                      : mockAnalysisData.recommendations
                  }
                  moveEvaluation={
                    showAnalysis
                      ? (analysisController.moveEvaluation as {
                          maia?: MaiaEvaluation
                          stockfish?: StockfishEvaluation
                        })
                      : mockAnalysisData.moveEvaluation
                  }
                  colorSanMapping={
                    showAnalysis
                      ? analysisController.colorSanMapping
                      : mockAnalysisData.colorSanMapping
                  }
                  boardDescription={
                    showAnalysis
                      ? analysisController.boardDescription
                      : {
                          segments: [
                            {
                              type: 'text',
                              content:
                                'This position offers multiple strategic options. Consider central control and piece development.',
                            },
                          ],
                        }
                  }
                />
              </div>
              <div className="flex h-full w-auto min-w-[40%] max-w-[40%] bg-background-1 p-3">
                <div className="h-full w-full">
                  <BlunderMeter
                    hover={showAnalysis ? hover : mockHover}
                    makeMove={showAnalysis ? makeMove : mockMakeMove}
                    data={
                      showAnalysis
                        ? analysisController.blunderMeter
                        : mockAnalysisData.blunderMeter
                    }
                    colorSanMapping={
                      showAnalysis
                        ? analysisController.colorSanMapping
                        : mockAnalysisData.colorSanMapping
                    }
                    moveEvaluation={
                      showAnalysis
                        ? analysisController.moveEvaluation
                        : mockAnalysisData.moveEvaluation
                    }
                    showContainer={false}
                  />
                </div>
              </div>
            </div>

            {!showAnalysis && (
              <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded bg-background-1/80 backdrop-blur-sm">
                <div className="rounded bg-background-2/90 p-4 text-center shadow-lg">
                  <span className="material-symbols-outlined mb-2 text-3xl text-human-3">
                    lock
                  </span>
                  <p className="font-medium text-primary">Analysis Locked</p>
                  <p className="text-sm text-secondary">
                    Complete the puzzle to unlock analysis
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            {/* Large screens (xl+): Side by side layout */}
            <div className="hidden xl:flex xl:h-[calc((55vh+4.5rem)/2)] xl:flex-row xl:gap-2">
              <div className="flex h-full w-full flex-col">
                <MoveMap
                  moveMap={
                    showAnalysis
                      ? analysisController.moveMap
                      : mockAnalysisData.moveMap
                  }
                  colorSanMapping={
                    showAnalysis
                      ? analysisController.colorSanMapping
                      : mockAnalysisData.colorSanMapping
                  }
                  setHoverArrow={
                    showAnalysis ? setHoverArrow : mockSetHoverArrow
                  }
                  makeMove={showAnalysis ? makeMove : mockMakeMove}
                />
              </div>
              <BlunderMeter
                hover={showAnalysis ? hover : mockHover}
                makeMove={showAnalysis ? makeMove : mockMakeMove}
                data={
                  showAnalysis
                    ? analysisController.blunderMeter
                    : mockAnalysisData.blunderMeter
                }
                colorSanMapping={
                  showAnalysis
                    ? analysisController.colorSanMapping
                    : mockAnalysisData.colorSanMapping
                }
                moveEvaluation={
                  showAnalysis
                    ? analysisController.moveEvaluation
                    : mockAnalysisData.moveEvaluation
                }
              />
            </div>

            {/* Smaller screens (below xl): MoveMap full width */}
            <div className="flex h-[calc((85vh)*0.3)] w-full xl:hidden">
              <div className="h-full w-full">
                <MoveMap
                  moveMap={
                    showAnalysis
                      ? analysisController.moveMap
                      : mockAnalysisData.moveMap
                  }
                  colorSanMapping={
                    showAnalysis
                      ? analysisController.colorSanMapping
                      : mockAnalysisData.colorSanMapping
                  }
                  setHoverArrow={
                    showAnalysis ? setHoverArrow : mockSetHoverArrow
                  }
                  makeMove={showAnalysis ? makeMove : mockMakeMove}
                />
              </div>
            </div>

            {!showAnalysis && (
              <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded bg-background-1/80 backdrop-blur-sm">
                <div className="rounded bg-background-2/90 p-4 text-center shadow-lg">
                  <span className="material-symbols-outlined mb-2 text-3xl text-human-3">
                    lock
                  </span>
                  <p className="font-medium text-primary">Analysis Locked</p>
                  <p className="text-sm text-secondary">
                    Complete the puzzle to unlock analysis
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Smaller screens (below xl): MovesByRating full width */}
          <div className="flex h-[calc((85vh)*0.3)] w-full xl:hidden">
            <div className="relative h-full w-full">
              <MovesByRating
                moves={
                  showAnalysis
                    ? analysisController.movesByRating
                    : mockAnalysisData.movesByRating
                }
                colorSanMapping={
                  showAnalysis
                    ? analysisController.colorSanMapping
                    : mockAnalysisData.colorSanMapping
                }
              />
              {!showAnalysis && (
                <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded bg-background-1/80 backdrop-blur-sm">
                  <div className="rounded bg-background-2/90 p-4 text-center shadow-lg">
                    <span className="material-symbols-outlined mb-2 text-3xl text-human-3">
                      lock
                    </span>
                    <p className="font-medium text-primary">Analysis Locked</p>
                    <p className="text-sm text-secondary">
                      Complete the puzzle to unlock analysis
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )

  const mobileLayout = (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{ willChange: 'transform, opacity' }}
    >
      <div className="flex h-full flex-1 flex-col justify-center gap-1">
        <div className="mt-2 flex h-full flex-col items-start justify-start gap-1">
          <motion.div
            className="flex h-auto w-full flex-col"
            variants={itemVariants}
            style={{ willChange: 'transform, opacity' }}
          >
            <GameInfo title="Puzzles" icon="target" type="train">
              <div className="flex w-full items-center justify-between text-secondary">
                <span>
                  Puzzle{' '}
                  <span className="text-secondary/60">#{trainingGame.id}</span>
                </span>
                <span>
                  Rating:{' '}
                  {status !== 'correct' && status !== 'forfeit' ? (
                    <span className="text-secondary/60">hidden</span>
                  ) : (
                    <span className="text-human-2">
                      {trainingGame.puzzle_elo}
                    </span>
                  )}
                </span>
              </div>
            </GameInfo>
          </motion.div>
          <div
            id="train-page"
            className="relative flex aspect-square h-[100vw] w-screen"
          >
            <GameBoard
              game={trainingGame}
              currentNode={
                showAnalysis
                  ? analysisController.currentNode
                  : controller.currentNode
              }
              orientation={
                showAnalysis
                  ? analysisController.orientation
                  : controller.orientation
              }
              availableMoves={
                showAnalysis
                  ? analysisController.availableMoves
                  : controller.availableMovesMapped
              }
              onPlayerMakeMove={onPlayerMakeMove}
              shapes={
                showAnalysis
                  ? hoverArrow
                    ? [...analysisController.arrows, hoverArrow]
                    : [...analysisController.arrows]
                  : hoverArrow
                    ? [hoverArrow]
                    : []
              }
              onSelectSquare={onSelectSquare}
              goToNode={showAnalysis ? analysisController.goToNode : undefined}
              gameTree={showAnalysis ? analyzedGame.tree : undefined}
            />
            {promotionFromTo ? (
              <PromotionOverlay
                player={currentPlayer}
                file={promotionFromTo[1].slice(0, 1)}
                onPlayerSelectPromotion={onPlayerSelectPromotion}
              />
            ) : null}
          </div>
          <div className="flex h-auto w-full flex-col gap-1">
            <div className="flex-none">
              <BoardController
                orientation={
                  showAnalysis
                    ? analysisController.orientation
                    : controller.orientation
                }
                setOrientation={
                  showAnalysis
                    ? analysisController.setOrientation
                    : controller.setOrientation
                }
                currentNode={
                  showAnalysis
                    ? analysisController.currentNode
                    : controller.currentNode
                }
                plyCount={
                  showAnalysis
                    ? analysisController.plyCount
                    : controller.plyCount
                }
                goToNode={
                  showAnalysis
                    ? analysisController.goToNode
                    : controller.goToNode
                }
                goToNextNode={
                  showAnalysis
                    ? analysisController.goToNextNode
                    : controller.goToNextNode
                }
                goToPreviousNode={
                  showAnalysis
                    ? analysisController.goToPreviousNode
                    : controller.goToPreviousNode
                }
                goToRootNode={
                  showAnalysis
                    ? analysisController.goToRootNode
                    : controller.goToRootNode
                }
                gameTree={
                  showAnalysis
                    ? analysisController.gameTree
                    : controller.gameTree
                }
              />
            </div>
            <div className="flex w-full">
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
            <ContinueAgainstMaia
              launchContinue={launchContinue}
              sourcePage="puzzles"
              currentFen={controller.currentNode?.fen || ''}
            />
            <div
              id="analysis"
              className="flex w-full flex-col gap-1 overflow-hidden"
            >
              <div className="relative">
                <Highlight
                  setCurrentMaiaModel={
                    showAnalysis
                      ? analysisController.setCurrentMaiaModel
                      : () => void 0
                  }
                  hover={showAnalysis ? hover : mockHover}
                  makeMove={showAnalysis ? makeMove : mockMakeMove}
                  currentMaiaModel={
                    showAnalysis
                      ? analysisController.currentMaiaModel
                      : 'maia_kdd_1500'
                  }
                  recommendations={
                    showAnalysis
                      ? analysisController.moveRecommendations
                      : mockAnalysisData.recommendations
                  }
                  moveEvaluation={
                    showAnalysis
                      ? (analysisController.moveEvaluation as {
                          maia?: MaiaEvaluation
                          stockfish?: StockfishEvaluation
                        })
                      : mockAnalysisData.moveEvaluation
                  }
                  colorSanMapping={
                    showAnalysis
                      ? analysisController.colorSanMapping
                      : mockAnalysisData.colorSanMapping
                  }
                  boardDescription={
                    showAnalysis
                      ? analysisController.boardDescription
                      : {
                          segments: [
                            {
                              type: 'text',
                              content:
                                'This position offers multiple strategic options. Consider central control and piece development.',
                            },
                          ],
                        }
                  }
                />
                {!showAnalysis && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background-1/80 backdrop-blur-sm">
                    <div className="rounded bg-background-2/90 p-2 text-center shadow-lg">
                      <span className="material-symbols-outlined mb-1 text-xl text-human-3">
                        lock
                      </span>
                      <p className="text-xs font-medium text-primary">
                        Analysis Locked
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <BlunderMeter
                  hover={showAnalysis ? hover : mockHover}
                  makeMove={showAnalysis ? makeMove : mockMakeMove}
                  data={
                    showAnalysis
                      ? analysisController.blunderMeter
                      : mockAnalysisData.blunderMeter
                  }
                  colorSanMapping={
                    showAnalysis
                      ? analysisController.colorSanMapping
                      : mockAnalysisData.colorSanMapping
                  }
                  moveEvaluation={
                    showAnalysis
                      ? analysisController.moveEvaluation
                      : mockAnalysisData.moveEvaluation
                  }
                />
                {!showAnalysis && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background-1/80 backdrop-blur-sm">
                    <div className="rounded bg-background-2/90 p-2 text-center shadow-lg">
                      <span className="material-symbols-outlined mb-1 text-xl text-human-3">
                        lock
                      </span>
                      <p className="text-xs font-medium text-primary">
                        Analysis Locked
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <MoveMap
                  moveMap={
                    showAnalysis
                      ? analysisController.moveMap
                      : mockAnalysisData.moveMap
                  }
                  colorSanMapping={
                    showAnalysis
                      ? analysisController.colorSanMapping
                      : mockAnalysisData.colorSanMapping
                  }
                  setHoverArrow={
                    showAnalysis ? setHoverArrow : mockSetHoverArrow
                  }
                  makeMove={showAnalysis ? makeMove : mockMakeMove}
                />
                {!showAnalysis && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background-1/80 backdrop-blur-sm">
                    <div className="rounded bg-background-2/90 p-2 text-center shadow-lg">
                      <span className="material-symbols-outlined mb-1 text-xl text-human-3">
                        lock
                      </span>
                      <p className="text-xs font-medium text-primary">
                        Analysis Locked
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {gamesController}
          </div>
        </div>
      </div>
    </motion.div>
  )

  return (
    <>
      <Head>
        <title>Chess Puzzles – Maia Chess</title>
        <meta
          name="description"
          content="Train with Maia as your coach using human-centered puzzles. Curated based on how millions of players improve, with data showing how different ratings approach each position."
        />
      </Head>
      <AnimatePresence>
        {analysisController.maia.status === 'no-cache' ||
        analysisController.maia.status === 'downloading' ? (
          <DownloadModelModal
            progress={analysisController.maia.progress}
            download={analysisController.maia.downloadModel}
          />
        ) : null}
      </AnimatePresence>
      <TrainingControllerContext.Provider value={controller}>
        <AnimatePresence mode="wait">
          {trainingGame && (
            <motion.div key={trainingGame.id}>
              {isMobile ? mobileLayout : desktopLayout}
            </motion.div>
          )}
        </AnimatePresence>
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
