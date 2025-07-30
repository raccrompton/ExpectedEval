import React, { useEffect, useState, useMemo, useRef } from 'react'
import { NextPage } from 'next'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { AnimatePresence } from 'framer-motion'

import { DelayedLoading } from 'src/components'
import { AuthenticatedWrapper } from 'src/components/Common/AuthenticatedWrapper'
import { DownloadModelModal } from 'src/components/Common/DownloadModelModal'
import { useLichessStreamController } from 'src/hooks/useLichessStreamController'
import { useAnalysisController } from 'src/hooks'
import { TreeControllerContext } from 'src/contexts'
import { StreamAnalysis } from 'src/components/Analysis/StreamAnalysis'
import { AnalyzedGame } from 'src/types'
import { GameTree } from 'src/types/base/tree'

const StreamAnalysisPage: NextPage = () => {
  const router = useRouter()
  const { gameId } = router.query as { gameId: string }

  const streamController = useLichessStreamController()
  const [isReady, setIsReady] = useState(false)

  // Start streaming when gameId is available
  useEffect(() => {
    if (gameId && typeof gameId === 'string') {
      console.log('Starting stream for game:', gameId)
      streamController.startStream(gameId)
      setIsReady(true)
    }
  }, [gameId]) // Remove streamController dependency to prevent re-renders

  // Cleanup stream on unmount - use ref to avoid dependency on streamController
  const streamControllerRef = useRef(streamController)
  streamControllerRef.current = streamController

  useEffect(() => {
    return () => {
      streamControllerRef.current.stopStream()
    }
  }, [])

  // Get analysis controller for the current game (if available)
  // Create a dummy game for the controller when no game is loaded yet
  const dummyGame: AnalyzedGame = useMemo(() => {
    const startingFen =
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const dummyTree = new GameTree(startingFen)

    return {
      id: '',
      blackPlayer: { name: 'Black' },
      whitePlayer: { name: 'White' },
      moves: [
        {
          board: startingFen,
          lastMove: undefined,
          san: undefined,
          check: false,
          maia_values: {},
        },
      ],
      availableMoves: [{}],
      gameType: 'blitz',
      termination: { result: '*', winner: undefined },
      maiaEvaluations: [{}],
      stockfishEvaluations: [undefined],
      tree: dummyTree,
      type: 'stream' as const,
    }
  }, [])

  // Use the current streaming game or dummy game for analysis controller
  const currentGame = streamController.game || dummyGame
  const analysisController = useAnalysisController(currentGame)

  // Set current node to follow live moves
  useEffect(() => {
    if (streamController.game?.tree && analysisController) {
      try {
        // For live streaming, we want to follow the latest move
        // Find the last node in the main line
        let currentNode = streamController.game.tree.getRoot()
        while (currentNode.mainChild) {
          currentNode = currentNode.mainChild
        }

        if (currentNode) {
          analysisController.setCurrentNode(currentNode)
        }
      } catch (error) {
        console.error('Error setting current node:', error)
      }
    }
  }, [streamController.game, analysisController])

  // if (!isReady || !gameId) {
  //   return (
  //     <DelayedLoading isLoading={true}>
  //       <div></div>
  //     </DelayedLoading>
  //   )
  // }

  // Show loading only while actively connecting AND no data has been received yet
  if (
    streamController.streamState.isConnecting &&
    !streamController.streamState.gameStarted
  ) {
    return (
      <>
        <Head>
          <title>Connecting to Live Game – Maia Chess</title>
          <meta
            name="description"
            content="Connecting to live chess game stream for real-time analysis with Maia AI."
          />
        </Head>
        <DelayedLoading isLoading={true}>
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="text-center">
              <h2 className="mb-2 text-xl font-semibold">
                {streamController.streamState.error
                  ? 'Connection Error'
                  : 'Connecting to Live Game'}
              </h2>
              {streamController.streamState.error ? (
                <div className="mb-4 text-red-400">
                  <p>{streamController.streamState.error}</p>
                  <button
                    onClick={streamController.reconnect}
                    className="mt-2 rounded bg-human-4 px-4 py-2 text-white transition hover:bg-human-4/80"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <p className="text-secondary">
                  Establishing connection to Lichess game {gameId}...
                </p>
              )}
            </div>
          </div>
        </DelayedLoading>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>
          Live Analysis: {streamController.game?.whitePlayer.name || 'Unknown'}{' '}
          vs {streamController.game?.blackPlayer.name || 'Unknown'} – Maia Chess
        </title>
        <meta
          name="description"
          content={`Watch live analysis of ${streamController.game?.whitePlayer.name || 'Unknown'} vs ${streamController.game?.blackPlayer.name || 'Unknown'} with real-time Maia AI insights.`}
        />
      </Head>

      <AnimatePresence>
        {analysisController &&
        (analysisController.maia.status === 'no-cache' ||
          analysisController.maia.status === 'downloading') ? (
          <DownloadModelModal
            progress={analysisController.maia.progress}
            download={analysisController.maia.downloadModel}
          />
        ) : null}
      </AnimatePresence>

      <TreeControllerContext.Provider value={analysisController}>
        {analysisController && (
          <StreamAnalysis
            game={streamController.game || dummyGame}
            streamState={streamController.streamState}
            clockState={streamController.clockState}
            onReconnect={streamController.reconnect}
            onStopStream={streamController.stopStream}
            analysisController={analysisController}
          />
        )}
      </TreeControllerContext.Provider>
    </>
  )
}

export default function AuthenticatedStreamAnalysisPage() {
  return (
    <AuthenticatedWrapper>
      <StreamAnalysisPage />
    </AuthenticatedWrapper>
  )
}
