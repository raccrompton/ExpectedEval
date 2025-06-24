import Head from 'next/head'
import { NextPage } from 'next'
import { useState, useEffect, useContext, useCallback, useMemo } from 'react'
import { Chess, PieceSymbol } from 'chess.ts'
import { AnimatePresence } from 'framer-motion'
import type { Key } from 'chessground/types'

import { WindowSizeContext } from 'src/contexts'
import { OpeningSelection, AnalyzedGame } from 'src/types'
import openings from 'src/utils/openings/openings.json'
import {
  OpeningSelectionModal,
  OpeningDrillSidebar,
  OpeningDrillAnalysis,
  GameBoard,
  BoardController,
  PromotionOverlay,
} from 'src/components'
import {
  useOpeningDrillController,
  useMaiaEngine,
  useStockfishEngine,
  useAnalysisController,
} from 'src/hooks'
import {
  getCurrentPlayer,
  getAvailableMovesArray,
  requiresPromotion,
} from 'src/utils/train/utils'

const OpeningsPage: NextPage = () => {
  const [showSelectionModal, setShowSelectionModal] = useState(true)
  const [selections, setSelections] = useState<OpeningSelection[]>([])
  const [promotionFromTo, setPromotionFromTo] = useState<
    [string, string] | null
  >(null)

  // Pre-load engines when page loads - keep them at top level to prevent reloading
  const { status: maiaStatus } = useMaiaEngine()
  const { streamEvaluations } = useStockfishEngine()

  const controller = useOpeningDrillController(selections)
  const { isMobile } = useContext(WindowSizeContext)

  // Create analyzed game for analysis controller at top level
  const analyzedGame = useMemo((): AnalyzedGame | null => {
    if (!controller.gameTree || !controller.currentSelection) return null

    const mainLine = controller.gameTree.getMainLine()
    const moves = mainLine.slice(1).map((node) => {
      const move = node.move
      return {
        board: node.fen,
        lastMove: move
          ? ([move.slice(0, 2), move.slice(2, 4)] as [string, string])
          : undefined,
        san: node.san || '',
        uci: move || '',
      }
    })

    return {
      id: `opening-drill-${Date.now()}`,
      tree: controller.gameTree,
      blackPlayer: {
        name:
          controller.currentSelection.playerColor === 'black'
            ? 'You'
            : controller.currentSelection.maiaVersion.replace(
                'maia_kdd_',
                'Maia ',
              ),
        rating:
          controller.currentSelection.playerColor === 'black'
            ? undefined
            : parseInt(controller.currentSelection.maiaVersion.slice(-4)),
      },
      whitePlayer: {
        name:
          controller.currentSelection.playerColor === 'white'
            ? 'You'
            : controller.currentSelection.maiaVersion.replace(
                'maia_kdd_',
                'Maia ',
              ),
        rating:
          controller.currentSelection.playerColor === 'white'
            ? undefined
            : parseInt(controller.currentSelection.maiaVersion.slice(-4)),
      },
      moves,
      availableMoves: moves.map(() => ({})),
      gameType: 'play' as const,
      termination: {
        result: '*',
        winner: 'none' as const,
        condition: 'Normal',
      },
      maiaEvaluations: moves.map(() => ({})),
      stockfishEvaluations: moves.map(() => undefined),
      type: 'play' as const,
    }
  }, [controller.gameTree, controller.currentSelection])

  // Analysis controller at top level to prevent reloading
  const analysisController = useAnalysisController(
    analyzedGame || {
      id: 'empty',
      tree: controller.gameTree,
      blackPlayer: { name: 'Black' },
      whitePlayer: { name: 'White' },
      moves: [],
      availableMoves: [],
      gameType: 'play' as const,
      termination: {
        result: '*',
        winner: 'none' as const,
        condition: 'Normal',
      },
      maiaEvaluations: [],
      stockfishEvaluations: [],
      type: 'play' as const,
    },
    controller.currentSelection?.playerColor || 'white',
  )

  // Sync analysis controller with current node
  useEffect(() => {
    if (controller.currentNode && analysisController.setCurrentNode) {
      analysisController.setCurrentNode(controller.currentNode)
    }
  }, [controller.currentNode, analysisController])

  // Show selection modal when no selections are made
  useEffect(() => {
    if (selections.length === 0) {
      setShowSelectionModal(true)
    }
  }, [selections.length])

  const handleCompleteSelection = useCallback(
    (newSelections: OpeningSelection[]) => {
      setSelections(newSelections)
      setShowSelectionModal(false)
    },
    [],
  )

  const handleCloseModal = useCallback(() => {
    if (selections.length > 0) {
      setShowSelectionModal(false)
    }
  }, [selections.length])

  const currentPlayer = useMemo(() => {
    if (!controller.currentNode) return 'white'
    return getCurrentPlayer(controller.currentNode)
  }, [controller.currentNode])

  const onPlayerMakeMove = useCallback(
    (playedMove: [string, string] | null) => {
      if (!playedMove || !controller.isPlayerTurn) return

      const availableMoves = getAvailableMovesArray(controller.moves)

      if (requiresPromotion(playedMove, availableMoves)) {
        setPromotionFromTo(playedMove)
        return
      }

      const moveUci = playedMove[0] + playedMove[1]
      controller.makePlayerMove(moveUci)
    },
    [controller],
  )

  const onPlayerSelectPromotion = useCallback(
    (piece: string) => {
      if (!promotionFromTo) return

      setPromotionFromTo(null)
      const moveUci = promotionFromTo[0] + promotionFromTo[1] + piece
      controller.makePlayerMove(moveUci)
    },
    [promotionFromTo, controller],
  )

  const onSelectSquare = useCallback(() => {
    // No special handling needed for opening drills
  }, [])

  if (selections.length === 0 || showSelectionModal) {
    return (
      <>
        <Head>
          <title>Opening Drills – Maia Chess</title>
          <meta
            name="description"
            content="Practice chess openings against Maia"
          />
        </Head>
        <div className="flex h-screen w-screen items-center justify-center">
          <AnimatePresence>
            <OpeningSelectionModal
              openings={openings}
              initialSelections={selections}
              onComplete={handleCompleteSelection}
              onClose={handleCloseModal}
            />
          </AnimatePresence>
        </div>
      </>
    )
  }

  const desktopLayout = () => (
    <div className="flex h-full w-full flex-col items-center py-4 md:py-10">
      <div className="flex h-full w-[90%] flex-row gap-4">
        {/* Left Sidebar */}
        <OpeningDrillSidebar
          selections={selections}
          currentSelectionIndex={controller.currentSelectionIndex}
          onSwitchSelection={controller.switchToSelection}
          onResetCurrent={controller.resetCurrentGame}
          gameTree={controller.gameTree}
          currentNode={controller.currentNode}
          goToNode={controller.goToNode}
          goToNextNode={controller.goToNextNode}
          goToPreviousNode={controller.goToPreviousNode}
          goToRootNode={controller.goToRootNode}
          plyCount={controller.plyCount}
          orientation={controller.orientation}
          setOrientation={controller.setOrientation}
        />

        {/* Center - Game Board */}
        <div className="flex h-[85vh] w-[45vh] flex-col gap-2 2xl:w-[55vh]">
          <div className="relative flex aspect-square w-[45vh] 2xl:w-[55vh]">
            <GameBoard
              currentNode={controller.currentNode}
              orientation={controller.orientation}
              onPlayerMakeMove={onPlayerMakeMove}
              availableMoves={controller.moves}
              shapes={[]}
              onSelectSquare={onSelectSquare}
            />
            {promotionFromTo && (
              <PromotionOverlay
                player={currentPlayer}
                file={promotionFromTo[1].slice(0, 1)}
                onPlayerSelectPromotion={onPlayerSelectPromotion}
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowSelectionModal(true)}
              className="w-full rounded bg-background-2 py-2 text-sm text-secondary transition-colors hover:bg-background-3"
            >
              <span className="material-symbols-outlined mr-1 text-sm">
                settings
              </span>
              Change Selections
            </button>
          </div>
        </div>

        {/* Right Panel - Analysis */}
        <OpeningDrillAnalysis
          currentNode={controller.currentNode}
          gameTree={controller.gameTree}
          analysisEnabled={controller.analysisEnabled}
          onToggleAnalysis={() =>
            controller.setAnalysisEnabled(!controller.analysisEnabled)
          }
          playerColor={controller.currentSelection?.playerColor || 'white'}
          maiaVersion={
            controller.currentSelection?.maiaVersion || 'maia_kdd_1500'
          }
          analysisController={analysisController}
        />
      </div>
    </div>
  )

  const mobileLayout = () => (
    <div className="flex h-full flex-1 flex-col justify-center gap-1">
      <div className="mt-2 flex h-full flex-col items-start justify-start gap-1">
        {/* Mobile board and controls - simplified layout */}
        <div className="relative flex aspect-square h-[100vw] w-screen">
          <GameBoard
            currentNode={controller.currentNode}
            orientation={controller.orientation}
            onPlayerMakeMove={onPlayerMakeMove}
            availableMoves={controller.moves}
            shapes={[]}
            onSelectSquare={onSelectSquare}
          />
          {promotionFromTo && (
            <PromotionOverlay
              player={currentPlayer}
              file={promotionFromTo[1].slice(0, 1)}
              onPlayerSelectPromotion={onPlayerSelectPromotion}
            />
          )}
        </div>

        <div className="flex h-auto w-full flex-col gap-1">
          <BoardController
            orientation={controller.orientation}
            setOrientation={controller.setOrientation}
            currentNode={controller.currentNode}
            plyCount={controller.plyCount}
            goToNode={controller.goToNode}
            goToNextNode={controller.goToNextNode}
            goToPreviousNode={controller.goToPreviousNode}
            goToRootNode={controller.goToRootNode}
            gameTree={controller.gameTree}
          />

          {/* Current selection info */}
          <div className="rounded bg-background-1 p-3">
            <h3 className="text-sm font-semibold">
              {controller.currentSelection?.opening.name}
            </h3>
            {controller.currentSelection?.variation && (
              <p className="text-xs text-secondary">
                {controller.currentSelection.variation.name}
              </p>
            )}
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-secondary">
                Playing as {controller.currentSelection?.playerColor} vs{' '}
                {controller.currentSelection?.maiaVersion.replace(
                  'maia_kdd_',
                  'Maia ',
                )}
              </span>
              <button
                onClick={() => setShowSelectionModal(true)}
                className="text-xs text-human-4 hover:text-human-3"
              >
                Change
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Head>
        <title>Opening Drills – Maia Chess</title>
        <meta
          name="description"
          content="Practice chess openings against Maia"
        />
      </Head>
      {isMobile ? mobileLayout() : desktopLayout()}
    </>
  )
}

export default OpeningsPage
