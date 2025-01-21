import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

interface Props {
  moves: { [key: string]: number }[] | undefined
}

export const MovesByRating: React.FC<Props> = ({ moves }: Props) => {
  return (
    <div className="col-span-2 flex h-full max-h-full flex-col rounded bg-background-1/60 pb-4">
      <p className="p-4 text-xl text-white">Moves by Rating</p>
      <div className="flex h-full w-full flex-col">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={moves} margin={{ left: 20, right: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3C3C3C" />
            <XAxis
              dataKey="rating"
              axisLine={false}
              tick={{
                fill: 'white',
                fontSize: 14,
              }}
              tickMargin={6}
              ticks={[1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900]}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              axisLine={false}
              domain={[0, 100]}
              tick={{
                fill: 'white',
                fontSize: 14,
              }}
              label={{
                value: 'Maia Probability',
                angle: -90,
                fill: '#ff0000',
                position: 'insideLeft',
                dy: 46,
                offset: 4,
                fontWeight: 600,
                fontSize: 14,
              }}
              tickCount={4}
              tickMargin={5}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              domain={[0, 100]}
              tick={{
                fill: 'white',
                fontSize: 14,
              }}
              tickCount={4}
              tickMargin={5}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            {moves &&
              Object.keys(moves[0]).map((move, i) => {
                if (move === 'rating') {
                  return null
                }
                return (
                  <Area
                    key={i}
                    yAxisId="left"
                    dataKey={move}
                    dot={{
                      stroke: '#fff',
                      strokeWidth: 1,
                    }}
                    stroke={'#fff'}
                    fill={'#fff'}
                    fillOpacity={0.1}
                    strokeWidth={3}
                  />
                )
              })}
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ top: -14, right: 20, fontSize: 14 }}
              iconSize={0}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
