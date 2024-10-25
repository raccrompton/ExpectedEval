import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import styles from 'src/styles/App.module.scss'
import {
  AuthContext,
  GameControllerContext,
  WindowSizeContext,
} from 'src/contexts'
import {
  BoardController,
  GameBoard,
  GameInfo,
  MovesContainer,
} from 'src/components'
import Head from 'next/head'
import { useGameController } from 'src/hooks'
import { PromotionOverlay } from 'src/components/PromotionOverlay'
import { PlayControllerContext } from 'src/contexts/PlayControllerContext/PlayControllerContext'
import type { DrawShape } from 'chessground/draw'
import { GameClock } from '../GameClock'
import classNames from 'classnames'
import { useUnload } from 'src/hooks/useUnload'
import { StatsDisplay } from '../StatsDisplay'
import { AllStats } from 'src/hooks/useStats'

interface Props {
  boardShapes?: DrawShape[]
  resign?: () => void
  offerDraw?: () => void
  playAgain?: () => void
}

export const GameplayInterface: React.FC<Props> = (
  props: React.PropsWithChildren<Props>,
) => {
  const {
    game,
    playType,
    maiaVersion,
    availableMoves,
    makeMove,
    player,
    setCurrentSquare,
    timeControl,
    stats,
  } = useContext(PlayControllerContext)
  const { isMobile } = useContext(WindowSizeContext)

  const controller = useGameController(game, 0, player)

  const { user } = useContext(AuthContext)

  const [promotionFromTo, setPromotionFromTo] = useState<
    [string, string] | null
  >(null)

  const setCurrentIndex = controller.setCurrentIndex

  const setCurrentMove = useCallback(
    (move) => {
      if (move) {
        const matching = availableMoves.filter(
          (m) => m.from == move[0] && m.to == move[1],
        )

        if (matching.length > 1) {
          // Multiple matching moves (i.e. promotion)
          // Show promotion UI
          setPromotionFromTo(move)
        } else {
          const moveUci =
            matching[0].from + matching[0].to + (matching[0].promotion ?? '')
          makeMove(moveUci)
        }
      }
    },
    [availableMoves, makeMove, setPromotionFromTo],
  )

  const selectPromotion = useCallback(
    (piece) => {
      if (!promotionFromTo) {
        return
      }
      setPromotionFromTo(null)
      const moveUci = promotionFromTo[0] + promotionFromTo[1] + piece
      makeMove(moveUci)
    },
    [promotionFromTo, setPromotionFromTo, makeMove],
  )

  useEffect(() => {
    setCurrentIndex(game.moves.length - 1)
  }, [setCurrentIndex, game])

  useUnload((e) => {
    if (!game.termination) {
      e.preventDefault()
      return 'Are you sure you want to leave a game in progress?'
    }
  })

  const moveMap = useMemo(() => {
    const result = new Map()

    for (const move of availableMoves) {
      const from = move.from
      const to = move.to

      if (result.has(from)) {
        result.get(from).push(to)
      } else {
        result.set(from, [to])
      }
    }

    return result
  }, [availableMoves])

  const maiaTitle = maiaVersion.replace('maia_kdd_', 'Maia ')
  const blackPlayer = player == 'black' ? user?.displayName : maiaTitle
  const whitePlayer = player == 'white' ? user?.displayName : maiaTitle

  const desktopLayout = (
    <>
      <div className={styles.outer}>
        <div className={styles.container}>
          <div className={styles.side}>
            <div className={styles.info}>
              <GameInfo
                termination={game.termination}
                blackPlayer={{ name: blackPlayer ?? 'Unknown' }}
                whitePlayer={{ name: whitePlayer ?? 'Unknown' }}
                type={playType}
                id={game.id}
                showId={false}
                instructionsType={playType}
              />
            </div>
            <div className={styles.play}></div>
            <StatsDisplay stats={stats} hideSession={true} />
          </div>
          <div className={styles.board}>
            <GameBoard
              game={game}
              moves={moveMap}
              setCurrentMove={setCurrentMove}
              setCurrentSquare={setCurrentSquare}
              shapes={props.boardShapes}
            />
            {promotionFromTo ? (
              <PromotionOverlay
                player={player}
                file={promotionFromTo[1].slice(0)}
                selectPromotion={selectPromotion}
              />
            ) : null}
          </div>
          <div className={classNames([styles.side, styles.gameplay])}>
            {timeControl != 'unlimited' ? (
              <GameClock
                player={controller.orientation == 'white' ? 'black' : 'white'}
                reversed={false}
              />
            ) : null}
            <div className={classNames([styles.moves, styles.gameplay])}>
              <MovesContainer game={game} termination={game.termination} />
            </div>
            <div className={styles.info}>{props.children}</div>
            <div className={styles.controls}>
              <BoardController />
            </div>
            {timeControl != 'unlimited' ? (
              <GameClock player={controller.orientation} reversed={true} />
            ) : null}
          </div>
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
                blackPlayer={{ name: blackPlayer ?? 'Unknown' }}
                whitePlayer={{ name: whitePlayer ?? 'Unknown' }}
                type={playType}
                id={game.id}
                showId={false}
                instructionsType={playType}
              />
            </div>
            <div className={styles.play}></div>
          </div>
          <div className={styles.board}>
            <GameBoard
              game={game}
              moves={moveMap}
              setCurrentMove={setCurrentMove}
              setCurrentSquare={setCurrentSquare}
              shapes={props.boardShapes}
            />
            {promotionFromTo ? (
              <PromotionOverlay
                player={player}
                file={promotionFromTo[1].slice(0)}
                selectPromotion={selectPromotion}
              />
            ) : null}
          </div>
          <div className={styles.side}>
            {timeControl != 'unlimited' ? (
              <GameClock
                player={controller.orientation == 'white' ? 'black' : 'white'}
                reversed={false}
              />
            ) : null}
            <div className={styles.info}>{props.children}</div>
            <div className={styles.controls}>
              <BoardController />
            </div>
            {timeControl != 'unlimited' ? (
              <GameClock player={controller.orientation} reversed={true} />
            ) : null}
            <StatsDisplay stats={stats} hideSession={true} />
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <Head>
        <title>Maia Chess - Play</title>
        <meta name="description" content="Turing survey" />
      </Head>
      <GameControllerContext.Provider value={{ ...controller }}>
        {isMobile ? mobileLayout : desktopLayout}
      </GameControllerContext.Provider>
    </>
  )
}
