import toast from 'react-hot-toast'
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
import Head from 'next/head'
import type { NextPage } from 'next'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/router'
import type { Key } from 'chessground/types'
import type { DrawBrushes, DrawShape } from 'chessground/draw'

import {
  getLichessGamePGN,
  getAnalyzedUserGame,
  getAnalyzedLichessGame,
  getAnalyzedTournamentGame,
} from 'src/api'
import {
  Loading,
  MoveMap,
  GameInfo,
  Highlight,
  ExportGame,
  MovesByRating,
  BoardController,
  ClientGameBoard,
  AnalysisGameList,
  DownloadModelModal,
  MoveRecommendations,
  ContinueAgainstMaia,
  AuthenticatedWrapper,
  ClientMovesContainer,
  VerticalEvaluationBar,
  LegacyAnalysisGameList,
  HorizontalEvaluationBar,
  ClientBoardController,
} from 'src/components'
import {
  Color,
  GameTree,
  PlayedGame,
  AnalyzedGame,
  MaiaEvaluation,
  StockfishEvaluation,
  GameNode,
} from 'src/types'
import { useClientAnalysisController, useClientGameController } from 'src/hooks'
import {
  ModalContext,
  WindowSizeContext,
  ClientGameControllerContext,
} from 'src/contexts'
import { ConfigureAnalysis } from 'src/components/Analysis/ConfigureAnalysis'

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

  useEffect(() => {
    if (!openedModals.analysis) {
      setInstructionsModalProps({ instructionsType: 'analysis' })
    }
    return () => setInstructionsModalProps(undefined)
  }, [setInstructionsModalProps, openedModals.analysis])

  const router = useRouter()
  const { id, index, orientation } = router.query

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
      router.push(`/analysis/client/${newId.join('/')}`, undefined, {
        shallow: true,
      })
    },
    [router],
  )

  const getAndSetLichessGames = useCallback(
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
      router.push(`/analysis/client/${id}/pgn`, undefined, { shallow: true })
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
      router.push(`/analysis/client/${id}/${type}`, undefined, {
        shallow: true,
      })
    },
    [],
  )

  useEffect(() => {
    ;(async () => {
      if (analyzedGame == undefined) {
        const queryId = id as string[]
        if (queryId[1] === 'lichess') {
          const pgn = await getLichessGamePGN(queryId[0])
          getAndSetLichessGames(queryId[0], pgn, undefined)
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
    getAndSetLichessGames,
    getAndSetUserGame,
  ])

  return (
    <>
      {analyzedGame ? (
        <Analysis
          currentId={currentId}
          analyzedGame={analyzedGame}
          setAnalyzedGame={setAnalyzedGame}
          initialOrientation={orientation == 'black' ? 'black' : 'white'}
          getAndSetTournamentGame={getAndSetTournamentGame}
          getAndSetLichessGames={getAndSetLichessGames}
          getAndSetUserGames={getAndSetUserGame}
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
  initialOrientation: Color
  setAnalyzedGame: Dispatch<SetStateAction<AnalyzedGame | undefined>>
  getAndSetTournamentGame: (
    newId: string[],
    setCurrentMove?: Dispatch<SetStateAction<number>>,
  ) => Promise<void>
  getAndSetLichessGames: (
    id: string,
    pgn: string,
    setCurrentMove?: Dispatch<SetStateAction<number>>,
    currentMaiaModel?: string,
  ) => Promise<void>
  getAndSetUserGames: (
    id: string,
    type: 'play' | 'hand' | 'brain',
    setCurrentMove: Dispatch<SetStateAction<number>>,
    currentMaiaModel: string,
  ) => Promise<void>
}

const Analysis: React.FC<Props> = ({
  currentId,
  analyzedGame,
  initialOrientation,
  setAnalyzedGame,
  getAndSetTournamentGame,
  getAndSetLichessGames,
  getAndSetUserGames,
}: Props) => {
  const screens = [
    {
      id: 'select',
      name: 'Select Game',
    },
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
  } = useClientAnalysisController(analyzedGame)

  useEffect(() => {
    setHoverArrow(null)
  }, [controller.currentNode])

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
      <div className="flex w-full items-center justify-between bg-background-1 px-4 py-2">
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

  const desktopLayout = (
    <div className="flex h-full w-full flex-col items-center py-4 md:py-10">
      <div className="flex h-full w-[90%] flex-1 flex-col justify-center gap-2">
        <div className="flex w-full flex-row items-start justify-start gap-2">
          <div
            style={{
              width: 'calc(60vh + 1.5rem)',
            }}
            className="flex flex-col gap-2"
          >
            <div className="flex flex-col overflow-hidden rounded-sm">
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
              <div className="flex flex-col items-start">
                <div className="flex flex-row items-start">
                  <div className="relative flex aspect-square w-[60vh]">
                    <ClientGameBoard
                      game={analyzedGame}
                      moves={moves}
                      setCurrentSquare={setCurrentSquare}
                      shapes={
                        hoverArrow ? [...arrows, hoverArrow] : [...arrows]
                      }
                      currentNode={controller.currentNode as GameNode}
                      orientation={controller.orientation}
                      goToNode={controller.goToNode}
                    />
                  </div>
                  <VerticalEvaluationBar
                    value={moveEvaluation?.maia?.value}
                    label="Maia White Win %"
                  />
                </div>
                <div className="flex items-center justify-center">
                  <HorizontalEvaluationBar
                    min={0}
                    max={1200}
                    value={
                      moveEvaluation?.stockfish
                        ? 600 +
                          moveEvaluation.stockfish.model_optimal_cp *
                            (analyzedGame.moves[0].board.split(' ')[1] !==
                            controller.orientation[0]
                              ? 1
                              : -1)
                        : void 0
                    }
                    label="Stockfish Evaluation"
                  />
                  <div className="h-6 w-6 bg-black" />
                </div>
              </div>
              <Player
                name={
                  controller.orientation === 'white'
                    ? analyzedGame.whitePlayer.name
                    : analyzedGame.whitePlayer.name
                }
                rating={
                  controller.orientation === 'white'
                    ? analyzedGame.whitePlayer.rating
                    : analyzedGame.whitePlayer.rating
                }
                color={controller.orientation === 'white' ? 'black' : 'white'}
                termination={analyzedGame.termination.winner}
              />
            </div>
            <div className="flex flex-1 flex-col overflow-hidden rounded bg-background-1/60">
              <div className="flex flex-row border-b border-white/10">
                {screens.map((s) => {
                  const selected = s.id === screen.id
                  return (
                    <div
                      key={s.id}
                      tabIndex={0}
                      role="button"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') setScreen(s)
                      }}
                      onClick={() => setScreen(s)}
                      className={`relative flex cursor-pointer select-none flex-row px-4 py-2 ${selected ? 'bg-white/5' : 'hover:bg-white hover:bg-opacity-[0.02]'} transition duration-200`}
                    >
                      <p
                        className={`${selected ? 'text-primary' : 'text-secondary'} transition duration-200`}
                      >
                        {s.name}
                      </p>
                      {selected ? (
                        <motion.div
                          layoutId="selectedScreen"
                          className="absolute bottom-0 left-0 h-[1px] w-full bg-white"
                        />
                      ) : null}
                    </div>
                  )
                })}
              </div>
              <div className="flex flex-col bg-backdrop/30">
                {screen.id === 'select' ? (
                  <AnalysisGameList
                    currentId={currentId}
                    currentMaiaModel={currentMaiaModel}
                    loadNewTournamentGame={getAndSetTournamentGame}
                    loadNewLichessGames={getAndSetLichessGames}
                    loadNewUserGames={getAndSetUserGames}
                  />
                ) : screen.id === 'configure' ? (
                  <ConfigureAnalysis
                    currentMaiaModel={currentMaiaModel}
                    setCurrentMaiaModel={setCurrentMaiaModel}
                    launchContinue={launchContinue}
                    MAIA_MODELS={MAIA_MODELS}
                  />
                ) : screen.id === 'export' ? (
                  <div className="flex flex-col p-4">
                    <ExportGame
                      game={analyzedGame as unknown as PlayedGame}
                      whitePlayer={analyzedGame.whitePlayer.name}
                      blackPlayer={analyzedGame.blackPlayer.name}
                      event="Analysis"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="grid w-full grid-rows-3 gap-2">
            <div className="h-[calc((90vh - 1rem)/3)] flex gap-2">
              <Highlight
                moveEvaluation={
                  moveEvaluation as {
                    maia?: MaiaEvaluation
                    stockfish?: StockfishEvaluation
                  }
                }
                colorSanMapping={colorSanMapping}
                blunderMeter={blunderMeter}
              />
            </div>
            <div className="h-[calc((90vh - 1rem)/3)] grid grid-cols-2 gap-2 2xl:grid-cols-3">
              <MoveRecommendations
                recommendations={moveRecommendations}
                colorSanMapping={colorSanMapping}
                setHoverArrow={setHoverArrow}
              />
              <div className="hidden h-full flex-col 2xl:flex">
                <MoveMap
                  moveMap={moveMap}
                  colorSanMapping={colorSanMapping}
                  setHoverArrow={setHoverArrow}
                />
              </div>
            </div>
            <div className="h-[calc((90vh - 1rem)/3)] grid grid-cols-3 gap-2 overflow-y-hidden">
              <MovesByRating
                moves={movesByRating}
                colorSanMapping={colorSanMapping}
              />
              <div className="ovrerflow-y-scroll flex h-[30vh] flex-col">
                <ClientBoardController />
                <ClientMovesContainer
                  game={analyzedGame}
                  termination={analyzedGame.termination}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const mobileLayout = (
    <>
      <div className="flex h-full flex-1 flex-col justify-center gap-1">
        <div className="flex w-full flex-col items-start justify-start gap-1">
          <GameInfo title="Analysis" icon="bar_chart" type="analysis">
            <></>
          </GameInfo>
          <div className="relative flex h-[100vw] w-screen">
            <ClientGameBoard
              game={analyzedGame}
              moves={moves}
              setCurrentSquare={setCurrentSquare}
              shapes={hoverArrow ? [...arrows, hoverArrow] : [...arrows]}
              currentNode={controller.currentNode as GameNode}
              orientation={controller.orientation}
              goToNode={controller.goToNode}
            />
          </div>
          <div className="flex h-auto w-full flex-col gap-1">
            <div className="w-screen !flex-grow-0">
              <ClientBoardController />
            </div>
            <div className="relative bottom-0 h-full flex-1 overflow-auto">
              <ClientMovesContainer
                game={analyzedGame}
                termination={analyzedGame.termination}
              />
            </div>
            <div>
              <p>Analyze using:</p>
              <select
                className="w-full cursor-pointer rounded border-none bg-human-4 p-2 outline-none"
                value={currentMaiaModel}
                onChange={(e) => setCurrentMaiaModel(e.target.value)}
              >
                {MAIA_MODELS.map((model) => (
                  <option value={model} key={model}>
                    {model.replace('maia_kdd_', 'Maia ')}
                  </option>
                ))}
              </select>
            </div>
            <ContinueAgainstMaia launchContinue={launchContinue} />
            <LegacyAnalysisGameList
              currentId={currentId}
              currentMaiaModel={currentMaiaModel}
              loadNewTournamentGame={getAndSetTournamentGame}
              loadNewLichessGames={getAndSetLichessGames}
              loadNewUserGames={getAndSetUserGames}
            />
          </div>
        </div>
      </div>
    </>
  )

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
      <ClientGameControllerContext.Provider value={{ ...controller }}>
        {analyzedGame && (isMobile ? mobileLayout : desktopLayout)}
      </ClientGameControllerContext.Provider>
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
