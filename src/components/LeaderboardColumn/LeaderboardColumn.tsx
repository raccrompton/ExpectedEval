import styles from './LeaderboardColumn.module.scss'

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
    <div className={styles.container}>
      <div className={styles.header}>
        {icon}
        <p>{name}</p>
      </div>
      <div className={styles.rankings}>
        {ranking.map((player, index) => (
          <div key={index} className={styles.rank}>
            <div>
              <p>{index + 1}</p>
              <p>
                {player.display_name} {index == 0 && '👑'}
              </p>
            </div>
            <p>{player.elo}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
