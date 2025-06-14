// NOTE: This file is a direct copy of GameplayInterface.tsx but wired up to the
// new PlayTreeControllerContext so that we can migrate the play pages to the
// GameTree data structure while still retaining the legacy implementation.

import Head from 'next/head'
import type { DrawShape } from 'chessground/draw'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'

import {
  AuthContext,
  ThemeContext,
  WindowSizeContext,
  AnalysisGameControllerContext,
} from 'src/contexts'
import {
  GameInfo,
  GameClock,
  GameBoard,
  ExportGame,
  StatsDisplay,
  AnalysisMovesContainer,
  PlayBoardController,
  PromotionOverlay,
} from 'src/components'
import { useUnload } from 'src/hooks/useUnload'
import { PlayTreeControllerContext } from 'src/contexts/PlayTreeControllerContext/PlayTreeControllerContext'

interface Props {
  boardShapes?: DrawShape[]
  resign?: () => void
  offerDraw?: () => void
  playAgain?: () => void
}

export const GameplayTreeInterface: React.FC<React.PropsWithChildren<Props>> = (
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
    gameTree,
    orientation,
    setOrientation,
    currentNode,
    setCurrentNode,
    goToNode,
    goToNextNode,
    goToPreviousNode,
    goToRootNode,
    plyCount,
  } = useContext(PlayTreeControllerContext)
  const { theme } = useContext(ThemeContext)
  const { isMobile } = useContext(WindowSizeContext)

  const { user } = useContext(AuthContext)

  const [promotionFromTo, setPromotionFromTo] = useState<
    [string, string] | null
  >(null)

  const setCurrentMove = useCallback(
    (move: [string, string] | null) => {
      if (move) {
        const matching = availableMoves.filter((m: any) => {
          return m.from == move[0] && m.to == move[1]
        })

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
    (piece: string) => {
      if (!promotionFromTo) {
        return
      }
      setPromotionFromTo(null)
      const moveUci = promotionFromTo[0] + promotionFromTo[1] + piece
      makeMove(moveUci)
    },
    [promotionFromTo, setPromotionFromTo, makeMove],
  )

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

  const Info = (
    <>
      <div className="flex w-full items-center justify-between text-secondary">
        <p>
          {theme == 'dark' ? '●' : '○'} {whitePlayer ?? 'Unknown'}
        </p>
        <p>
          {game.termination?.winner === 'white' ? (
            <span className="text-engine-3">1</span>
          ) : game.termination?.winner === 'black' ? (
            <span className="text-human-3">0</span>
          ) : game.termination ? (
            <span>1/2</span>
          ) : null}
        </p>
      </div>
      <div className="flex w-full items-center justify-between text-secondary">
        <p>
          {theme == 'light' ? '●' : '○'} {blackPlayer ?? 'Unknown'}
        </p>
        <p>
          {game.termination?.winner === 'black' ? (
            <span className="text-engine-3">1</span>
          ) : game.termination?.winner === 'white' ? (
            <span className="text-human-3">0</span>
          ) : game.termination ? (
            <span>1/2</span>
          ) : null}
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
      <div className="flex h-full flex-1 flex-col justify-center gap-1 py-5 md:py-10">
        <div className="flex w-full flex-row items-center justify-center gap-1">
          <div
            style={{
              maxWidth: 'min(20vw, 100vw - 75vh)',
            }}
            className="flex h-[75vh] w-[40vh] flex-col justify-between gap-1"
          >
            <GameInfo
              icon="swords"
              type={playType}
              title={
                playType === 'againstMaia'
                  ? 'Play vs. Maia'
                  : 'Play Hand and Brain'
              }
            >
              {Info}
            </GameInfo>
            <div className="flex w-full flex-col gap-2">
              <ExportGame
                game={game}
                gameTree={gameTree}
                whitePlayer={whitePlayer ?? 'Unknown'}
                blackPlayer={blackPlayer ?? 'Unknown'}
                event={`Play vs. ${maiaTitle}`}
              />
              <StatsDisplay stats={stats} hideSession={true} />
            </div>
          </div>
          <div className="relative flex aspect-square w-full max-w-[75vh]">
            <GameBoard
              game={game}
              moves={moveMap}
              setCurrentMove={setCurrentMove}
              setCurrentSquare={setCurrentSquare}
              shapes={props.boardShapes}
              currentNode={currentNode}
            />
            {promotionFromTo ? (
              <PromotionOverlay
                player={player}
                file={promotionFromTo[1].slice(0)}
                selectPromotion={selectPromotion}
              />
            ) : null}
          </div>
          <div
            style={{
              maxWidth: 'min(20vw, 100vw - 75vh)',
            }}
            className="flex h-[75vh] w-[40vh] flex-col justify-center gap-1"
          >
            {timeControl != 'unlimited' ? (
              <GameClock
                player={orientation == 'white' ? 'black' : 'white'}
                reversed={false}
              />
            ) : null}
            <div className="relative bottom-0 h-full min-h-[38px] flex-1">
              <AnalysisMovesContainer
                game={game}
                termination={game.termination}
              />
            </div>
            <div>{props.children}</div>
            <div className="flex-none">
              <PlayBoardController />
            </div>
            {timeControl != 'unlimited' ? (
              <GameClock player={orientation} reversed={true} />
            ) : null}
          </div>
        </div>
      </div>
    </>
  )

  const mobileLayout = (
    <>
      <div className="flex h-full flex-1 flex-col justify-center gap-1">
        <div className="mt-2 flex h-full flex-col items-start justify-start gap-2">
          <div className="flex h-auto w-full flex-col gap-1">
            {timeControl != 'unlimited' ? (
              <GameClock
                player={orientation == 'white' ? 'black' : 'white'}
                reversed={false}
              />
            ) : null}
          </div>
          <div className="relative flex aspect-square h-[100vw] w-screen">
            <GameBoard
              game={game}
              moves={moveMap}
              setCurrentMove={setCurrentMove}
              setCurrentSquare={setCurrentSquare}
              shapes={props.boardShapes}
              currentNode={currentNode}
            />
            {promotionFromTo ? (
              <PromotionOverlay
                player={player}
                file={promotionFromTo[1].slice(0)}
                selectPromotion={selectPromotion}
              />
            ) : null}
          </div>
          <div className="flex h-auto w-full flex-col gap-1">
            {timeControl != 'unlimited' ? (
              <GameClock player={orientation} reversed={true} />
            ) : null}
            <div className="flex-none">
              <PlayBoardController />
            </div>
            <div className="w-full overflow-x-auto">
              <div className="flex flex-row whitespace-nowrap py-2">
                <AnalysisMovesContainer
                  game={game}
                  termination={game.termination}
                />
              </div>
            </div>
            <div className="w-screen">{props.children}</div>
            <StatsDisplay stats={stats} hideSession={true} />
            <div className="px-2">
              <ExportGame
                game={game}
                gameTree={gameTree}
                whitePlayer={whitePlayer ?? 'Unknown'}
                blackPlayer={blackPlayer ?? 'Unknown'}
                event={`Play vs. ${maiaTitle}`}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )

  const layouts = isMobile ? mobileLayout : desktopLayout

  return (
    <>
      <Head>
        <title>Maia Chess - Play</title>
        <meta name="description" content="Turing survey" />
      </Head>
      <AnalysisGameControllerContext.Provider
        value={{
          currentNode,
          setCurrentNode,
          orientation,
          setOrientation,
          goToNode,
          goToNextNode,
          goToPreviousNode,
          goToRootNode,
          plyCount,
        }}
      >
        {layouts}
      </AnalysisGameControllerContext.Provider>
    </>
  )
}
