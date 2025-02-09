import { ColorSanMapping } from 'src/types'
import type { Key } from 'chessground/types'
import type { DrawShape } from 'chessground/draw'

interface Props {
  recommendations: {
    maia?: { move: string; prob: number }[]
    stockfish?: { move: string; cp: number }[]
  }
  colorSanMapping: ColorSanMapping

  setHoverArrow: React.Dispatch<React.SetStateAction<DrawShape | null>>
}

export const MoveRecommendations: React.FC<Props> = ({
  recommendations,
  colorSanMapping,
  setHoverArrow,
}: Props) => {
  const onMouseEnter = (move: string) => {
    setHoverArrow({
      orig: move.slice(0, 2) as Key,
      dest: move.slice(2, 4) as Key,
      brush: 'green',
      modifiers: {
        lineWidth: 10,
      },
    })
  }

  return (
    <div className="grid h-full max-h-full min-w-[40%] grid-rows-2 flex-col overflow-hidden rounded">
      <div className="flex flex-col gap-2 bg-background-1 p-3">
        <p className="text-sm text-white">Maia 1800 Predictions</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs font-extralight text-secondary/60">
              move
            </p>
            <p className="font-mono text-xs font-extralight text-secondary/60">
              %
            </p>
          </div>
          {recommendations.maia?.map(({ move, prob }, index) => {
            return (
              <div
                key={index}
                className="flex items-center justify-between"
                style={{
                  color: colorSanMapping[move]?.color ?? '#fff',
                }}
              >
                <p
                  className="cursor-default font-mono text-xs hover:underline"
                  onMouseEnter={() => onMouseEnter(move)}
                  onMouseOutCapture={() => setHoverArrow(null)}
                >
                  {colorSanMapping[move]?.san ?? move}
                </p>
                <p className="font-mono text-xs">
                  {Math.round(prob * 1000) / 10}%
                </p>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex flex-col gap-2 bg-background-1/60 p-3">
        <p className="text-sm text-white">Stockfish Moves</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs font-extralight text-secondary/60">
              move
            </p>
            <p className="font-mono text-xs font-extralight text-secondary/60">
              eval
            </p>
          </div>
          {recommendations.stockfish?.map(({ move, cp }, index) => (
            <div
              key={index}
              className="flex items-center justify-between"
              style={{
                color: colorSanMapping[move]?.color ?? '#fff',
              }}
            >
              <p
                className="cursor-default font-mono text-xs hover:underline"
                onMouseEnter={() => onMouseEnter(move)}
                onMouseOutCapture={() => setHoverArrow(null)}
              >
                {colorSanMapping[move].san}
              </p>
              <p className="font-mono text-xs">
                {cp > 0 ? '+' : null}
                {cp / 100}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
