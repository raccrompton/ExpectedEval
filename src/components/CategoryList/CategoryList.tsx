import styles from './CategoryList.module.scss'

export const CategoryList: React.FC = () => {
  return (
    <div className={styles.container}>
      <h2>Replay Tricky Scenarios</h2>
      <div className={styles.items}>
        <div className={styles.item}>
          <div></div>
          <h5>Openings</h5>
        </div>
        <div className={styles.item}>
          <div></div>
          <h5>Forks</h5>
        </div>
      </div>
    </div>
  )
}
