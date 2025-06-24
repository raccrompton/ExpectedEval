import React from 'react'
import Image from 'next/image'
import { CompletedDrill, OpeningSelection } from 'src/types/openings'

interface Props {
  currentDrill: OpeningSelection | null
  completedDrills: CompletedDrill[]
  remainingDrills: OpeningSelection[]
  onResetCurrentDrill: () => void
  onChangeSelections?: () => void
}

export const OpeningDrillSidebar: React.FC<Props> = ({
  currentDrill,
  completedDrills,
  remainingDrills,
  onResetCurrentDrill,
  onChangeSelections,
}) => {
  return (
    <div className="flex h-full w-72 flex-col border-r border-white/10 bg-background-1">
      {/* Current Drill Info */}
      <div className="border-b border-white/10 p-4">
        <h2 className="mb-2 text-lg font-bold text-primary">Current Drill</h2>
        {currentDrill ? (
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-primary">
                {currentDrill.opening.name}
              </p>
              {currentDrill.variation && (
                <p className="text-xs text-secondary">
                  {currentDrill.variation.name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-secondary">
              <div className="relative h-4 w-4">
                <Image
                  src={
                    currentDrill.playerColor === 'white'
                      ? '/assets/pieces/white king.svg'
                      : '/assets/pieces/black king.svg'
                  }
                  fill={true}
                  alt={`${currentDrill.playerColor} king`}
                />
              </div>
              <span>
                vs Maia {currentDrill.maiaVersion.replace('maia_kdd_', '')}
              </span>
              <span>•</span>
              <span>{currentDrill.targetMoveNumber} moves</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={onResetCurrentDrill}
                className="flex-1 rounded bg-background-2 px-3 py-1 text-xs transition-colors hover:bg-background-3"
              >
                Reset
              </button>
              {onChangeSelections && (
                <button
                  onClick={onChangeSelections}
                  className="flex-1 rounded bg-background-2 px-3 py-1 text-xs transition-colors hover:bg-background-3"
                >
                  Change
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-secondary">No drill selected</p>
        )}
      </div>

      {/* Drill Progress */}
      <div className="border-b border-white/10 p-4">
        <h3 className="mb-2 text-sm font-medium text-primary">Progress</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-secondary">Completed</span>
            <span className="font-medium text-green-400">
              {completedDrills.length}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-secondary">Remaining</span>
            <span className="font-medium text-human-4">
              {remainingDrills.length}
            </span>
          </div>
          <div className="h-2 w-full rounded bg-background-2">
            <div
              className="h-full rounded bg-human-4 transition-all duration-300"
              style={{
                width: `${
                  completedDrills.length > 0
                    ? (completedDrills.length /
                        (completedDrills.length + remainingDrills.length)) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Completed Drills List */}
      <div className="flex h-96 flex-col overflow-hidden">
        <div className="border-b border-white/10 p-3">
          <h3 className="text-sm font-medium text-primary">
            Completed Drills ({completedDrills.length})
          </h3>
        </div>
        <div className="flex h-full flex-col">
          {completedDrills.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="max-w-[12rem] text-center text-xs text-secondary">
                Complete your first opening drill to see your progress here
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {completedDrills.map((completedDrill, index) => {
                const accuracy =
                  completedDrill.totalMoves > 0
                    ? Math.round(
                        (completedDrill.goodMoves.length /
                          completedDrill.totalMoves) *
                          100,
                      )
                    : 0

                return (
                  <div
                    key={completedDrill.selection.id}
                    className="rounded bg-background-2 p-2 transition-colors hover:bg-background-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-primary">
                          {completedDrill.selection.opening.name}
                        </p>
                        {completedDrill.selection.variation && (
                          <p className="text-xs text-secondary">
                            {completedDrill.selection.variation.name}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <div className="relative h-3 w-3">
                            <Image
                              src={
                                completedDrill.selection.playerColor === 'white'
                                  ? '/assets/pieces/white king.svg'
                                  : '/assets/pieces/black king.svg'
                              }
                              fill={true}
                              alt={`${completedDrill.selection.playerColor} king`}
                            />
                          </div>
                          <span className="text-secondary">
                            vs Maia{' '}
                            {completedDrill.selection.maiaVersion.replace(
                              'maia_kdd_',
                              '',
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-xs font-bold ${
                            accuracy >= 80
                              ? 'text-green-400'
                              : accuracy >= 60
                                ? 'text-yellow-400'
                                : 'text-red-400'
                          }`}
                        >
                          {accuracy}%
                        </div>
                        <div className="text-xs text-secondary">
                          {completedDrill.totalMoves} moves
                        </div>
                      </div>
                    </div>
                    <div className="mt-1 flex gap-4 text-xs">
                      <span className="text-green-400">
                        ✓ {completedDrill.goodMoves.length}
                      </span>
                      <span className="text-red-400">
                        ✗ {completedDrill.blunders.length}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
