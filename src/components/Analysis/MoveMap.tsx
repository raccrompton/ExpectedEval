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
import { ColorSanMapping } from 'src/types'
import type { Key } from 'chessground/types'
import type { DrawShape } from 'chessground/draw'
import { ContentType } from 'recharts/types/component/Label'

interface Props {
  moveMap?: { move: string; x: number; y: number }[]
  colorSanMapping: ColorSanMapping

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
    <div className="flex h-64 max-h-full flex-col overflow-hidden rounded bg-background-1/60 md:h-full">
      <p className="p-3 text-primary md:text-lg">Move Map</p>
      <div className="flex h-full w-full flex-col">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ left: 0, top: 5, right: 30, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3C3C3C" />
            <XAxis
              dataKey="x"
              type="number"
              axisLine={false}
              label={{
                value: 'SF Loss',
                fill: '#76ADDD',
                position: 'insideBottom',
                fontSize: 18,
                fontWeight: 600,
                offset: -8,
                dx: -12,
              }}
              tickCount={5}
              tickLine={false}
              tickMargin={0}
              tick={{ fill: 'white', fontSize: 11 }}
              domain={[-4, 0]}
              ticks={[-4, -3, -2, -1, 0]}
            >
              <Label
                value="← Blunders"
                position="insideBottomLeft"
                fill="#5A9DD7"
                fontSize={12}
                fontWeight={500}
                dy={10}
                dx={-18}
              />
              <Label
                value="Best Moves →"
                position="insideBottomRight"
                fontSize={12}
                fill="#5A9DD7"
                fontWeight={500}
                dy={10}
                dx={18}
              />
            </XAxis>
            <YAxis
              dataKey="y"
              type="number"
              axisLine={false}
              label={{
                value: 'Maia',
                fill: '#FE7F6D',
                position: 'insideLeft',
                angle: -90,
                fontSize: 16,
                fontWeight: 600,
                dx: 10,
                dy: 32,
              }}
              tickCount={4}
              tick={{
                fill: 'white',
                fontSize: 11,
              }}
              tickMargin={0}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
              domain={([dataMin, dataMax]) => [0, dataMax > 60 ? 100 : 60]}
            >
              <Label
                value="← Unlikely"
                dx={10}
                angle={-90}
                fontSize={12}
                fontWeight={500}
                dy={140}
                position="insideLeft"
                fill="#BF5F52"
              />
              <Label
                value="Likely →"
                fill="#BF5F52"
                position="insideLeft"
                fontSize={12}
                dx={10}
                angle={-90}
                fontWeight={500}
                dy={-56}
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
                        dx={x < 100 ? 22 : -15}
                        dy={8}
                        fill={colorSanMapping[value]?.color ?? '#fff'}
                      >
                        {colorSanMapping[value]?.san ?? value}
                      </text>
                    )
                  }) as ContentType
                }
              />
              {moveMap?.map((entry, index) => (
                <Cell
                  key={`cell-${entry.move}${index}`}
                  fill={colorSanMapping[entry.move]?.color ?? '#fff'}
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
