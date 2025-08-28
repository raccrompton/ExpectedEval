import React, { useEffect, useMemo, useState } from 'react'
import { AnalyzedGame } from 'src/types'
import { useExpectedWinrateController } from 'src/hooks/useExpectedWinrateController'
import { ParameterControlsExpectedWinrate } from './ParameterControlsExpectedWinrate'
import { ExpectedWinrateList } from './ExpectedWinrateList'
import { ExpectedWinrateTree } from './ExpectedWinrateTree'

export const ExpectedWinratePanel: React.FC<{
  game: AnalyzedGame
  currentMaiaModel: string
}> = ({ game, currentMaiaModel }) => {
  const controller = useExpectedWinrateController(game)
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    if (!controller.isRunning && !controller.result) {
      controller.start()
    }
  }, [controller])

  const moves = useMemo(() => controller.result?.moves ?? [], [controller.result])

  return (
    <div className="flex w-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10">
        <ParameterControlsExpectedWinrate
          params={controller.params}
          setParams={controller.setParams}
        />
        <div className="flex items-center gap-2 px-3">
          {controller.isRunning ? (
            <button
              className="rounded bg-red-500/20 px-3 py-1 text-xs text-red-400 hover:bg-red-500/30"
              onClick={() => controller.stop()}
            >
              Stop
            </button>
          ) : (
            <button
              className="rounded bg-primary/20 px-3 py-1 text-xs text-primary hover:bg-primary/30"
              onClick={() => controller.start()}
            >
              Start
            </button>
          )}
          <div className="text-xs text-secondary">
            {controller.isRunning ? 'Running… ' : 'Idle · '}
            {Math.round(controller.elapsedMs)} ms
            {controller.result?.cacheHit ? ' · Cache' : ''}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-2">
        <div className="rounded bg-white/5">
          <ExpectedWinrateList
            moves={moves}
            onSelect={(m) =>
              setSelected(moves.findIndex((x) => x.move === m.move))
            }
          />
        </div>
        <div className="rounded bg-white/5">
          <ExpectedWinrateTree
            move={
              selected !== null && moves[selected] ? moves[selected] : null
            }
          />
        </div>
      </div>
    </div>
  )
}
