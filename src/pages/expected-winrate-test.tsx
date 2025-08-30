/**
 * Test Page for Expected Winrate Controller Hook
 *
 * This page provides a simple interface to manually test the Expected Winrate
 * controller hook with real engine integration. Access via /expected-winrate-test
 *
 * REMOVE THIS FILE BEFORE PRODUCTION DEPLOYMENT
 */

import { useState, useMemo } from 'react'
import { GameTree, GameNode } from 'src/types'
import { useExpectedWinrateController } from 'src/hooks/useExpectedWinrateController'
import { DEFAULT_EXPECTED_WINRATE_PARAMS } from 'src/types/expectedWinrate'
import { StockfishEngineContextProvider } from 'src/providers/StockfishEngineContextProvider'
import { MaiaEngineContextProvider } from 'src/providers/MaiaEngineContextProvider'

const TEST_POSITIONS = {
  starting: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  scandinavian: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  middlegame:
    'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4',
  tactical: '2rr3k/pp3pp1/1nnqbN1p/3ppN2/2nPP3/2P1B3/PPQ2PPP/R4RK1 w - - 0 1',
}

function ExpectedWinrateTestComponent() {
  const [selectedPosition, setSelectedPosition] = useState<string>(
    TEST_POSITIONS.starting,
  )
  const [customParams, setCustomParams] = useState(
    DEFAULT_EXPECTED_WINRATE_PARAMS,
  )

  // Create a mock GameNode for the selected position
  const currentNode = useMemo(() => {
    return {
      fen: selectedPosition,
      parent: null,
      children: [],
      san: '',
      analysis: {},
    } as unknown as GameNode
  }, [selectedPosition])

  // Initialize the Expected Winrate controller
  const inProgressAnalyses = useMemo(() => new Set<string>(), [])
  const controller = useExpectedWinrateController(
    currentNode,
    inProgressAnalyses,
    {
      enableAutoSave: false, // Disable for testing
    },
  )

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold">
          Expected Winrate Controller Test
        </h1>

        {/* Engine Status */}
        <div className="mb-6 rounded-lg bg-gray-800 p-4">
          <h2 className="mb-2 text-xl font-semibold">Engine Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Engines Ready:</span>
              <span
                className={`ml-2 rounded px-2 py-1 text-sm ${
                  controller.isEnginesReady ? 'bg-green-600' : 'bg-red-600'
                }`}
              >
                {controller.isEnginesReady ? 'Ready' : 'Not Ready'}
              </span>
            </div>
            <div>
              <span className="font-medium">Calculation In Progress:</span>
              <span
                className={`ml-2 rounded px-2 py-1 text-sm ${
                  controller.isCalculationInProgress
                    ? 'bg-yellow-600'
                    : 'bg-gray-600'
                }`}
              >
                {controller.isCalculationInProgress ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Position Selection */}
        <div className="mb-6 rounded-lg bg-gray-800 p-4">
          <h2 className="mb-4 text-xl font-semibold">Test Position</h2>
          <div className="mb-4 grid grid-cols-2 gap-4">
            {Object.entries(TEST_POSITIONS).map(([name, fen]) => (
              <button
                key={name}
                onClick={() => setSelectedPosition(fen)}
                className={`rounded p-3 text-left transition-colors ${
                  selectedPosition === fen
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div className="font-medium capitalize">{name}</div>
                <div className="mt-1 font-mono text-sm text-gray-300">
                  {fen.substring(0, 30)}...
                </div>
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-400">
            <strong>Current FEN:</strong>
            <div className="mt-1 rounded bg-gray-900 p-2 font-mono text-xs">
              {selectedPosition}
            </div>
          </div>
        </div>

        {/* Parameters */}
        <div className="mb-6 rounded-lg bg-gray-800 p-4">
          <h2 className="mb-4 text-xl font-semibold">Parameters</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Probability Threshold
              </label>
              <input
                type="number"
                value={customParams.probabilityThreshold}
                onChange={(e) =>
                  setCustomParams((prev) => ({
                    ...prev,
                    probabilityThreshold: parseFloat(e.target.value),
                  }))
                }
                step="0.01"
                min="0"
                max="1"
                className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Max Depth
              </label>
              <input
                type="number"
                value={customParams.maxDepth}
                onChange={(e) =>
                  setCustomParams((prev) => ({
                    ...prev,
                    maxDepth: parseInt(e.target.value),
                  }))
                }
                min="1"
                max="5"
                className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Maia Level
              </label>
              <select
                value={customParams.maiaLevel}
                onChange={(e) =>
                  setCustomParams((prev) => ({
                    ...prev,
                    maiaLevel: e.target.value,
                  }))
                }
                className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2"
              >
                {[
                  '1100',
                  '1200',
                  '1300',
                  '1400',
                  '1500',
                  '1600',
                  '1700',
                  '1800',
                  '1900',
                ].map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Stockfish Depth
              </label>
              <input
                type="number"
                value={customParams.stockfishDepth}
                onChange={(e) =>
                  setCustomParams((prev) => ({
                    ...prev,
                    stockfishDepth: parseInt(e.target.value),
                  }))
                }
                min="8"
                max="25"
                className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => controller.updateParams(customParams)}
              className="rounded bg-blue-600 px-4 py-2 font-medium hover:bg-blue-700"
            >
              Update Parameters
            </button>
            <button
              onClick={() => {
                setCustomParams(DEFAULT_EXPECTED_WINRATE_PARAMS)
                controller.updateParams(DEFAULT_EXPECTED_WINRATE_PARAMS)
              }}
              className="rounded bg-gray-600 px-4 py-2 font-medium hover:bg-gray-700"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="mb-6 rounded-lg bg-gray-800 p-4">
          <h2 className="mb-4 text-xl font-semibold">Controls</h2>
          <div className="flex gap-4">
            <button
              onClick={controller.startCalculation}
              disabled={
                !controller.isEnginesReady || controller.progress.isCalculating
              }
              className="rounded bg-green-600 px-6 py-3 font-medium hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-600"
            >
              {controller.progress.isCalculating
                ? 'Calculating...'
                : 'Start Calculation'}
            </button>
            <button
              onClick={controller.stopCalculation}
              disabled={!controller.progress.isCalculating}
              className="rounded bg-red-600 px-6 py-3 font-medium hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-600"
            >
              Stop Calculation
            </button>
            <button
              onClick={controller.clearCache}
              className="rounded bg-yellow-600 px-6 py-3 font-medium hover:bg-yellow-700"
            >
              Clear Cache
            </button>
          </div>
        </div>

        {/* Progress */}
        {controller.progress.isCalculating && (
          <div className="mb-6 rounded-lg bg-gray-800 p-4">
            <h2 className="mb-4 text-xl font-semibold">Progress</h2>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between">
                  <span>Overall Progress</span>
                  <span>
                    {Math.round(controller.progress.overallProgress * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                    style={{
                      width: `${controller.progress.overallProgress * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Phase:</strong> {controller.progress.currentPhase}
                </div>
                <div>
                  <strong>Current Move:</strong>{' '}
                  {controller.progress.currentMove || 'N/A'}
                </div>
                <div>
                  <strong>Moves Processed:</strong>{' '}
                  {controller.progress.movesProcessed}
                </div>
                <div>
                  <strong>Total Moves:</strong> {controller.progress.totalMoves}
                </div>
              </div>
              {controller.progress.warnings.length > 0 && (
                <div className="mt-3">
                  <strong className="text-yellow-400">Warnings:</strong>
                  <ul className="mt-1 text-sm text-yellow-300">
                    {controller.progress.warnings.map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {controller.results.length > 0 && (
          <div className="mb-6 rounded-lg bg-gray-800 p-4">
            <h2 className="mb-4 text-xl font-semibold">Results</h2>
            <div className="space-y-3">
              {controller.results.map((result, index) => (
                <div key={result.move} className="rounded bg-gray-700 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold">#{index + 1}</span>
                      <span className="text-xl font-semibold text-blue-400">
                        {result.san}
                      </span>
                      <span className="text-lg text-green-400">
                        {(result.expectedWinrate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Confidence: {(result.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm text-gray-300">
                    <div>Nodes: {result.nodeCount}</div>
                    <div>Leaves: {result.leafNodeCount}</div>
                    <div>Time: {result.calculationTime}ms</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {controller.error && (
          <div className="mb-6 rounded-lg border border-red-600 bg-red-900 p-4">
            <h2 className="mb-2 text-xl font-semibold text-red-400">Error</h2>
            <p className="text-red-300">{controller.error}</p>
          </div>
        )}

        {/* Cache Statistics */}
        <div className="mb-6 rounded-lg bg-gray-800 p-4">
          <h2 className="mb-4 text-xl font-semibold">Cache Statistics</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Cache Size:</strong>{' '}
              {controller.memoryCache.getStats().size}
            </div>
            <div>
              <strong>Max Entries:</strong>{' '}
              {controller.memoryCache.getStats().maxEntries}
            </div>
            <div>
              <strong>Auto-saving:</strong>{' '}
              {controller.isAutoSaving ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>This is a test page for Expected Winrate development.</p>
          <p>Open browser console to see detailed calculation logs.</p>
        </div>
      </div>
    </div>
  )
}

export default function ExpectedWinrateTestPage() {
  return (
    <StockfishEngineContextProvider>
      <MaiaEngineContextProvider>
        <ExpectedWinrateTestComponent />
      </MaiaEngineContextProvider>
    </StockfishEngineContextProvider>
  )
}
