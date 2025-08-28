import { useMemo } from 'react'
import { EXPECTED_WINRATE_DEFAULTS } from 'src/constants/expectedWinrate'
import { ExpectedWinrateParams } from 'src/lib/expectedWinrate/types'

export const ParameterControlsExpectedWinrate: React.FC<{
  params: ExpectedWinrateParams
  setParams: (p: ExpectedWinrateParams) => void
}> = ({ params, setParams }) => {
  const thresholds = useMemo(() => [0.1, 0.01, 0.001], [])
  const depths = useMemo(() => [15, 20, 25], [])

  return (
    <div className="flex w-full flex-wrap gap-2 p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-secondary">Probability threshold</span>
        <select
          className="bg-white/5 px-2 py-1 text-xs"
          value={params.probThreshold}
          onChange={(e) =>
            setParams({ ...params, probThreshold: parseFloat(e.target.value) })
          }
        >
          {thresholds.map((t) => (
            <option key={t} value={t}>
              {(t * 100).toFixed(1)}%
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-secondary">Stockfish depth</span>
        <select
          className="bg-white/5 px-2 py-1 text-xs"
          value={params.depth}
          onChange={(e) =>
            setParams({ ...params, depth: parseInt(e.target.value) })
          }
        >
          {depths.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-secondary">Min win rate</span>
        <input
          className="bg-white/5 px-2 py-1 text-xs"
          type="number"
          min={0}
          max={100}
          step={1}
          value={Math.round(params.minWin * 100)}
          onChange={(e) =>
            setParams({ ...params, minWin: parseInt(e.target.value) / 100 })
          }
        />
        <span className="text-xs text-secondary">%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-secondary">Maia level</span>
        <span className="rounded bg-white/5 px-2 py-1 text-xs">
          {params.maiaModel || 'maia_rapid'}
        </span>
      </div>
      <div className="ml-auto text-xs text-secondary">
        Defaults: {(EXPECTED_WINRATE_DEFAULTS.probThreshold * 100).toFixed(1)}%
        / {EXPECTED_WINRATE_DEFAULTS.depth} /{' '}
        {EXPECTED_WINRATE_DEFAULTS.minWinPct}%
      </div>
    </div>
  )
}
