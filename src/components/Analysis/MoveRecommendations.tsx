import type { Key } from 'chessground/types'
import type { DrawShape } from 'chessground/draw'

interface Props {
  recommendations: {
    maia?: { move: string; prob: number }[]
    stockfish?: { move: string; cp: number }[]
  }
  colorSanMapping: {
    [move: string]: {
      san: string
      color: string
    }
  }

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
    <div className="col-span-2 grid h-full max-h-full grid-cols-2 flex-col overflow-hidden rounded">
      <div className="flex flex-col gap-2 bg-background-1 p-5">
        <p className="text-lg text-white">Maia 1800 Predictions</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="font-mono text-sm font-extralight text-secondary/60">
              move
            </p>
            <p className="font-mono text-sm font-extralight text-secondary/60">
              %
            </p>
          </div>
          {recommendations.maia?.map(({ move, prob }, index) => (
            <div
              key={index}
              className="flex items-center justify-between"
              style={{
                color: colorSanMapping[move].color,
              }}
            >
              <p
                className="cursor-default font-mono hover:underline"
                onMouseEnter={() => onMouseEnter(move)}
                onMouseOutCapture={() => setHoverArrow(null)}
              >
                {colorSanMapping[move].san}
              </p>
              <p className="font-mono text-sm">
                {Math.round(prob * 1000) / 10}%
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2 bg-background-1/60 p-5">
        <p className="text-lg text-white">Stockfish Moves</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="font-mono text-sm font-extralight text-secondary/60">
              move
            </p>
            <p className="font-mono text-sm font-extralight text-secondary/60">
              eval
            </p>
          </div>
          {recommendations.stockfish?.map(({ move, cp }, index) => (
            <div
              key={index}
              className="flex items-center justify-between"
              style={{
                color: colorSanMapping[move].color,
              }}
            >
              <p
                className="cursor-default font-mono hover:underline"
                onMouseEnter={() => onMouseEnter(move)}
                onMouseOutCapture={() => setHoverArrow(null)}
              >
                {colorSanMapping[move].san}
              </p>
              <p className="font-mono text-sm">{cp / 100}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
