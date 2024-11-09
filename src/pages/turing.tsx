import Head from 'next/head'
import { NextPage } from 'next/types'
import { useCallback, useContext, useEffect } from 'react'

import {
  ThemeContext,
  ModalContext,
  WindowSizeContext,
  GameControllerContext,
  TuringControllerContext,
} from 'src/contexts'
import {
  Loading,
  GameBoard,
  TuringGames,
  MovesContainer,
  BoardController,
  TuringSubmission,
} from 'src/components'
import { GameInfo } from 'src/components/Core'
import { AllStats } from 'src/hooks/useStats'
import { TuringGame } from 'src/types/turing'
import { StatsDisplay } from 'src/components/StatsDisplay'
import { useGameController, useTuringController } from 'src/hooks'

const TuringPage: NextPage = () => {
  const { openedModals, setInstructionsModalProps: setInstructionsModalProps } =
    useContext(ModalContext)

  useEffect(() => {
    if (!openedModals.turing) {
      setInstructionsModalProps({ instructionsType: 'turing' })
    }
    return () => setInstructionsModalProps(undefined)
  }, [setInstructionsModalProps, openedModals.turing])

  const controller = useTuringController()

  return (
    <TuringControllerContext.Provider value={controller}>
      {controller.game ? (
        <Turing game={controller.game} stats={controller.stats} />
      ) : (
        <Loading />
      )}
    </TuringControllerContext.Provider>
  )
}

interface Props {
  game: TuringGame
  stats: AllStats
}

const Turing: React.FC<Props> = (props: Props) => {
  const { game, stats } = props
  const { theme } = useContext(ThemeContext)
  const { isMobile } = useContext(WindowSizeContext)

  const controller = useGameController(game)

  const launchContinue = useCallback(() => {
    const fen = game.moves[controller.currentIndex].board

    const url = '/play' + '?fen=' + encodeURIComponent(fen)

    window.open(url)
  }, [game, controller])

  const Info = (
    <>
      <div className="flex w-full items-center justify-between text-secondary">
        <p>{theme == 'dark' ? '●' : '○'} Unknown</p>
        <p>
          {game.termination.winner === 'white' ? (
            <span className="text-engine-3">1</span>
          ) : game.termination.winner === 'black' ? (
            <span className="text-human-3">0</span>
          ) : (
            <span>1/2</span>
          )}
        </p>
      </div>
      <div className="flex w-full items-center justify-between text-secondary">
        <p>{theme == 'light' ? '●' : '○'} Unknown</p>
        <p>
          {game.termination.winner === 'black' ? (
            <span className="text-engine-3">1</span>
          ) : game.termination.winner === 'white' ? (
            <span className="text-human-3">0</span>
          ) : (
            <span>1/2</span>
          )}
        </p>
      </div>{' '}
      {game.termination ? (
        <p className="text-center capitalize text-secondary">
          {game.termination.winner !== 'none'
            ? `${game.termination.winner} wins`
            : 'draw'}
        </p>
      ) : null}
    </>
  )

  const desktopLayout = (
    <>
      <div className="flex h-full flex-1 flex-col justify-center gap-1">
        <div className="mt-2 flex w-full flex-row items-center justify-center gap-1">
          <div
            style={{
              maxWidth: 'min(20vw, 100vw - 75vh)',
            }}
            className="flex h-[75vh] w-[40vh] flex-col justify-between"
          >
            <div className="flex w-full flex-col gap-2">
              <GameInfo title="Bot or Not" icon="smart_toy" type="turing">
                {Info}
              </GameInfo>
              <div className="flex w-full items-center rounded bg-human-3 px-4 py-2 transition duration-200 hover:bg-human-4">
                <button onClick={launchContinue}>Continue against Maia</button>
              </div>
              <div className="flex flex-row flex-wrap items-start justify-start gap-1 overflow-y-auto">
                <TuringGames />
              </div>
            </div>
            <StatsDisplay stats={stats} />
          </div>
          <div className="relative flex aspect-square w-full max-w-[75vh]">
            <GameBoard game={game} />
          </div>
          <div
            style={{
              maxWidth: 'min(20vw, 100vw - 75vh)',
            }}
            className="flex h-[75vh] w-[40vh] flex-col gap-1"
          >
            <div className="relative bottom-0 h-full min-h-[38px] flex-1">
              <MovesContainer game={game} termination={game.termination} />
            </div>
            <div>
              <TuringSubmission />
            </div>
            <div className="flex-none">
              <BoardController />
            </div>
          </div>
        </div>
      </div>
    </>
  )

  const mobileLayout = (
    <>
      <div className="flex h-full flex-1 flex-col justify-center gap-1">
        <div className="mt-2 flex h-full flex-col items-start justify-start gap-2">
          <div className="flex h-auto w-full flex-col gap-2">
            <div className="w-screen">
              <GameInfo title="Bot or Not" icon="smart_toy" type="turing">
                {Info}
              </GameInfo>
            </div>
          </div>
          <div className="relative flex aspect-square h-[100vw] w-screen">
            <GameBoard game={game} />
          </div>
          <div className="flex h-auto w-full flex-col gap-1">
            <div className="relative bottom-0 h-full flex-1 overflow-auto">
              <MovesContainer game={game} termination={game.termination} />
            </div>
            <div className="flex-none">
              <BoardController />
            </div>
            <div className="w-screen">
              <TuringSubmission />
            </div>
            <div className="flex w-full">
              <button
                onClick={launchContinue}
                className="flex w-full flex-1 items-center rounded bg-human-3 px-4 py-2 transition duration-200 hover:bg-human-4"
              >
                Continue Against Maia
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-row flex-wrap items-start justify-start gap-1 overflow-y-auto">
          <TuringGames />
        </div>
        <StatsDisplay stats={stats} />
      </div>
    </>
  )

  return (
    <>
      <Head>
        <title>Maia Chess - Bot or Not</title>
        <meta name="description" content="Turing survey" />
      </Head>
      <GameControllerContext.Provider value={{ ...controller }}>
        {isMobile ? mobileLayout : desktopLayout}
      </GameControllerContext.Provider>
    </>
  )
}

export default TuringPage
