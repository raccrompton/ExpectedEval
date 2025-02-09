import {
  Cell,
  Label,
  XAxis,
  YAxis,
  Scatter,
  LabelList,
  ScatterChart,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import type { Key } from 'chessground/types'
import type { DrawShape } from 'chessground/draw'
import { ContentType } from 'recharts/types/component/Label'

interface Props {
  moveMap?: { move: string; x: number; y: number }[]
  colorSanMapping: {
    [move: string]: {
      san: string
      color: string
    }
  }

  setHoverArrow: React.Dispatch<React.SetStateAction<DrawShape | null>>
}

export const MoveMap: React.FC<Props> = ({
  moveMap,
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
    <div className="flex h-full max-h-full flex-col overflow-hidden rounded bg-background-1/60">
      <p className="p-4 text-lg text-white">Move Map</p>
      <div className="flex h-full w-full flex-col">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ left: 0, top: 0, right: 30, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3C3C3C" />
            <XAxis
              dataKey="x"
              type="number"
              axisLine={false}
              label={{
                value: 'Maia',
                fill: '#FE7F6D',
                position: 'insideBottom',
                fontSize: 18,
                fontWeight: 600,
                offset: -8,
                dx: -12,
              }}
              tickCount={4}
              tickLine={false}
              tickMargin={0}
              tick={{ fill: 'white', fontSize: 10 }}
              tickFormatter={(value) => `${value}%`}
              domain={([dataMin, dataMax]) => [0, dataMax > 60 ? 100 : 60]}
            >
              <Label
                value="← Unlikely"
                position="insideBottomLeft"
                fill="#BF5F52"
                fontSize={12}
                fontWeight={500}
                dy={10}
                dx={-18}
              />
              <Label
                value="Likely →"
                position="insideBottomRight"
                fontSize={12}
                fill="#BF5F52"
                fontWeight={500}
                dy={10}
                dx={18}
              />
            </XAxis>
            <YAxis
              scale="sqrt"
              dataKey="y"
              type="number"
              axisLine={false}
              domain={[-4, 0]}
              label={{
                value: 'SF Loss',
                fill: '#76ADDD',
                position: 'insideLeft',
                angle: -90,
                fontSize: 16,
                fontWeight: 600,
                dx: 10,
                dy: 48,
              }}
              ticks={[-4, -2, -1, 0]}
              tick={{
                fill: 'white',
                fontSize: 10,
              }}
              tickMargin={0}
              tickLine={false}
            >
              <Label
                value="← Blunders"
                dx={24}
                angle={-90}
                fontSize={12}
                fontWeight={500}
                dy={140}
                position="insideLeft"
                fill="#5A9DD7"
              />
              <Label
                value="Best Moves →"
                fill="#5A9DD7"
                position="insideLeft"
                fontSize={12}
                dx={24}
                angle={-90}
                fontWeight={500}
                dy={-16}
              />
            </YAxis>
            <Scatter name="Moves" data={moveMap}>
              <LabelList
                dataKey="move"
                position="top"
                fontSize={12}
                fill="white"
                content={
                  (({
                    x,
                    y,
                    value,
                    index,
                  }: {
                    x: number
                    y: number
                    value: string
                    index: number
                  }) => {
                    return (
                      <text
                        x={x}
                        y={y}
                        key={index}
                        fontSize={12}
                        textAnchor="middle"
                        dx={x < 100 ? 24 : 0}
                        dy={x < 100 ? 0 : y < 55 ? 24 : -5}
                        fill={colorSanMapping[value].color || '#fff'}
                      >
                        {colorSanMapping[value].san}
                      </text>
                    )
                  }) as ContentType
                }
              />
              {moveMap?.map((entry, index) => (
                <Cell
                  key={`cell-${entry.move}${index}`}
                  fill={colorSanMapping[entry.move].color || '#fff'}
                  onMouseEnter={() => onMouseEnter(entry.move)}
                  onMouseOutCapture={() => {
                    setHoverArrow(null)
                  }}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
