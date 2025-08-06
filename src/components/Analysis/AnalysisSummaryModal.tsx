import React, { useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AnalyzedGame } from 'src/types'
import { extractPlayerMistakes } from 'src/lib/analysis'

interface Props {
  isOpen: boolean
  onClose: () => void
  game: AnalyzedGame
}

interface GameSummary {
  totalMoves: number
  whiteMistakes: {
    total: number
    blunders: number
    inaccuracies: number
  }
  blackMistakes: {
    total: number
    blunders: number
    inaccuracies: number
  }
  averageDepth: number
  positionsAnalyzed: number
}

export const AnalysisSummaryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  game,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const summary = useMemo((): GameSummary => {
    const mainLine = game.tree.getMainLine()
    const whiteMistakes = extractPlayerMistakes(game.tree, 'white')
    const blackMistakes = extractPlayerMistakes(game.tree, 'black')

    // Calculate analysis depth statistics
    let totalDepth = 0
    let positionsAnalyzed = 0

    mainLine.forEach((node) => {
      if (node.analysis.stockfish && node.analysis.stockfish.depth > 0) {
        totalDepth += node.analysis.stockfish.depth
        positionsAnalyzed++
      }
    })

    const averageDepth =
      positionsAnalyzed > 0 ? Math.round(totalDepth / positionsAnalyzed) : 0

    return {
      totalMoves: Math.ceil((mainLine.length - 1) / 2), // Convert plies to moves
      whiteMistakes: {
        total: whiteMistakes.length,
        blunders: whiteMistakes.filter((m) => m.type === 'blunder').length,
        inaccuracies: whiteMistakes.filter((m) => m.type === 'inaccuracy')
          .length,
      },
      blackMistakes: {
        total: blackMistakes.length,
        blunders: blackMistakes.filter((m) => m.type === 'blunder').length,
        inaccuracies: blackMistakes.filter((m) => m.type === 'inaccuracy')
          .length,
      },
      averageDepth,
      positionsAnalyzed,
    }
  }, [game.tree])

  if (!isOpen) return null

  const MistakeSection = ({
    title,
    color,
    mistakes,
    playerName,
  }: {
    title: string
    color: string
    mistakes: { total: number; blunders: number; inaccuracies: number }
    playerName: string
  }) => (
    <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-background-2/40 p-4">
      <div className="flex items-center gap-2">
        <div
          className={`h-3 w-3 rounded-full ${color === 'white' ? 'bg-white' : 'border border-white bg-black'}`}
        />
        <h3 className="font-semibold">{title}</h3>
        <span className="text-sm text-secondary">({playerName})</span>
      </div>

      {mistakes.total === 0 ? (
        <div className="flex items-center gap-2 text-sm text-green-400">
          <span className="material-symbols-outlined !text-sm">
            check_circle
          </span>
          <span>No significant mistakes detected</span>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="flex flex-col items-center gap-1 rounded bg-background-3/50 p-2">
            <span className="text-lg font-bold text-red-400">
              {mistakes.blunders}
            </span>
            <span className="text-xs text-secondary">Blunders</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded bg-background-3/50 p-2">
            <span className="text-lg font-bold text-orange-400">
              {mistakes.inaccuracies}
            </span>
            <span className="text-xs text-secondary">Inaccuracies</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded bg-background-3/50 p-2">
            <span className="text-lg font-bold text-primary">
              {mistakes.total}
            </span>
            <span className="text-xs text-secondary">Total</span>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <motion.div
      className="absolute left-0 top-0 z-20 flex h-screen w-screen flex-col items-center justify-center bg-black/70 px-4 backdrop-blur-sm md:px-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        className="flex w-full flex-col gap-5 rounded-md border border-white/10 bg-background-1 p-5 md:w-[min(600px,50vw)] md:p-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-2xl text-human-3">
            analytics
          </span>
          <h2 className="text-xl font-semibold">Analysis Summary</h2>
        </div>

        <div className="flex flex-col gap-4">
          {/* Game Overview */}
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-primary/90">Game Overview</h3>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div className="flex flex-col items-center gap-1 rounded bg-background-2/60 p-3">
                <span className="text-lg font-bold text-human-3">
                  {summary.totalMoves}
                </span>
                <span className="text-xs text-secondary">Total Moves</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded bg-background-2/60 p-3">
                <span className="text-lg font-bold text-human-3">
                  {summary.positionsAnalyzed}
                </span>
                <span className="text-xs text-secondary">Positions</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded bg-background-2/60 p-3">
                <span className="text-lg font-bold text-human-3">
                  d{summary.averageDepth}
                </span>
                <span className="text-xs text-secondary">Avg Depth</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded bg-background-2/60 p-3">
                <span className="text-lg font-bold text-green-400">100%</span>
                <span className="text-xs text-secondary">Complete</span>
              </div>
            </div>
          </div>

          {/* Player Performance */}
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-primary/90">
              Player Performance
            </h3>

            <MistakeSection
              title="White"
              color="white"
              mistakes={summary.whiteMistakes}
              playerName={game.whitePlayer.name}
            />

            <MistakeSection
              title="Black"
              color="black"
              mistakes={summary.blackMistakes}
              playerName={game.blackPlayer.name}
            />
          </div>

          {/* Analysis Tips */}
          <div className="flex items-start gap-2 rounded bg-human-4/10 p-3">
            <span className="material-symbols-outlined !text-base text-human-3">
              lightbulb
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-human-3">Next Steps</p>
              <p className="text-xs text-primary/80">
                Navigate through the game to review specific positions. Use the
                &quot;Learn from Mistakes&quot; feature to practice improving
                the identified errors.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex h-9 items-center gap-1 rounded bg-human-4 px-4 text-sm font-medium text-white transition duration-200 hover:bg-human-4/90"
          >
            <span className="material-symbols-outlined text-sm">check</span>
            Got it
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
