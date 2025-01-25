import { MaiaEvaluation, StockfishEvaluation } from 'src/types'
import { BlunderMeter } from './BlunderMeter'

interface Props {
  moveEvaluation: {
    maia?: MaiaEvaluation
    stockfish?: StockfishEvaluation
  }
  colorSanMapping: {
    [move: string]: {
      san: string
      color: string
    }
  }
  blunderMeter: {
    blunderMoveChance: number
    okMoveChance: number
    goodMoveChance: number
  }
}

export const Highlight: React.FC<Props> = ({
  blunderMeter,
  moveEvaluation,
  colorSanMapping,
}: Props) => {
  return (
    <div className="grid h-full max-h-full w-full grid-cols-3 flex-col overflow-hidden rounded border-[0.5px] border-white/40 bg-background-1">
      <div className="col-span-1 flex flex-col border-r-[0.5px] border-white/40">
        <div className="flex flex-col gap-1 p-4">
          <p className="text-xl font-semibold">Current Position</p>
          <p className="text-sm text-secondary">
            Maia predicts that Black will play{' '}
            {moveEvaluation?.maia
              ? (colorSanMapping[Object.keys(moveEvaluation.maia.policy)[0]]
                  ?.san ?? Object.keys(moveEvaluation.maia.policy)[0])
              : '...'}{' '}
            next. This is a blunder.
          </p>
        </div>
        <div className="grid grid-cols-2">
          <div className="flex flex-col items-center justify-center bg-human-3/5 py-4">
            <p className="text-sm text-human-2">Maia White Win %</p>
            <p className="text-2xl font-bold text-human-1">
              {moveEvaluation?.maia
                ? `${Math.round(moveEvaluation.maia?.value * 1000) / 10}%`
                : '...'}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center bg-engine-3/5 py-4">
            <p className="text-sm text-engine-2">
              SF Eval
              {moveEvaluation?.stockfish?.depth
                ? ` (D${moveEvaluation.stockfish?.depth})`
                : ''}
            </p>
            <p className="text-2xl font-bold text-engine-1">
              {moveEvaluation?.stockfish
                ? `${moveEvaluation.stockfish.model_optimal_cp / 100 > 0 ? '+' : ''}${moveEvaluation.stockfish.model_optimal_cp / 100}`
                : '...'}
            </p>
          </div>
        </div>
        <div className="flex flex-col p-4">
          <BlunderMeter {...blunderMeter} />
        </div>
      </div>
      <div className="col-span-2 flex flex-col"></div>
    </div>
  )
}
