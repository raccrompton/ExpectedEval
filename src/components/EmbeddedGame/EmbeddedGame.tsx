import { useContext } from 'react'
import { ThemeContext } from 'src/contexts'

import styles from './EmbeddedGame.module.scss'

interface Props {
  gameId?: string
}

export const EmbeddedGame: React.FC<Props> = ({
  gameId = 'ATd3XFpl',
}: Props) => {
  const { theme } = useContext(ThemeContext)
  return (
    <div className={styles.container}>
      <h1>Featured Game</h1>
      <div className={styles.frame}>
        <iframe
          title={`Lichess Game: ${gameId}`}
          src={`https://lichess.org/embed/ATd3XFpl?theme=auto&bg=${theme}`}
          frameBorder={0}
        ></iframe>
      </div>
    </div>
  )
}
