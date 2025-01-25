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
          <ScatterChart margin={{ left: -14, top: 0, right: 30, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3C3C3C" />
            <YAxis
              dataKey="y"
              type="number"
              axisLine={false}
              label={{
                value: 'Maia',
                position: 'insideLeft',
                fill: '#FE7F6D',
                angle: -90,
                fontSize: 14,
                fontWeight: 600,
                offset: 26,
                dy: 20,
              }}
              tickCount={4}
              tickLine={false}
              tickMargin={0}
              tick={{ fill: 'white', fontSize: 10 }}
              tickFormatter={(value) => `${value}%`}
              domain={([dataMin, dataMax]) => [0, dataMax > 75 ? 100 : 75]}
            >
              <Label
                value="← Unlikely"
                position="insideBottomLeft"
                offset={32}
                angle={-90}
                fontSize={10}
                fontWeight={500}
                fill="#BF5F52"
                dy={60}
              />
              <Label
                value="Likely →"
                position="insideTopLeft"
                offset={24}
                angle={-90}
                fontSize={10}
                fontWeight={500}
                fill="#BF5F52"
                dy={14}
              />
            </YAxis>
            <XAxis
              scale="sqrt"
              dataKey="x"
              type="number"
              axisLine={false}
              domain={[-4, 0]}
              label={{
                value: 'SF Eval Loss',
                position: 'insideBottom',
                fill: '#76ADDD',
                fontSize: 14,
                fontWeight: 600,
                offset: 0,
                dx: -12,
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
                position="insideLeft"
                fontSize={10}
                fontWeight={500}
                fill="#5A9DD7"
                dy={11}
                offset={-20}
              />
              <Label
                value="Best Moves →"
                position="insideRight"
                fontSize={10}
                fontWeight={500}
                fill="#5A9DD7"
                dy={11}
                offset={-10}
              />
            </XAxis>
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
