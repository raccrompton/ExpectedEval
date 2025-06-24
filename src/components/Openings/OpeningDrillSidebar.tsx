import React from 'react'
import Image from 'next/image'
import { Tooltip } from 'react-tooltip'
import { OpeningSelection, GameNode, GameTree } from 'src/types'
import { GameInfo } from '../Misc/GameInfo'
import { MovesContainer } from '../Board/MovesContainer'
import { BoardController } from '../Board/BoardController'

interface Props {
  selections: OpeningSelection[]
  currentSelectionIndex: number
  onSwitchSelection: (index: number) => void
  onResetCurrent: () => void
  onResetOpening: (selectionId: string) => void
  gameTree: GameTree
  currentNode: GameNode
  goToNode: (node: GameNode) => void
  goToNextNode: () => void
  goToPreviousNode: () => void
  goToRootNode: () => void
  plyCount: number
  orientation: 'white' | 'black'
  setOrientation: (orientation: 'white' | 'black') => void
  analysisEnabled: boolean
}

export const OpeningDrillSidebar: React.FC<Props> = ({
  selections,
  currentSelectionIndex,
  onSwitchSelection,
  onResetCurrent,
  onResetOpening,
  gameTree,
  currentNode,
  goToNode,
  goToNextNode,
  goToPreviousNode,
  goToRootNode,
  plyCount,
  orientation,
  setOrientation,
  analysisEnabled,
}) => {
  const currentSelection = selections[currentSelectionIndex]

  // Create a base game structure for MovesContainer that uses the live tree
  const baseGame = React.useMemo(() => {
    return {
      id: currentSelection?.id || 'opening-drill',
      tree: gameTree, // Use the live gameTree from the controller
      moves: [],
      termination: {
        result: '*',
        winner: 'none' as const,
        condition: 'Normal',
      },
    }
  }, [currentSelection?.id, gameTree, plyCount]) // Add plyCount to dependencies to force updates

  return (
    <div className="flex h-[85vh] w-72 min-w-60 max-w-72 flex-col gap-2 overflow-hidden 2xl:min-w-72">
      <GameInfo title="Drill Openings" icon="school" type="analysis">
        <div className="flex flex-col gap-2">
          <div className="min-h-[30px]">
            <p className="text-sm text-secondary">
              Current Opening:{' '}
              <span className="text-primary">
                {currentSelection?.opening.name}
              </span>
            </p>
            <div className="min-h-[20px]">
              {currentSelection?.variation && (
                <p className="text-sm text-secondary">
                  Variation:{' '}
                  <span className="text-primary">
                    {currentSelection.variation.name}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </GameInfo>

      <div className="flex max-h-[25vh] min-h-[25vh] flex-col overflow-hidden rounded bg-background-1">
        <div className="flex items-center justify-between border-b border-white/10 p-3">
          <h3 className="font-semibold">
            Selected Openings ({selections.length})
          </h3>
          <button
            onClick={onResetCurrent}
            className="text-xs text-secondary transition-colors hover:text-primary"
            data-tooltip-id="reset-all-tooltip"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
          </button>
          <Tooltip
            id="reset-all-tooltip"
            content="Reset All Openings"
            place="top"
            delayShow={300}
            className="z-50 !bg-background-2 !px-2 !py-1 !text-xs"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {selections.map((selection, index) => (
            <div
              key={selection.id}
              className={`flex cursor-pointer items-center justify-between border-b border-white/5 p-3 transition-colors ${
                index === currentSelectionIndex
                  ? 'bg-human-2/20'
                  : 'hover:bg-human-2/10'
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                className="min-w-0 flex-1"
                onClick={() => onSwitchSelection(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSwitchSelection(index)
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-5 w-5 flex-shrink-0">
                    <Image
                      src={
                        selection.playerColor === 'white'
                          ? '/assets/pieces/white king.svg'
                          : '/assets/pieces/black king.svg'
                      }
                      fill={true}
                      alt={`${selection.playerColor} king`}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-primary">
                      {selection.opening.name}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-secondary">
                      {selection.variation && (
                        <>
                          <span className="truncate whitespace-nowrap">
                            {selection.variation.name}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <span className="whitespace-nowrap">
                        v. Maia {selection.maiaVersion.replace('maia_kdd_', '')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onResetOpening(selection.id)
                }}
                className="ml-2 text-secondary transition-colors hover:text-primary"
                data-tooltip-id={`reset-opening-${selection.id}`}
              >
                <span className="material-symbols-outlined text-sm">
                  refresh
                </span>
              </button>
              <Tooltip
                id={`reset-opening-${selection.id}`}
                content="Reset Opening"
                place="top"
                delayShow={300}
                className="z-50 !bg-background-2 !px-2 !py-1 !text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex h-1/2 w-full flex-1 flex-col gap-2">
        <div className="flex h-full flex-col overflow-y-scroll">
          <MovesContainer
            game={baseGame}
            type="analysis"
            showAnnotations={analysisEnabled}
          />
          <BoardController
            gameTree={gameTree}
            orientation={orientation}
            setOrientation={setOrientation}
            currentNode={currentNode}
            plyCount={plyCount}
            goToNode={goToNode}
            goToNextNode={goToNextNode}
            goToPreviousNode={goToPreviousNode}
            goToRootNode={goToRootNode}
            disableFlip={true}
          />
        </div>
      </div>
    </div>
  )
}
