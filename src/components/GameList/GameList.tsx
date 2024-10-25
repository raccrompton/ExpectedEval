import styles from './GameList.module.scss'

export const GameList: React.FC = () => {
  return (
    <div className={styles.container}>
      <h2>Replay Recent Tricky Positions</h2>
      <table>
        <thead>
          <tr>
            <th>variant</th>
            <th>result</th>
            <th>you</th>
            <th>opponent</th>
            <th>opening</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Bullet 1 + 0</td>
            <td>Won on time</td>
            <td>MagnusCarlsen</td>
            <td>AshtonAnderson132</td>
            <td>1. e4 c5 2. Nc3 Nc6 3. f4 g6</td>
          </tr>
          <tr>
            <td>Bullet 1 + 0</td>
            <td>Won on time</td>
            <td>MagnusCarlsen</td>
            <td>AshtonAnderson132</td>
            <td>1. e4 c5 2. Nc3 Nc6 3. f4 g6</td>
          </tr>
          <tr>
            <td>Bullet 1 + 0</td>
            <td>Won on time</td>
            <td>MagnusCarlsen</td>
            <td>AshtonAnderson132</td>
            <td>1. e4 c5 2. Nc3 Nc6 3. f4 g6</td>
          </tr>
          <tr>
            <td>Bullet 1 + 0</td>
            <td>Won on time</td>
            <td>MagnusCarlsen</td>
            <td>AshtonAnderson132</td>
            <td>1. e4 c5 2. Nc3 Nc6 3. f4 g6</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
