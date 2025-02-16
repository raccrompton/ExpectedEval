import { Tooltip } from 'react-tooltip'
import { MovesByRating } from './MovesByRating'
import { MaiaEvaluation, StockfishEvaluation, ColorSanMapping } from 'src/types'

interface Props {
  currentMaiaModel: string
  moveEvaluation: {
    maia?: MaiaEvaluation
    stockfish?: StockfishEvaluation
  }
  colorSanMapping: ColorSanMapping
  recommendations: {
    maia?: { move: string; prob: number }[]
    stockfish?: { move: string; cp: number }[]
  }
  hover: (move?: string) => void
  makeMove: (move: string) => void
  movesByRating: { [key: string]: number }[] | undefined
}

export const Highlight: React.FC<Props> = ({
  hover,
  makeMove,
  movesByRating,
  moveEvaluation,
  colorSanMapping,
  recommendations,
  currentMaiaModel,
}: Props) => {
  const findMatchingMove = (move: string, source: 'maia' | 'stockfish') => {
    if (source === 'maia') {
      return recommendations.stockfish?.find((rec) => rec.move === move)
    } else {
      return recommendations.maia?.find((rec) => rec.move === move)
    }
  }

  const getTooltipContent = (
    move: string,
    source: 'maia' | 'stockfish',
    prob?: number,
    cp?: number,
  ) => {
    const matchingMove = findMatchingMove(move, source)
    const maiaProb =
      source === 'maia' ? prob : (matchingMove as { prob: number })?.prob
    const stockfishCp =
      source === 'stockfish' ? cp : (matchingMove as { cp: number })?.cp

    return (
      <div className="flex flex-col gap-1 overflow-hidden rounded border border-background-2 bg-backdrop">
        <div className="flex items-center bg-backdrop px-3 py-1.5">
          <span
            style={{
              color: colorSanMapping[move]?.color ?? '#fff',
            }}
            className="font-medium"
          >
            {colorSanMapping[move]?.san ?? move}
          </span>
        </div>
        <div className="flex flex-col items-start justify-start gap-1 bg-background-1/80 px-3 py-1.5 text-sm">
          {maiaProb !== undefined && (
            <div className="flex w-full items-center justify-between gap-2 font-mono">
              <span className="text-human-3">Maia:</span>
              <span>{(Math.round(maiaProb * 1000) / 10).toFixed(1)}%</span>
            </div>
          )}
          {stockfishCp !== undefined && (
            <div className="flex w-full items-center justify-between gap-2 font-mono">
              <span className="text-engine-3">Stockfish:</span>
              <span>
                {stockfishCp > 0 ? '+' : ''}
                {(stockfishCp / 100).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col items-start overflow-hidden rounded border-[0.5px] border-white/40 bg-background-1 md:flex-row">
      <div className="flex h-full w-full flex-col border-b-[0.5px] border-white/40 md:w-auto md:min-w-[40%] md:border-b-0 md:border-r-[0.5px]">
        <div className="grid grid-cols-2">
          <div className="flex flex-col items-center justify-center gap-1 bg-human-3/5 py-3">
            <p className="text-center text-sm text-human-2">
              Maia {currentMaiaModel.slice(-4)}
              <br />
              White Win %
            </p>
            <p className="text-2xl font-bold text-human-1">
              {moveEvaluation?.maia
                ? `${Math.round(moveEvaluation.maia?.value * 1000) / 10}%`
                : '...'}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 bg-engine-3/5 py-3">
            <p className="text-center text-sm text-engine-2">
              SF Eval
              <br />
              {moveEvaluation?.stockfish?.depth
                ? ` (Depth ${moveEvaluation.stockfish?.depth})`
                : ''}
            </p>
            <p className="text-2xl font-bold text-engine-1">
              {moveEvaluation?.stockfish
                ? `${moveEvaluation.stockfish.model_optimal_cp > 0 ? '+' : ''}${moveEvaluation.stockfish.model_optimal_cp / 100}`
                : '...'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2">
          <Tooltip
            place="bottom"
            id="move-tooltip"
            noArrow={true}
            className="!z-50 !bg-none !p-0 !opacity-100"
            render={({ content }) => {
              if (!content) return null
              const { move, source, prob, cp } = JSON.parse(content)
              return getTooltipContent(move, source, prob, cp)
            }}
          />
          <div className="grid grid-rows-2 items-center justify-center p-3">
            {recommendations.maia?.slice(0, 6).map(({ move, prob }, index) => {
              return (
                <button
                  key={index}
                  className="grid cursor-pointer grid-cols-2 gap-3 hover:underline"
                  style={{
                    color: colorSanMapping[move]?.color ?? '#fff',
                  }}
                  onMouseLeave={() => hover()}
                  onMouseEnter={() => hover(move)}
                  onClick={() => makeMove(move)}
                  data-tooltip-id="move-tooltip"
                  data-tooltip-content={JSON.stringify({
                    move,
                    source: 'maia',
                    prob,
                  })}
                >
                  <p className="text-right font-mono text-sm">
                    {(Math.round(prob * 1000) / 10).toFixed(1)}%
                  </p>
                  <p className="text-left font-mono text-sm">
                    {colorSanMapping[move]?.san ?? move}
                  </p>
                </button>
              )
            })}
          </div>
          <div className="grid grid-rows-2 flex-col items-center justify-center p-3">
            {recommendations.stockfish
              ?.slice(0, 6)
              .map(({ move, cp }, index) => {
                return (
                  <button
                    key={index}
                    className="grid cursor-pointer grid-cols-2 gap-3 hover:underline"
                    style={{
                      color: colorSanMapping[move]?.color ?? '#fff',
                    }}
                    onMouseLeave={() => hover()}
                    onMouseEnter={() => hover(move)}
                    onClick={() => makeMove(move)}
                    data-tooltip-id="move-tooltip"
                    data-tooltip-content={JSON.stringify({
                      move,
                      source: 'stockfish',
                      cp,
                    })}
                  >
                    <p className="w-[42px] text-right font-mono text-sm">
                      {cp > 0 ? '+' : null}
                      {`${(cp / 100).toFixed(2)}`}
                    </p>
                    <p className="text-left font-mono text-sm">
                      {colorSanMapping[move]?.san ?? move}
                    </p>
                  </button>
                )
              })}
          </div>
        </div>
      </div>
      <div className="flex h-full w-full flex-col">
        <MovesByRating
          moves={movesByRating}
          colorSanMapping={colorSanMapping}
        />
      </div>
    </div>
  )
}
