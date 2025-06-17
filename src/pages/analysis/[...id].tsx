import React, {
  useRef,
  useMemo,
  Dispatch,
  useState,
  useEffect,
  useContext,
  useCallback,
  SetStateAction,
} from 'react'
import {
  getLichessGamePGN,
  getAnalyzedUserGame,
  getAnalyzedLichessGame,
  getAnalyzedTournamentGame,
} from 'src/api'
import {
  AnalyzedGame,
  MaiaEvaluation,
  StockfishEvaluation,
  GameNode,
} from 'src/types'
import {
  ModalContext,
  WindowSizeContext,
  TreeControllerContext,
} from 'src/contexts'
import {
  Loading,
  MoveMap,
  GameInfo,
  Highlight,
  BlunderMeter,
  AnalysisGameList,
  GameBoard,
  DownloadModelModal,
  AuthenticatedWrapper,
  MovesContainer,
  BoardController,
} from 'src/components'
import Head from 'next/head'
import toast from 'react-hot-toast'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import type { Key } from 'chessground/types'
import { Chess, PieceSymbol } from 'chess.ts'
import { AnimatePresence } from 'framer-motion'
import type { DrawBrushes, DrawShape } from 'chessground/draw'
import { useAnalysisController, useLocalStorage } from 'src/hooks'
import { ConfigurableScreens } from 'src/components/Analysis/ConfigurableScreens'

const MAIA_MODELS = [
  'maia_kdd_1100',
  'maia_kdd_1200',
  'maia_kdd_1300',
  'maia_kdd_1400',
  'maia_kdd_1500',
  'maia_kdd_1600',
  'maia_kdd_1700',
  'maia_kdd_1800',
  'maia_kdd_1900',
]

const AnalysisPage: NextPage = () => {
  const { openedModals, setInstructionsModalProps: setInstructionsModalProps } =
    useContext(ModalContext)

  const router = useRouter()

  useEffect(() => {
    if (!openedModals.analysis) {
      setInstructionsModalProps({ instructionsType: 'analysis' })
    }
    return () => setInstructionsModalProps(undefined)
  }, [setInstructionsModalProps, openedModals.analysis])

  const { id } = router.query

  const [analyzedGame, setAnalyzedGame] = useState<AnalyzedGame | undefined>(
    undefined,
  )
  const [currentId, setCurrentId] = useState<string[]>(id as string[])

  const getAndSetTournamentGame = useCallback(
    async (
      newId: string[],
      setCurrentMove?: Dispatch<SetStateAction<number>>,
    ) => {
      let game
      try {
        game = await getAnalyzedTournamentGame(newId)
      } catch (e) {
        router.push('/401')
        return
      }
      if (setCurrentMove) setCurrentMove(0)

      setAnalyzedGame({ ...game, type: 'tournament' })
      setCurrentId(newId)

      router.push(`/analysis/${newId.join('/')}`, undefined, {
        shallow: true,
      })
    },
    [router],
  )

  const getAndSetLichessGame = useCallback(
    async (
      id: string,
      pgn: string,
      setCurrentMove?: Dispatch<SetStateAction<number>>,
    ) => {
      let game
      try {
        game = await getAnalyzedLichessGame(id, pgn)
      } catch (e) {
        router.push('/401')
        return
      }
      if (setCurrentMove) setCurrentMove(0)

      setAnalyzedGame({
        ...game,
        type: 'pgn',
      })
      setCurrentId([id, 'pgn'])

      router.push(`/analysis/${id}/pgn`, undefined, { shallow: true })
    },
    [router],
  )

  const getAndSetUserGame = useCallback(
    async (
      id: string,
      type: 'play' | 'hand' | 'brain',
      setCurrentMove?: Dispatch<SetStateAction<number>>,
    ) => {
      let game
      try {
        game = await getAnalyzedUserGame(id, type)
      } catch (e) {
        router.push('/401')
        return
      }
      if (setCurrentMove) setCurrentMove(0)

      setAnalyzedGame({ ...game, type })
      setCurrentId([id, type])

      router.push(`/analysis/${id}/${type}`, undefined, {
        shallow: true,
      })
    },
    [],
  )

  useEffect(() => {
    ;(async () => {
      if (analyzedGame == undefined) {
        const queryId = id as string[]
        if (queryId[1] === 'pgn') {
          const pgn = await getLichessGamePGN(queryId[0])
          getAndSetLichessGame(queryId[0], pgn, undefined)
        } else if (['play', 'hand', 'brain'].includes(queryId[1])) {
          getAndSetUserGame(queryId[0], queryId[1] as 'play' | 'hand' | 'brain')
        } else {
          getAndSetTournamentGame(queryId)
        }
      }
    })()
  }, [
    id,
    analyzedGame,
    getAndSetTournamentGame,
    getAndSetLichessGame,
    getAndSetUserGame,
  ])

  return (
    <>
      {analyzedGame ? (
        <Analysis
          currentId={currentId}
          analyzedGame={analyzedGame}
          getAndSetTournamentGame={getAndSetTournamentGame}
          getAndSetLichessGame={getAndSetLichessGame}
          getAndSetUserGame={getAndSetUserGame}
        />
      ) : (
        <Loading />
      )}
    </>
  )
}

