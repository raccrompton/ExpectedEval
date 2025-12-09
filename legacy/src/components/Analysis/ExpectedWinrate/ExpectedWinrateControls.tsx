/**
 * Expected Winrate Controls Component
 *
 * Provides parameter configuration interface for Expected Winrate analysis.
 * Integrates with existing analysis patterns and responsive design system.
 * Follows established UI component patterns from MovesByRating and BlunderMeter.
 */

import { useState, useCallback } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { PlayIcon, StopIcon, TrashIcon } from '@heroicons/react/24/solid'

import {
  ExpectedWinRateParams,
  ExpectedWinrateControlsProps,
  DEFAULT_EXPECTED_WINRATE_PARAMS,
} from 'src/types/expectedWinrate'
import { Button } from 'src/components/ui'

export const ExpectedWinrateControls = ({
  params,
  onParamsChange,
  isCalculating,
  onStartCalculation,
  onStopCalculation,
  analysisEnabled,
}: ExpectedWinrateControlsProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleParamChange = useCallback(
    (key: keyof ExpectedWinRateParams, value: number | string | boolean) => {
      onParamsChange({
        ...params,
        [key]: value,
      })
    },
    [params, onParamsChange],
  )

  const resetToDefaults = useCallback(() => {
    onParamsChange(DEFAULT_EXPECTED_WINRATE_PARAMS)
  }, [onParamsChange])

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  if (!analysisEnabled) {
    return (
      <div className="border-border-1 relative rounded-lg border bg-background-1/60 p-4 backdrop-blur-sm">
        <div className="absolute inset-0 rounded-lg bg-background-1/20 backdrop-blur-sm" />
        <div className="text-text-secondary relative z-10 text-center">
          <h3 className="mb-2 text-sm font-medium">
            Expected Winrate Analysis
          </h3>
          <p className="text-xs opacity-75">
            Enable analysis to access Expected Winrate calculations
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="border-border-1 space-y-4 rounded-lg border bg-background-1/60 p-4 backdrop-blur-sm">
      {/* Header with main controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-text-primary text-sm font-medium">
            Expected Winrate
          </h3>
          {isCalculating && (
            <div className="bg-accent-1 h-2 w-2 animate-pulse rounded-full" />
          )}
        </div>
        <button
          onClick={toggleExpanded}
          className="text-text-secondary hover:text-text-primary p-1 transition-colors"
          aria-label={isExpanded ? 'Hide parameters' : 'Show parameters'}
        >
          {isExpanded ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Quick controls */}
      <div className="flex gap-2">
        <Button
          onClick={isCalculating ? onStopCalculation : onStartCalculation}
          disabled={false}
          variant={isCalculating ? 'secondary' : 'primary'}
          size="sm"
          className="flex-1"
        >
          {isCalculating ? (
            <>
              <StopIcon className="mr-1 h-4 w-4" />
              Stop
            </>
          ) : (
            <>
              <PlayIcon className="mr-1 h-4 w-4" />
              Calculate
            </>
          )}
        </Button>
        <Button
          onClick={resetToDefaults}
          disabled={isCalculating}
          variant="outline"
          size="sm"
          className="px-3"
          aria-label="Reset to defaults"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Expanded parameter controls */}
      {isExpanded && (
        <div className="border-border-1 space-y-3 border-t pt-2">
          {/* Maia Parameters */}
          <div className="space-y-2">
            <h4 className="text-text-secondary text-xs font-medium uppercase tracking-wider">
              Maia Parameters
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="maia-level-select"
                  className="text-text-secondary mb-1 block text-xs"
                >
                  Maia Level
                </label>
                <select
                  id="maia-level-select"
                  value={params.maiaLevel}
                  onChange={(e) =>
                    handleParamChange('maiaLevel', e.target.value)
                  }
                  disabled={isCalculating}
                  className="border-border-1 focus:border-accent-1 w-full rounded border bg-background-2 px-2 py-1 text-xs focus:outline-none"
                >
                  <option value="1100">1100</option>
                  <option value="1200">1200</option>
                  <option value="1300">1300</option>
                  <option value="1400">1400</option>
                  <option value="1500">1500</option>
                  <option value="1600">1600</option>
                  <option value="1700">1700</option>
                  <option value="1800">1800</option>
                  <option value="1900">1900</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="max-depth-input"
                  className="text-text-secondary mb-1 block text-xs"
                >
                  Max Depth
                </label>
                <input
                  id="max-depth-input"
                  type="number"
                  value={params.maxDepth}
                  onChange={(e) =>
                    handleParamChange('maxDepth', parseInt(e.target.value) || 1)
                  }
                  disabled={isCalculating}
                  min={1}
                  max={5}
                  className="border-border-1 focus:border-accent-1 w-full rounded border bg-background-2 px-2 py-1 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="probability-threshold-range"
                className="text-text-secondary mb-1 block text-xs"
              >
                Probability Threshold:{' '}
                {(params.probabilityThreshold * 100).toFixed(0)}%
              </label>
              <input
                id="probability-threshold-range"
                type="range"
                value={params.probabilityThreshold}
                onChange={(e) =>
                  handleParamChange(
                    'probabilityThreshold',
                    parseFloat(e.target.value),
                  )
                }
                disabled={isCalculating}
                min={0.01}
                max={0.2}
                step={0.01}
                className="w-full"
              />
            </div>
          </div>

          {/* Stockfish Parameters */}
          <div className="space-y-2">
            <h4 className="text-text-secondary text-xs font-medium uppercase tracking-wider">
              Stockfish Parameters
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="engine-depth-input"
                  className="text-text-secondary mb-1 block text-xs"
                >
                  Engine Depth
                </label>
                <input
                  id="engine-depth-input"
                  type="number"
                  value={params.stockfishDepth}
                  onChange={(e) =>
                    handleParamChange(
                      'stockfishDepth',
                      parseInt(e.target.value) || 1,
                    )
                  }
                  disabled={isCalculating}
                  min={10}
                  max={25}
                  className="border-border-1 focus:border-accent-1 w-full rounded border bg-background-2 px-2 py-1 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="winrate-loss-range"
                  className="text-text-secondary mb-1 block text-xs"
                >
                  Winrate Loss:{' '}
                  {(Math.abs(params.winrateLossThreshold) * 100).toFixed(0)}%
                </label>
                <input
                  id="winrate-loss-range"
                  type="range"
                  value={Math.abs(params.winrateLossThreshold)}
                  onChange={(e) =>
                    handleParamChange(
                      'winrateLossThreshold',
                      -parseFloat(e.target.value),
                    )
                  }
                  disabled={isCalculating}
                  min={0.05}
                  max={0.3}
                  step={0.01}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Pruning Parameters */}
          <div className="space-y-2">
            <h4 className="text-text-secondary text-xs font-medium uppercase tracking-wider">
              Pruning Parameters
            </h4>

            <div className="flex items-center justify-between">
              <label
                htmlFor="player-aware-pruning-checkbox"
                className="text-text-secondary text-xs"
              >
                Player-Aware Pruning
              </label>
              <input
                id="player-aware-pruning-checkbox"
                type="checkbox"
                checked={params.playerAwarePruning}
                onChange={(e) =>
                  handleParamChange('playerAwarePruning', e.target.checked)
                }
                disabled={isCalculating}
                className="h-4 w-4"
              />
            </div>

            {params.playerAwarePruning && (
              <div>
                <label
                  htmlFor="pruning-threshold-range"
                  className="text-text-secondary mb-1 block text-xs"
                >
                  Pruning Threshold:{' '}
                  {(params.pruningThreshold * 100).toFixed(1)}%
                </label>
                <input
                  id="pruning-threshold-range"
                  type="range"
                  value={params.pruningThreshold}
                  onChange={(e) =>
                    handleParamChange(
                      'pruningThreshold',
                      parseFloat(e.target.value),
                    )
                  }
                  disabled={isCalculating}
                  min={0.005}
                  max={0.05}
                  step={0.005}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
