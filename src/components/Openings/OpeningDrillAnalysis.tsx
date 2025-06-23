import React from 'react'
import { Highlight, MoveMap, BlunderMeter } from '../Analysis'
import { useAnalysisController } from 'src/hooks'
import { AnalyzedGame } from 'src/types'
import { GameTree } from 'src/types/base/tree'
import { Chess } from 'chess.ts'

// Create a mock analyzed game for when no real game is available
const createMockAnalyzedGame = (): AnalyzedGame => ({
  id: 'mock',
  blackPlayer: { name: 'Player', rating: undefined },
  whitePlayer: { name: 'Player', rating: undefined },
  moves: [],
  availableMoves: [],
  gameType: 'play',
  termination: {
    result: '*',
    winner: 'none',
    condition: 'Normal',
  },
  maiaEvaluations: [],
  stockfishEvaluations: [],
  tree: new GameTree(new Chess().fen()),
  type: 'play',
})

interface Props {
  analyzedGame: AnalyzedGame | null
  analysisEnabled: boolean
  onToggleAnalysis: () => void
}

export const OpeningDrillAnalysis: React.FC<Props> = ({
  analyzedGame,
  analysisEnabled,
  onToggleAnalysis,
}) => {
  // Always call the hook but use mock data when disabled
  const analysisController = useAnalysisController(
    analyzedGame || createMockAnalyzedGame(),
    'white',
  )
  const mockHover = () => {
    // No-op for disabled analysis
  }

  const mockMakeMove = () => {
    // No-op for disabled analysis
  }

  const mockSetHoverArrow = () => {
    // No-op for disabled analysis
  }

  return (
    <div className="flex h-[calc(55vh+4.5rem)] w-full flex-col gap-2">
      {/* Analysis Toggle */}
      <div className="flex items-center justify-between rounded bg-background-1 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xl">analytics</span>
          <h3 className="font-semibold">Analysis</h3>
        </div>
        <button
          onClick={onToggleAnalysis}
          className={`flex items-center gap-2 rounded px-3 py-1 text-sm transition-colors ${
            analysisEnabled
              ? 'bg-human-4 text-white hover:bg-human-4/80'
              : 'bg-background-2 text-secondary hover:bg-background-3'
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {analysisEnabled ? 'visibility' : 'visibility_off'}
          </span>
          {analysisEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      {/* Top Row - Highlight Component */}
      <div className="relative">
        <div className="flex h-[calc((55vh+4.5rem)/2)]">
          <Highlight
            hover={mockHover}
            makeMove={mockMakeMove}
            currentMaiaModel="maia_kdd_1500"
            recommendations={analysisController.moveRecommendations}
            moveEvaluation={
              analysisController.moveEvaluation || {
                maia: undefined,
                stockfish: undefined,
              }
            }
            movesByRating={analysisController.movesByRating}
            colorSanMapping={analysisController.colorSanMapping}
            boardDescription={
              analysisEnabled
                ? 'This position offers multiple strategic options. Consider central control and piece development.'
                : 'Analysis is disabled. Enable analysis to see detailed move evaluations and recommendations.'
            }
          />
        </div>
        {!analysisEnabled && (
          <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded bg-background-1/80 backdrop-blur-sm">
            <div className="rounded bg-background-2/90 p-4 text-center shadow-lg">
              <span className="material-symbols-outlined mb-2 text-3xl text-human-3">
                lock
              </span>
              <p className="font-medium text-primary">Analysis Disabled</p>
              <p className="text-sm text-secondary">
                Enable analysis to see move evaluations
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Row - Move Map and Blunder Meter */}
      <div className="relative">
        <div className="flex h-[calc((55vh+4.5rem)/2)] flex-row gap-2">
          <div className="flex h-full w-full flex-col">
            <MoveMap
              moveMap={analysisController.moveMap}
              colorSanMapping={analysisController.colorSanMapping}
              setHoverArrow={mockSetHoverArrow}
            />
          </div>
          <BlunderMeter
            hover={mockHover}
            makeMove={mockMakeMove}
            data={analysisController.blunderMeter}
            colorSanMapping={analysisController.colorSanMapping}
          />
        </div>
        {!analysisEnabled && (
          <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded bg-background-1/80 backdrop-blur-sm">
            <div className="rounded bg-background-2/90 p-4 text-center shadow-lg">
              <span className="material-symbols-outlined mb-2 text-3xl text-human-3">
                lock
              </span>
              <p className="font-medium text-primary">Analysis Disabled</p>
              <p className="text-sm text-secondary">
                Enable analysis to see position evaluation
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
