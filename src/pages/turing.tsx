import Head from 'next/head'
import { NextPage } from 'next/types'
import { useCallback, useContext, useEffect } from 'react'

import {
  ModalContext,
  WindowSizeContext,
  GameControllerContext,
  TuringControllerContext,
} from 'src/contexts'
import {
  Loading,
  GameInfo,
  GameBoard,
  TuringGames,
  MovesContainer,
  BoardController,
  TuringSubmission,
} from 'src/components'
import { AllStats } from 'src/hooks/useStats'
import { TuringGame } from 'src/types/turing'
import styles from 'src/styles/App.module.scss'
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
  const { isMobile } = useContext(WindowSizeContext)

  const controller = useGameController(game)

  const launchContinue = useCallback(() => {
    const fen = game.moves[controller.currentIndex].board

    const url = '/play' + '?fen=' + encodeURIComponent(fen)

    window.open(url)
  }, [game, controller])

  const desktopLayout = (
    <>
      <div className={styles.outer}>
        <div className={styles.container}>
          <div className={styles.side}>
            <div className={styles.info}>
              <GameInfo
                termination={game.termination}
                blackPlayer={game.result?.blackPlayer}
                whitePlayer={game.result?.whitePlayer}
                type={'turing'}
                id={game.id}
                showId={false}
                instructionsType="turing"
              />
            </div>
            <div className={styles.play}>
              <button onClick={launchContinue}>Continue against Maia</button>
            </div>
            <StatsDisplay stats={stats} />
          </div>
          <div className={styles.board}>
            <GameBoard game={game} />
          </div>
          <div className={styles.side}>
            <div className={styles.moves}>
              <MovesContainer game={game} termination={game.termination} />
            </div>
            <div className={styles.info}>
              <TuringSubmission />
            </div>
            <div className={styles.controls}>
              <BoardController />
            </div>
          </div>
        </div>
        <div className={styles.sf} style={{ marginRight: 0 }}>
          <TuringGames />
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
                termination={game.termination}
                blackPlayer={game.result?.blackPlayer}
                whitePlayer={game.result?.whitePlayer}
                type={'turing'}
                id={game.id}
                showId={false}
                instructionsType="turing"
              />
            </div>
          </div>
          <div className={styles.board}>
            <GameBoard game={game} />
          </div>
          <div className={styles.side}>
            <div className={styles.moves}>
              <MovesContainer game={game} termination={game.termination} />
            </div>
            <div className={styles.controls}>
              <BoardController />
            </div>
            <div className={styles.info}>
              <TuringSubmission />
            </div>
            <div className={styles.play}>
              <button onClick={launchContinue}>Continue against Maia</button>
            </div>
          </div>
        </div>
        <div className={styles.sf} style={{ marginRight: 0 }}>
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
