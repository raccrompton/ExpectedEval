import React from 'react'
import { OpeningSelection } from 'src/types'
import { GameInfo } from '../Misc/GameInfo'

interface Props {
  selections: OpeningSelection[]
  currentSelectionIndex: number
  onSwitchSelection: (index: number) => void
  onResetCurrent: () => void
}

export const OpeningDrillSidebar: React.FC<Props> = ({
  selections,
  currentSelectionIndex,
  onSwitchSelection,
  onResetCurrent,
}) => {
  const currentSelection = selections[currentSelectionIndex]

  return (
    <div className="flex h-[85vh] w-72 min-w-60 max-w-72 flex-col gap-2 overflow-hidden 2xl:min-w-72">
      <GameInfo title="Opening Drill" icon="school" type="analysis">
        <div className="space-y-2">
          <p className="text-sm text-secondary">
            Current Opening:{' '}
            <span className="text-primary">
              {currentSelection?.opening.name}
            </span>
          </p>
          {currentSelection?.variation && (
            <p className="text-sm text-secondary">
              Variation:{' '}
              <span className="text-primary">
                {currentSelection.variation.name}
              </span>
            </p>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`inline-flex items-center gap-1 ${
                currentSelection?.playerColor === 'white'
                  ? 'text-white'
                  : 'text-gray-400'
              }`}
            >
              <span className="material-symbols-outlined text-xs">chess</span>
              Playing as {currentSelection?.playerColor}
            </span>
            <span className="text-human-3">
              vs {currentSelection?.maiaVersion.replace('maia_kdd_', 'Maia ')}
            </span>
          </div>
        </div>
      </GameInfo>

      <div className="flex flex-col overflow-hidden rounded bg-background-1">
        <div className="flex items-center justify-between border-b border-white/10 p-3">
          <h3 className="font-semibold">
            Selected Openings ({selections.length})
          </h3>
          <button
            onClick={onResetCurrent}
            className="text-xs text-secondary transition-colors hover:text-human-4"
            title="Reset current opening"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {selections.map((selection, index) => (
            <div
              key={selection.id}
              role="button"
              tabIndex={0}
              className={`cursor-pointer border-b border-white/5 p-3 transition-colors ${
                index === currentSelectionIndex
                  ? 'bg-human-2/20'
                  : 'hover:bg-human-2/10'
              }`}
              onClick={() => onSwitchSelection(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSwitchSelection(index)
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-medium">
                    {selection.opening.name}
                  </h4>
                  {selection.variation && (
                    <p className="truncate text-xs text-secondary">
                      {selection.variation.name}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs ${
                        selection.playerColor === 'white'
                          ? 'text-white'
                          : 'text-gray-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">
                        chess
                      </span>
                      {selection.playerColor}
                    </span>
                    <span className="text-xs text-human-3">
                      {selection.maiaVersion.replace('maia_kdd_', 'Maia ')}
                    </span>
                  </div>
                </div>
                {index === currentSelectionIndex && (
                  <span className="material-symbols-outlined ml-2 text-sm text-human-3">
                    play_arrow
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
