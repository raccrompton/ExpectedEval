import { NextPage } from 'next/types'
import { useRouter } from 'next/router'
import { useContext, useEffect, useMemo } from 'react'

import {
  startGame,
  getGameMove,
  submitGameMove,
  getPlayPlayerStats,
} from 'src/api'
import { Loading } from 'src/components'
import { ModalContext } from 'src/contexts'
import { useStats } from 'src/hooks/useStats'
import { PlayControls } from 'src/components/PlayControls'
import { Color, TimeControl, PlayGameConfig } from 'src/types'
import { usePlayController } from 'src/hooks/usePlayController'
import { GameplayInterface } from 'src/components/GameplayInterface'
import { PlayControllerContext } from 'src/contexts/PlayControllerContext/PlayControllerContext'

const playStatsLoader = async () => {
  const stats = await getPlayPlayerStats()
  return {
    gamesPlayed: stats.playGamesPlayed,
    gamesWon: stats.playWon,
    rating: stats.playElo,
  }
}

const useVsMaiaPlayController = (
  id: string,
  playGameConfig: PlayGameConfig,
) => {
  const controller = usePlayController(id, playGameConfig)

  const [stats, incrementStats] = useStats(playStatsLoader)

  const makeMove = async (moveUci: string) => {
    const newMoves = [...controller.moves, moveUci]

    const moveTime = controller.updateClock()
    controller.setMoves(newMoves)
    controller.setMoveTimes([...controller.moveTimes, moveTime])
  }

  useEffect(() => {
    let canceled = false

    const makeMaiaMove = async () => {
      if (
        controller.game.id &&
        !controller.playerActive &&
        !controller.game.termination
      ) {
        const maiaClock =
          (controller.player == 'white'
            ? controller.blackClock
            : controller.whiteClock) / 1000
        const initialClock = controller.timeControl.includes('+')
          ? parseInt(controller.timeControl.split('+')[0]) * 60
          : 0

        const maiaMoves = await getGameMove(
          controller.moves,
          playGameConfig.maiaVersion,
          playGameConfig.startFen,
          null,
          playGameConfig.simulateMaiaTime ? initialClock : 0,
          playGameConfig.simulateMaiaTime ? maiaClock : 0,
        )
        const nextMove = maiaMoves['top_move']
        const moveDelay = maiaMoves['move_delay']

        if (canceled) {
          return
        }

        if (playGameConfig.simulateMaiaTime) {
          setTimeout(() => {
            const moveTime = controller.updateClock()
            controller.setMoves([...controller.moves, nextMove])
            controller.setMoveTimes([...controller.moveTimes, moveTime])
          }, moveDelay * 1000)
        } else {
          const moveTime = controller.updateClock()
          controller.setMoves([...controller.moves, nextMove])
          controller.setMoveTimes([...controller.moveTimes, moveTime])
        }
      }
    }

    makeMaiaMove()

    return () => {
      canceled = true
    }
  }, [controller, playGameConfig])

  // Logging
  useEffect(() => {
    const gameOverState = controller.game.termination?.type || 'not_over'

    if (controller.moves.length == 0 && gameOverState == 'not_over') {
      return
    }

    const winner = controller.game.termination?.winner

    const submitFn = async () => {
      await submitGameMove(
        controller.game.id,
        controller.moves,
        controller.moveTimes,
        gameOverState,
        'play',
        playGameConfig.startFen || undefined,
        winner,
      )

      // Only update stats after final move submitted
      if (controller.game.termination) {
        const winner = controller.game.termination?.winner
        incrementStats(1, winner == playGameConfig.player ? 1 : 0)
      }
    }
    submitFn()
  }, [
    controller.game.id,
    controller.moves,
    controller.game.termination,
    controller.moveTimes,
    playGameConfig.startFen,
    incrementStats,
    playGameConfig.player,
  ])

  return {
    ...controller,
    makeMove,
    stats,
  }
}
interface Props {
  id: string
  playGameConfig: PlayGameConfig
  playAgain: () => void
}

const PlayMaia: React.FC<Props> = ({
  id,
  playGameConfig,
  playAgain,
}: Props) => {
  const controller = useVsMaiaPlayController(id, playGameConfig)

  return (
    <PlayControllerContext.Provider value={controller}>
      <GameplayInterface>
        <PlayControls
          playerActive={controller.playerActive}
          gameOver={!!controller.game.termination}
          resign={
            controller.playerActive
              ? () => {
                  controller.updateClock()
                  controller.setResigned(true)
                }
              : undefined
          }
          playAgain={playAgain}
        />
      </GameplayInterface>
    </PlayControllerContext.Provider>
  )
}

const PlayMaiaPage: NextPage = () => {
  const { openedModals, setInstructionsModalProps: setInstructionsModalProps } =
    useContext(ModalContext)

  useEffect(() => {
    if (!openedModals.againstMaia) {
      setInstructionsModalProps({ instructionsType: 'againstMaia' })
    }
    return () => setInstructionsModalProps(undefined)
  }, [setInstructionsModalProps, openedModals.againstMaia])

  const router = useRouter()

  const { setPlaySetupModalProps } = useContext(ModalContext)

  const {
    id,
    player,
    maiaVersion,
    timeControl,
    isBrain,
    sampleMoves,
    simulateMaiaTime,
    startFen,
  } = router.query

  const playGameConfig: PlayGameConfig = useMemo(
    () => ({
      playType: 'againstMaia',
      player: (player || 'white') as Color,
      maiaVersion: (maiaVersion || 'maia_kdd_1100') as string,
      timeControl: (timeControl || 'unlimited') as TimeControl,
      isBrain: isBrain == 'true',
      sampleMoves: sampleMoves == 'true',
      simulateMaiaTime: simulateMaiaTime == 'true',
      startFen: typeof startFen == 'string' ? startFen : undefined,
    }),
    [
      startFen,
      isBrain,
      maiaVersion,
      player,
      sampleMoves,
      simulateMaiaTime,
      timeControl,
    ],
  )

  useEffect(() => {
    let canceled = false

    async function fetchGameId() {
      let response
      try {
        response = await startGame(
          playGameConfig.player,
          playGameConfig.maiaVersion,
          'play',
          playGameConfig.sampleMoves,
          playGameConfig.timeControl,
          undefined,
        )
      } catch (e) {
        router.push('/401')
        return
      }
      const newGameId = response.gameId

      if (!canceled) {
        router.replace(
          {
            pathname: '/play/maia',
            query: {
              id: newGameId,
              ...playGameConfig,
            },
          },
          {
            pathname: '/play/maia',
            query: {
              // We don't show the game ID in the address bar
              // so that if the page is manually refreshed
              // the old game ID is not persisted
              ...playGameConfig,
            },
          },
        )
      }
    }

    if (!id) {
      fetchGameId()

      return () => {
        canceled = true
      }
    }
  }, [id, playGameConfig, router])

  return router.isReady && id ? (
    <PlayMaia
      id={id as string}
      playGameConfig={playGameConfig}
      playAgain={() => setPlaySetupModalProps({ ...playGameConfig })}
    />
  ) : (
    <Loading />
  )
}

export default PlayMaiaPage
