import { NextPage } from 'next/types'
import { PieceSymbol } from 'chess.ts'
import { useRouter } from 'next/router'
import type { Key } from 'chessground/types'
import { backOff } from 'exponential-backoff'
import type { DrawShape } from 'chessground/draw'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'

import {
  startGame,
  getGameMove,
  submitGameMove,
  getPlayPlayerStats,
} from 'src/api'
import {
  Loading,
  GameplayInterface,
  HandBrainPlayControls,
} from 'src/components'
import { ModalContext } from 'src/contexts'
import { useStats } from 'src/hooks/useStats'
import { Color, PlayGameConfig, TimeControl } from 'src/types'
import { usePlayController } from 'src/hooks/usePlayController'
import { PlayControllerContext } from 'src/contexts/PlayControllerContext/PlayControllerContext'

const brainStatsLoader = async () => {
  const stats = await getPlayPlayerStats()
  return {
    gamesPlayed: stats.brainGamesPlayed,
    gamesWon: stats.brainWon,
    rating: stats.brainElo,
  }
}

const handStatsLoader = async () => {
  const stats = await getPlayPlayerStats()
  return {
    gamesPlayed: stats.handGamesPlayed,
    gamesWon: stats.handWon,
    rating: stats.handElo,
  }
}

const useHandBrainPlayController = (
  id: string,
  playGameConfig: PlayGameConfig,
) => {
  const controller = usePlayController(id, playGameConfig)
  const isBrain = playGameConfig.isBrain

  const [selectedPiece, setSelectedPiece] = useState<PieceSymbol | undefined>(
    undefined,
  )

  const [brainMoves, setBrainMoves] = useState<string[]>([])

  const [stats, incrementStats] = useStats(
    isBrain ? brainStatsLoader : handStatsLoader,
  )

  const movablePieceTypes = useMemo(() => {
    return new Set(controller.availableMoves.map((m) => m.piece))
  }, [controller.availableMoves])

  const availableMoves = useMemo(() => {
    if (isBrain) {
      return [] // Brain may not make moves directly
    } else if (selectedPiece) {
      return controller.availableMoves.filter((m) => m.piece == selectedPiece)
    } else {
      return []
    }
  }, [isBrain, selectedPiece, controller.availableMoves])

  useEffect(() => {
    if (
      controller.game.id &&
      !isBrain &&
      !selectedPiece &&
      controller.playerActive
    ) {
      // Maia is brain
      let canceled = false

      const maiaChoosePiece = async () => {
        const maiaMoves = await backOff(
          () =>
            getGameMove(
              controller.moves,
              playGameConfig.maiaPartnerVersion,
              playGameConfig.startFen,
            ),
          {
            jitter: 'full',
          },
        )
        const nextMove = maiaMoves['top_move']

        const pieceType = controller.pieces[nextMove.substring(0, 2)].type

        if (!canceled) {
          setSelectedPiece(pieceType)
          setBrainMoves([...brainMoves, pieceType])
        }
      }

      maiaChoosePiece()
      return () => {
        canceled = true
      }
    }
  }, [
    brainMoves,
    controller.game.id,
    controller.moves,
    controller.pieces,
    controller.playerActive,
    isBrain,
    playGameConfig.maiaPartnerVersion,
    playGameConfig.startFen,
    selectedPiece,
  ])

  const makeMove = useCallback(
    async (moveUci: string) => {
      const newMoves = [...controller.moves, moveUci]

      controller.updateClock()
      controller.setMoves(newMoves)
      setSelectedPiece(undefined)
    },
    [controller],
  )

  useEffect(() => {
    let canceled = false

    const makeMaiaMove = async () => {
      const maiaClock =
        (controller.player == 'white'
          ? controller.blackClock
          : controller.whiteClock) / 1000
      const initialClock = controller.timeControl.includes('+')
        ? parseInt(controller.timeControl.split('+')[0]) * 60
        : 0

      const maiaMoves = await backOff(
        () =>
          getGameMove(
            controller.moves,
            playGameConfig.maiaVersion,
            playGameConfig.startFen,
            null,
            playGameConfig.simulateMaiaTime ? initialClock : 0,
            playGameConfig.simulateMaiaTime ? maiaClock : 0,
          ),
        {
          jitter: 'full',
        },
      )
      const nextMove = maiaMoves['top_move']
      const moveDelay = maiaMoves['move_delay']

      if (canceled) {
        return
      }

      setTimeout(
        () => {
          const moveTime = controller.updateClock()
          controller.setMoves([...controller.moves, nextMove])
          controller.setMoveTimes([...controller.moveTimes, moveTime])
        },
        playGameConfig.simulateMaiaTime ? moveDelay * 1000 : 0,
      )
    }

    if (
      controller.game.id &&
      !controller.playerActive &&
      !controller.game.termination
    ) {
      makeMaiaMove()
      return () => {
        canceled = true
      }
    }
  }, [
    controller.playerActive,
    controller.moves,
    controller,
    playGameConfig.maiaVersion,
    playGameConfig.startFen,
  ])

  const selectPiece = useCallback(
    async (piece: PieceSymbol) => {
      if (movablePieceTypes.has(piece)) {
        setSelectedPiece(piece)
        setBrainMoves([...brainMoves, piece])

        const maiaMoves = await backOff(
          () =>
            getGameMove(
              controller.moves,
              playGameConfig.maiaPartnerVersion,
              playGameConfig.startFen,
              piece,
            ),
          {
            jitter: 'full',
          },
        )
        const nextMove = maiaMoves['top_move']
        makeMove(nextMove)
      }
    },
    [
      controller.moves,
      makeMove,
      movablePieceTypes,
      playGameConfig.maiaPartnerVersion,
      playGameConfig.startFen,
      brainMoves,
    ],
  )

  const boardShapes: DrawShape[] = useMemo(() => {
    if (!isBrain && selectedPiece) {
      return Object.entries(controller.pieces)
        .filter(([, piece]) => piece.color == controller.player.substring(0, 1))
        .filter(([, piece]) => selectedPiece == piece.type)
        .map(([square]) => {
          return {
            orig: square as Key,
            brush: 'green',
          }
        })
    } else {
      return []
    }
  }, [isBrain, selectedPiece, controller.pieces, controller.player])

  const reset = () => {
    setSelectedPiece(undefined)
    setBrainMoves([])
    controller.reset()
  }

  // Logging
  useEffect(() => {
    const gameOverState = controller.game.termination?.type || 'not_over'

    if (controller.moves.length == 0 && gameOverState == 'not_over') {
      return
    }

    const winner = controller.game.termination?.winner

    const submitFn = async () => {
      await backOff(
        () =>
          submitGameMove(
            controller.game.id,
            controller.moves,
            controller.moveTimes,
            gameOverState,
            playGameConfig.isBrain ? 'brain' : 'hand',
            playGameConfig.startFen || undefined,
            winner,
            brainMoves,
          ),
        {
          jitter: 'full',
        },
      )
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
    playGameConfig.isBrain,
    brainMoves,
    playGameConfig.player,
    incrementStats,
  ])

  return {
    ...controller,
    availableMoves,
    makeMove,
    boardShapes,
    selectedPiece,
    movablePieceTypes,
    selectPiece,
    reset,
    stats,
  }
}

interface Props {
  id: string
  playGameConfig: PlayGameConfig
  playAgain: () => void
}

const PlayHandBrain: React.FC<Props> = ({
  id,
  playGameConfig,
  playAgain,
}: Props) => {
  const controller = useHandBrainPlayController(id, playGameConfig)

  return (
    <PlayControllerContext.Provider value={controller}>
      <GameplayInterface boardShapes={controller.boardShapes}>
        <HandBrainPlayControls
          playerActive={controller.playerActive}
          gameOver={!!controller.game.termination}
          isBrain={playGameConfig.isBrain}
          color={playGameConfig.player}
          movablePieceTypes={Array.from(controller.movablePieceTypes)}
          selectedPiece={controller.selectedPiece}
          selectPiece={controller.selectPiece}
          resign={() => controller.setResigned(true)}
          playAgain={playAgain}
        />
      </GameplayInterface>
    </PlayControllerContext.Provider>
  )
}

const PlayHandBrainPage: NextPage = () => {
  const { openedModals, setInstructionsModalProps: setInstructionsModalProps } =
    useContext(ModalContext)

  useEffect(() => {
    if (!openedModals.handAndBrain) {
      setInstructionsModalProps({ instructionsType: 'handAndBrain' })
    }
    return () => setInstructionsModalProps(undefined)
  }, [setInstructionsModalProps, openedModals.handAndBrain])

  const router = useRouter()

  const { setPlaySetupModalProps } = useContext(ModalContext)

  const {
    id,
    player,
    maiaVersion,
    maiaPartnerVersion,
    timeControl,
    isBrain,
    sampleMoves,
    simulateMaiaTime,
    startFen,
  } = router.query

  const playGameConfig: PlayGameConfig = useMemo(
    () => ({
      playType: 'handAndBrain',
      player: (player || 'white') as Color,
      maiaPartnerVersion: (maiaPartnerVersion || 'maia_kdd_1100') as string,
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
      maiaPartnerVersion,
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
          playGameConfig.isBrain ? 'brain' : 'hand',
          playGameConfig.sampleMoves,
          playGameConfig.timeControl,
          playGameConfig.maiaPartnerVersion,
        )
      } catch (e) {
        router.push('/401')
        return
      }
      const newGameId = response.gameId

      if (!canceled) {
        router.replace(
          {
            pathname: '/play/hb',
            query: {
              id: newGameId,
              ...playGameConfig,
            },
          },
          {
            pathname: '/play/hb',
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
    <PlayHandBrain
      id={id as string}
      playGameConfig={playGameConfig}
      playAgain={() => setPlaySetupModalProps({ ...playGameConfig })}
    />
  ) : (
    <Loading />
  )
}

export default PlayHandBrainPage
