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
      <div className="relative bg-background-1/60 backdrop-blur-sm border border-border-1 rounded-lg p-4">
        <div className="absolute inset-0 bg-background-1/20 backdrop-blur-sm rounded-lg" />
        <div className="relative z-10 text-center text-text-secondary">
          <h3 className="text-sm font-medium mb-2">Expected Winrate Analysis</h3>
          <p className="text-xs opacity-75">
            Enable analysis to access Expected Winrate calculations
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background-1/60 backdrop-blur-sm border border-border-1 rounded-lg p-4 space-y-4">
      {/* Header with main controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-primary">
            Expected Winrate
          </h3>
          {isCalculating && (
            <div className="w-2 h-2 bg-accent-1 rounded-full animate-pulse" />
          )}
        </div>
        <button
          onClick={toggleExpanded}
          className="p-1 text-text-secondary hover:text-text-primary transition-colors"
          aria-label={isExpanded ? 'Hide parameters' : 'Show parameters'}
        >
          {isExpanded ? (
            <ChevronUpIcon className="w-4 h-4" />
          ) : (
            <ChevronDownIcon className="w-4 h-4" />
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
              <StopIcon className="w-4 h-4 mr-1" />
              Stop
            </>
          ) : (
            <>
              <PlayIcon className="w-4 h-4 mr-1" />
              Calculate
            </>
          )}
        </Button>
        <Button
          onClick={resetToDefaults}
          disabled={isCalculating}
          variant="ghost"
          size="sm"
          className="px-3"
          aria-label="Reset to defaults"
        >
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>

      {/* Expanded parameter controls */}
      {isExpanded && (
        <div className="space-y-3 pt-2 border-t border-border-1">
          {/* Maia Parameters */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Maia Parameters
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  Maia Level
                </label>
                <select
                  value={params.maiaLevel}
                  onChange={(e) => handleParamChange('maiaLevel', e.target.value)}
                  disabled={isCalculating}
                  className="w-full px-2 py-1 text-xs bg-background-2 border border-border-1 rounded focus:outline-none focus:border-accent-1"
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
                <label className="block text-xs text-text-secondary mb-1">
                  Max Depth
                </label>
                <input
                  type="number"
                  value={params.maxDepth}
                  onChange={(e) =>
                    handleParamChange('maxDepth', parseInt(e.target.value) || 1)
                  }
                  disabled={isCalculating}
                  min={1}
                  max={5}
                  className="w-full px-2 py-1 text-xs bg-background-2 border border-border-1 rounded focus:outline-none focus:border-accent-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-secondary mb-1">
                Probability Threshold: {(params.probabilityThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                value={params.probabilityThreshold}
                onChange={(e) =>
                  handleParamChange('probabilityThreshold', parseFloat(e.target.value))
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
            <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Stockfish Parameters
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  Engine Depth
                </label>
                <input
                  type="number"
                  value={params.stockfishDepth}
                  onChange={(e) =>
                    handleParamChange('stockfishDepth', parseInt(e.target.value) || 1)
                  }
                  disabled={isCalculating}
                  min={10}
                  max={25}
                  className="w-full px-2 py-1 text-xs bg-background-2 border border-border-1 rounded focus:outline-none focus:border-accent-1"
                />
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  Winrate Loss: {(Math.abs(params.winrateLossThreshold) * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  value={Math.abs(params.winrateLossThreshold)}
                  onChange={(e) =>
                    handleParamChange('winrateLossThreshold', -parseFloat(e.target.value))
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
            <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Pruning Parameters
            </h4>
            
            <div className="flex items-center justify-between">
              <label className="text-xs text-text-secondary">
                Player-Aware Pruning
              </label>
              <input
                type="checkbox"
                checked={params.playerAwarePruning}
                onChange={(e) =>
                  handleParamChange('playerAwarePruning', e.target.checked)
                }
                disabled={isCalculating}
                className="w-4 h-4"
              />
            </div>

            {params.playerAwarePruning && (
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  Pruning Threshold: {(params.pruningThreshold * 100).toFixed(1)}%
                </label>
                <input
                  type="range"
                  value={params.pruningThreshold}
                  onChange={(e) =>
                    handleParamChange('pruningThreshold', parseFloat(e.target.value))
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