import {
  Area,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { ColorSanMapping } from 'src/types'

interface Props {
  moves: { [key: string]: number }[] | undefined
  colorSanMapping: ColorSanMapping
}

export const MovesByRating: React.FC<Props> = ({
  moves,
  colorSanMapping,
}: Props) => {
  const maxValue = moves
    ? Math.max(
        ...moves.flatMap((move) =>
          Object.entries(move)
            .filter(([key]) => key !== 'rating')
            .map(([, value]) => value as number),
        ),
      )
    : 100

  const domainMax = maxValue > 60 ? 100 : 60
  const domain = [0, domainMax]

  return (
    <div className="flex h-full w-full flex-col rounded bg-background-1/60">
      <p className="p-3 text-lg text-white">Moves by Rating</p>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={moves} margin={{ left: 0, right: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3C3C3C" />
          <XAxis
            dataKey="rating"
            axisLine={false}
            tick={{
              fill: 'white',
              fontSize: 10,
            }}
            tickMargin={4}
            ticks={[1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900]}
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            axisLine={false}
            domain={domain}
            tick={{
              fill: 'white',
              fontSize: 10,
            }}
            label={{
              value: 'Maia Probability',
              angle: -90,
              fill: '#FE7F6D',
              position: 'insideLeft',
              dy: 46,
              offset: 20,
              fontWeight: 600,
              fontSize: 14,
            }}
            tickCount={5}
            tickMargin={2}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            axisLine={false}
            domain={domain}
            tick={{
              fill: 'white',
              fontSize: 10,
            }}
            tickCount={5}
            tickMargin={2}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <defs>
            {moves &&
              Object.keys(moves[0]).map((move, i) => {
                if (move === 'rating') {
                  return null
                }
                return (
                  <linearGradient
                    key={`color${move}`}
                    id={`color${move}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={colorSanMapping[move]?.color ?? '#fff'}
                      stopOpacity={0.5}
                    />
                    <stop
                      offset="95%"
                      stopColor={colorSanMapping[move]?.color ?? '#fff'}
                      stopOpacity={0}
                    />
                  </linearGradient>
                )
              })}
          </defs>
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
                    r: 3,
                    stroke: colorSanMapping[move]?.color ?? '#fff',
                    strokeWidth: 3,
                  }}
                  stroke={colorSanMapping[move]?.color ?? '#fff'}
                  fill={`url(#color${move})`}
                  strokeWidth={3}
                  animationDuration={300}
                />
              )
            })}
          <Tooltip
            content={({ payload }) => {
              return (
                <div className="flex w-32 flex-col rounded border border-white/10 bg-background-1 pb-2">
                  <div className="flex px-3 py-2">
                    {payload ? (
                      <p className="text-sm">{payload[0]?.payload.rating}</p>
                    ) : null}
                  </div>
                  {payload?.map((point) => {
                    const san =
                      colorSanMapping[point.name as string]?.san ?? point.name
                    const prob = Math.round((point.value as number) * 10) / 10
                    return (
                      <div
                        key={san}
                        className="flex items-center justify-between px-3"
                      >
                        <p
                          style={{
                            color:
                              colorSanMapping[point.name as string]?.color ??
                              '#fff',
                          }}
                          className="text-xs"
                        >
                          {san}
                        </p>
                        <p
                          style={{
                            color:
                              colorSanMapping[point.name as string]?.color ??
                              '#fff',
                          }}
                          className="font-mono text-xs"
                        >
                          {prob}%
                        </p>
                      </div>
                    )
                  })}
                </div>
              )
            }}
          />
          <Legend
            align="right"
            verticalAlign="top"
            wrapperStyle={{ top: -14, right: 20, fontSize: 14 }}
            iconSize={0}
            formatter={(value) => {
              return colorSanMapping[value as string]?.san ?? value
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
