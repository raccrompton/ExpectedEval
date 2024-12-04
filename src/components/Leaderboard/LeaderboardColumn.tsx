import Link from 'next/link'

interface Props {
  icon: JSX.Element
  name: string
  ranking: {
    display_name: string
    elo: number
  }[]
}

export const LeaderboardColumn: React.FC<Props> = ({
  icon,
  name,
  ranking,
}: Props) => {
  return (
    <div className="flex flex-col">
      <div className="flex flex-row items-center justify-start gap-3 bg-background-2 px-6 py-4">
        <i className="*:h-6 *:w-6">{icon}</i>
        <h2 className="text-2xl font-bold uppercase">{name}</h2>
      </div>
      <div className="flex w-full flex-col">
        {ranking.map((player, index) => (
          <div
            key={index}
            className={`flex w-full items-center justify-between px-6 py-2 ${index % 2 === 0 ? 'bg-background-1/90' : 'bg-background-1/50'}`}
          >
            <div className="flex items-center gap-2">
              <p className="w-5">{index + 1}</p>
              <Link
                href={`/profile/${player.display_name}`}
                className="flex items-center gap-2 hover:underline"
              >
                <p>
                  {player.display_name} {index == 0 && '👑'}
                </p>
              </Link>
            </div>

            <p>{player.elo}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
