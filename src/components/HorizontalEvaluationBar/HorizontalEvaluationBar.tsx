import styles from './HorizontalEvaluationBar.module.scss'

interface Props {
  min?: number
  max?: number
  value?: number
  label?: string
}

export const HorizontalEvaluationBar: React.FC<Props> = ({
  min = 0,
  max = 1,
  value,
  label,
}: Props) => {
  let width = (((value ?? min) - min) / (max - min)) * 100
  width = Math.max(0, Math.min(100, width))

  return (
    <div className={styles.container}>
      <p className={styles.label}>{label}</p>
      <div className={styles.content} style={{ width: `${width}%` }} />
    </div>
  )
}
