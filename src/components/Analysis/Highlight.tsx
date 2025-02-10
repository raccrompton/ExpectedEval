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

  movesByRating: { [key: string]: number }[] | undefined
}

export const Highlight: React.FC<Props> = ({
  currentMaiaModel,
  recommendations,
  moveEvaluation,
  colorSanMapping,
  movesByRating,
}: Props) => {
  return (
    <div className="flex h-full w-full items-start overflow-hidden rounded border-[0.5px] border-white/40 bg-background-1">
      <div className="flex h-full min-w-[40%] flex-col border-r-[0.5px] border-white/40">
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
          <div className="grid grid-rows-2 items-center justify-center p-3">
            {recommendations.maia?.map(({ move, prob }, index) => {
              return (
                <div
                  key={index}
                  className="flex cursor-default items-center justify-start gap-3 hover:underline"
                  style={{
                    color: colorSanMapping[move]?.color ?? '#fff',
                  }}
                >
                  <p className="w-[42px] text-right font-mono text-sm">
                    {Math.round(prob * 1000) / 10}%
                  </p>
                  <p className="text-left font-mono text-sm">
                    {colorSanMapping[move]?.san ?? move}
                  </p>
                </div>
              )
            })}
          </div>
          <div className="grid grid-rows-2 flex-col items-center justify-center p-3">
            {recommendations.stockfish?.map(({ move, cp }, index) => {
              return (
                <div
                  key={index}
                  className="flex cursor-default items-center justify-start gap-3 hover:underline"
                  style={{
                    color: colorSanMapping[move]?.color ?? '#fff',
                  }}
                >
                  <p className="w-[42px] text-right font-mono text-sm">
                    {cp > 0 ? '+' : null}
                    {cp / 100}
                  </p>
                  <p className="font-mono text-sm">
                    {colorSanMapping[move]?.san ?? move}
                  </p>
                </div>
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