interface Props {
  currentId: string[]
  analyzedGame: AnalyzedGame

  getAndSetTournamentGame: (
    newId: string[],
    setCurrentMove?: Dispatch<SetStateAction<number>>,
  ) => Promise<void>
  getAndSetLichessGame: (
    id: string,
    pgn: string,
    setCurrentMove?: Dispatch<SetStateAction<number>>,
  ) => Promise<void>
  getAndSetUserGame: (
    id: string,
    type: 'play' | 'hand' | 'brain',
    setCurrentMove?: Dispatch<SetStateAction<number>>,
  ) => Promise<void>
}

const Analysis: React.FC<Props> = ({
  currentId,
  analyzedGame,
  getAndSetTournamentGame,
  getAndSetLichessGame,
  getAndSetUserGame,
}: Props) => {
  const screens = [
    {
      id: 'configure',
      name: 'Configure',
    },
    {
      id: 'export',
      name: 'Export',
    },
  ]

  const { width } = useContext(WindowSizeContext)
  const isMobile = useMemo(() => width > 0 && width <= 670, [width])
  const [hoverArrow, setHoverArrow] = useState<DrawShape | null>(null)
  const [arrows, setArrows] = useState<DrawShape[]>([])
  const [brushes, setBrushes] = useState<DrawBrushes>({} as DrawBrushes)
  const [screen, setScreen] = useState(screens[0])
  const toastId = useRef<string>(null)
  const [currentSquare, setCurrentSquare] = useState<Key | null>(null)

  const {
    maiaStatus,
    downloadMaia,
    maiaProgress,
    controller,
    move,
    moves,
    currentMaiaModel,
    setCurrentMaiaModel,
    colorSanMapping,
    moveEvaluation,
    movesByRating,
    moveRecommendations,
    moveMap,
    blunderMeter,
    boardDescription,
  } = useAnalysisController(analyzedGame)

  useEffect(() => {
    controller.setCurrentNode(analyzedGame.tree?.getRoot())
  }, [analyzedGame])

  useEffect(() => {
    setHoverArrow(null)
  }, [controller.currentNode])

  useEffect(() => {
    return () => {
      toast.dismiss()
    }
  }, [])

  useEffect(() => {
    if (maiaStatus === 'loading' && !toastId.current) {
      toastId.current = toast.loading('Loading Maia Model...')
    } else if (maiaStatus === 'ready') {
      if (toastId.current) {
        toast.success('Loaded Maia! Analysis is ready', {
          id: toastId.current,
        })
      } else {
        toast.success('Loaded Maia! Analysis is ready')
      }
    }
  }, [maiaStatus])

  const launchContinue = useCallback(() => {
    const fen = controller.currentNode?.fen as string
    const url = '/play' + '?fen=' + encodeURIComponent(fen)

    window.open(url)
  }, [controller.currentNode])

  useEffect(() => {
    const arr = []

    if (moveEvaluation?.maia) {
      const maia = Object.entries(moveEvaluation?.maia?.policy)[0]
      if (maia) {
        arr.push({
          brush: 'red',
          orig: maia[0].slice(0, 2) as Key,
          dest: maia[0].slice(2, 4) as Key,
        } as DrawShape)
      }
    }

    if (moveEvaluation?.stockfish) {
      const stockfish = Object.entries(moveEvaluation?.stockfish.cp_vec)[0]
      if (stockfish) {
        arr.push({
          brush: 'blue',
          orig: stockfish[0].slice(0, 2) as Key,
          dest: stockfish[0].slice(2, 4) as Key,
          modifiers: { lineWidth: 8 },
        })
      }
    }

    setArrows(arr)
  }, [moveEvaluation, controller.currentNode, controller.orientation])

  const hover = (move?: string) => {
    if (move) {
      setHoverArrow({
        orig: move.slice(0, 2) as Key,
        dest: move.slice(2, 4) as Key,
        brush: 'green',
        modifiers: {
          lineWidth: 10,
        },
      })
    } else {
      setHoverArrow(null)
    }
  }

  const makeMove = (move: string) => {
    if (!controller.currentNode || !analyzedGame.tree) return

    const chess = new Chess(controller.currentNode.fen)
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

      if (controller.currentNode.mainChild?.move === moveString) {
        controller.goToNode(controller.currentNode.mainChild)
      } else {
        const newVariation = analyzedGame.tree.addVariation(
          controller.currentNode,
          newFen,
          moveString,
          san,
          currentMaiaModel,
        )
        controller.goToNode(newVariation)
      }
    }
  }

  const Player = ({
    name,
    rating,
    color,
    termination,
  }: {
    name: string
    color: string
    rating?: number
    termination?: string
  }) => {
    return (
      <div className="flex h-10 w-full items-center justify-between bg-background-1 px-4">
        <div className="flex items-center gap-1.5">
          <div
            className={`h-2.5 w-2.5 rounded-full ${color === 'white' ? 'bg-white' : 'border bg-black'}`}
          />
          <p>
            {name ?? 'Unknown'} {rating ? `(${rating})` : null}
          </p>
        </div>
        {termination === color ? (
          <p className="text-engine-3">1</p>
        ) : termination !== 'none' ? (
          <p className="text-human-3">0</p>
        ) : termination === undefined ? (
          <></>
        ) : (
          <p>1/2</p>
        )}
      </div>
    )
  }

  const NestedGameInfo = () => (
    <div className="flex w-full flex-col">
      <div className="hidden md:block">
        {[analyzedGame.whitePlayer, analyzedGame.blackPlayer].map(
          (player, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-white' : 'border-[0.5px] bg-black'}`}
                />
                <p className="text-sm">{player.name}</p>
                <span className="text-xs">
                  {player.rating ? <>({player.rating})</> : null}
                </span>
              </div>
              {analyzedGame.termination.winner ===
              (index == 0 ? 'white' : 'black') ? (
                <p className="text-xs text-engine-3">1</p>
              ) : analyzedGame.termination.winner !== 'none' ? (
                <p className="text-xs text-human-3">0</p>
              ) : analyzedGame.termination === undefined ? (
                <></>
              ) : (
                <p className="text-xs">1/2</p>
              )}
            </div>
          ),
        )}
      </div>
      <div className="flex w-full items-center justify-between text-xs md:hidden">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-white" />
          <span className="font-medium">{analyzedGame.whitePlayer.name}</span>
          {analyzedGame.whitePlayer.rating && (
            <span className="text-primary/60">
              ({analyzedGame.whitePlayer.rating})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {analyzedGame.termination.winner === 'none' ? (
            <span className="font-medium text-primary/80">½-½</span>
          ) : (
            <span className="font-medium">
              <span className="text-primary/70">
                {analyzedGame.termination.winner === 'white' ? '1' : '0'}
              </span>
              <span className="text-primary/70">-</span>
              <span className="text-primary/70">
                {analyzedGame.termination.winner === 'black' ? '1' : '0'}
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full border-[0.5px] bg-black" />
          <span className="font-medium">{analyzedGame.blackPlayer.name}</span>
          {analyzedGame.blackPlayer.rating && (
            <span className="text-primary/60">
              ({analyzedGame.blackPlayer.rating})
            </span>
          )}
        </div>
      </div>
    </div>
  )

  const desktopLayout = (
    <div className="flex h-full w-full flex-col items-center py-4 md:py-10">
      <div className="flex h-full w-[90%] flex-row gap-4">
        <div
          id="navigation"
          className="flex h-[85vh] w-72 min-w-60 max-w-72 flex-col gap-2 overflow-hidden 2xl:min-w-72"
        >
          <GameInfo title="Analysis" icon="bar_chart" type="analysis">
            <NestedGameInfo />
          </GameInfo>
          <div className="flex max-h-[25vh] min-h-[25vh] flex-col bg-backdrop/30">
            <AnalysisGameList
              currentId={currentId}
              loadNewTournamentGame={(newId, setCurrentMove) =>
                getAndSetTournamentGame(newId, setCurrentMove)
              }
              loadNewLichessGames={(id, pgn, setCurrentMove) =>
                getAndSetLichessGame(id, pgn, setCurrentMove)
              }
              loadNewUserGames={(id, type, setCurrentMove) =>
                getAndSetUserGame(id, type, setCurrentMove)
              }
            />
          </div>
          <div className="flex h-1/2 w-full flex-1 flex-col gap-2">
            <div className="flex h-full flex-col overflow-y-scroll">
              <MovesContainer
                game={analyzedGame}
                termination={analyzedGame.termination}
                type="analysis"
              />
              <BoardController
                orientation={controller.orientation}
                setOrientation={controller.setOrientation}
                currentNode={controller.currentNode}
                plyCount={controller.plyCount}
                goToNode={controller.goToNode}
                goToNextNode={controller.goToNextNode}
                goToPreviousNode={controller.goToPreviousNode}
                goToRootNode={controller.goToRootNode}
              />
            </div>
          </div>
        </div>
        <div className="flex h-[85vh] w-[45vh] flex-col gap-2 2xl:w-[55vh]">
          <div className="flex w-full flex-col overflow-hidden rounded">
            <Player
              name={
                controller.orientation === 'white'
                  ? analyzedGame.blackPlayer.name
                  : analyzedGame.whitePlayer.name
              }
              rating={
                controller.orientation === 'white'
                  ? analyzedGame.blackPlayer.rating
                  : analyzedGame.whitePlayer.rating
              }
              color={controller.orientation === 'white' ? 'black' : 'white'}
              termination={analyzedGame.termination.winner}
            />
            <div className="relative flex aspect-square w-[45vh] 2xl:w-[55vh]">
              <GameBoard
                game={analyzedGame}
                moves={moves}
                setCurrentSquare={setCurrentSquare}
                shapes={hoverArrow ? [...arrows, hoverArrow] : [...arrows]}
                currentNode={controller.currentNode as GameNode}
                orientation={controller.orientation}
                goToNode={controller.goToNode}
                gameTree={analyzedGame.tree}
              />
            </div>
            <Player
              name={
                controller.orientation === 'white'
                  ? analyzedGame.whitePlayer.name
                  : analyzedGame.blackPlayer.name
              }
              rating={
                controller.orientation === 'white'
                  ? analyzedGame.whitePlayer.rating
                  : analyzedGame.blackPlayer.rating
              }
              color={controller.orientation === 'white' ? 'white' : 'black'}
              termination={analyzedGame.termination.winner}
            />
          </div>
          <ConfigurableScreens
            currentMaiaModel={currentMaiaModel}
            setCurrentMaiaModel={setCurrentMaiaModel}
            launchContinue={launchContinue}
            MAIA_MODELS={MAIA_MODELS}
            game={analyzedGame}
            currentNode={controller.currentNode as GameNode}
          />
        </div>
        <div
          id="analysis"
          className="flex h-[calc(55vh+5rem)] w-full flex-col gap-2"
        >
          <div className="flex h-[calc((55vh+4.5rem)/2)]">
            <Highlight
              hover={hover}
              makeMove={makeMove}
              currentMaiaModel={currentMaiaModel}
              recommendations={moveRecommendations}
              moveEvaluation={
                moveEvaluation as {
                  maia?: MaiaEvaluation
                  stockfish?: StockfishEvaluation
                }
              }
              movesByRating={movesByRating}
              colorSanMapping={colorSanMapping}
              boardDescription={boardDescription}
            />
          </div>
          <div className="flex h-[calc((55vh+4.5rem)/2)] flex-row gap-2">
            <div className="flex h-full w-full flex-col">
              <MoveMap
                moveMap={moveMap}
                colorSanMapping={colorSanMapping}
                setHoverArrow={setHoverArrow}
              />
            </div>
            <BlunderMeter
              hover={hover}
              makeMove={makeMove}
              data={blunderMeter}
              colorSanMapping={colorSanMapping}
            />
          </div>
        </div>
      </div>
    </div>
  )

  const [showGameListMobile, setShowGameListMobile] = useState(false)

  const mobileLayout = (
    <>
      <div className="flex h-full flex-1 flex-col justify-center gap-1">
        {showGameListMobile ? (
          <div className="flex w-full flex-col items-start justify-start gap-1">
            <div className="flex w-full flex-col items-start justify-start overflow-hidden bg-background-1 p-3">
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center justify-start gap-1.5">
                  <span className="material-symbols-outlined text-xl">
                    format_list_bulleted
                  </span>
                  <h2 className="text-xl font-semibold">Switch Game</h2>
                </div>
                <button
                  className="flex items-center gap-1 rounded bg-background-2 px-2 py-1 text-sm duration-200 hover:bg-background-3"
                  onClick={() => setShowGameListMobile(false)}
                >
                  <span className="material-symbols-outlined text-sm">
                    arrow_back
                  </span>
                  <span>Back to Analysis</span>
                </button>
              </div>
              <p className="mt-1 text-sm text-secondary">
                Select a game to analyze
              </p>
            </div>
            <div className="flex h-[calc(100vh-10rem)] w-full flex-col overflow-hidden rounded bg-backdrop/30">
              <AnalysisGameList
                currentId={currentId}
                loadNewTournamentGame={(newId, setCurrentMove) =>
                  loadGameAndCloseList(
                    getAndSetTournamentGame(newId, setCurrentMove),
                  )
                }
                loadNewLichessGames={(id, pgn, setCurrentMove) =>
                  loadGameAndCloseList(
                    getAndSetLichessGame(id, pgn, setCurrentMove),
                  )
                }
                loadNewUserGames={(id, type, setCurrentMove) =>
                  loadGameAndCloseList(
                    getAndSetUserGame(id, type, setCurrentMove),
                  )
                }
              />
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col items-start justify-start gap-1">
            <GameInfo
              title="Analysis"
              icon="bar_chart"
              type="analysis"
              currentMaiaModel={currentMaiaModel}
              setCurrentMaiaModel={setCurrentMaiaModel}
              MAIA_MODELS={MAIA_MODELS}
              onGameListClick={() => setShowGameListMobile(true)}
              showGameListButton={true}
            >
              <NestedGameInfo />
            </GameInfo>
            <div className="relative flex h-[100vw] w-screen">
              <GameBoard
                game={analyzedGame}
                moves={moves}
                setCurrentSquare={setCurrentSquare}
                shapes={hoverArrow ? [...arrows, hoverArrow] : [...arrows]}
                currentNode={controller.currentNode as GameNode}
                orientation={controller.orientation}
                goToNode={controller.goToNode}
                gameTree={analyzedGame.tree}
              />
            </div>
            <div className="flex w-full flex-col gap-0">
              <div className="w-full !flex-grow-0">
                <BoardController
                  orientation={controller.orientation}
                  setOrientation={controller.setOrientation}
                  currentNode={controller.currentNode}
                  plyCount={controller.plyCount}
                  goToNode={controller.goToNode}
                  goToNextNode={controller.goToNextNode}
                  goToPreviousNode={controller.goToPreviousNode}
                  goToRootNode={controller.goToRootNode}
                />
              </div>
              <div className="relative bottom-0 h-48 max-h-48 flex-1 overflow-auto overflow-y-hidden">
                <MovesContainer
                  game={analyzedGame}
                  termination={analyzedGame.termination}
                  type="analysis"
                />
              </div>
            </div>
            <div className="flex w-full flex-col gap-1 overflow-hidden">
              <BlunderMeter
                hover={hover}
                makeMove={makeMove}
                data={blunderMeter}
                colorSanMapping={colorSanMapping}
              />
              <Highlight
                hover={hover}
                makeMove={makeMove}
                currentMaiaModel={currentMaiaModel}
                recommendations={moveRecommendations}
                moveEvaluation={
                  moveEvaluation as {
                    maia?: MaiaEvaluation
                    stockfish?: StockfishEvaluation
                  }
                }
                movesByRating={movesByRating}
                colorSanMapping={colorSanMapping}
                boardDescription={boardDescription}
              />
              <MoveMap
                moveMap={moveMap}
                colorSanMapping={colorSanMapping}
                setHoverArrow={setHoverArrow}
              />
            </div>
            <ConfigurableScreens
              currentMaiaModel={currentMaiaModel}
              setCurrentMaiaModel={setCurrentMaiaModel}
              launchContinue={launchContinue}
              MAIA_MODELS={MAIA_MODELS}
              game={analyzedGame}
              currentNode={controller.currentNode as GameNode}
            />
          </div>
        )}
      </div>
    </>
  )

  // Helper function to load a game and close the game list
  const loadGameAndCloseList = async (loadFunction: Promise<void>) => {
    await loadFunction
    setShowGameListMobile(false)
  }

  return (
    <>
      <Head>
        <title>Maia Chess - Analyze</title>
        <meta
          name="description"
          content="Collection of chess training and analysis tools centered around Maia."
        />
      </Head>
      <AnimatePresence>
        {maiaStatus === 'no-cache' || maiaStatus === 'downloading' ? (
          <DownloadModelModal progress={maiaProgress} download={downloadMaia} />
        ) : null}
      </AnimatePresence>
      <TreeControllerContext.Provider value={{ ...controller }}>
        {analyzedGame && (isMobile ? mobileLayout : desktopLayout)}
      </TreeControllerContext.Provider>
    </>
  )
}

export default function AuthenticatedAnalysisPage() {
  return (
    <AuthenticatedWrapper>
      <AnalysisPage />
    </AuthenticatedWrapper>
  )
}
