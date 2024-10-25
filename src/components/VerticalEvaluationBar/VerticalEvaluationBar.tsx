interface Props {
  min?: number
  max?: number
  value?: number
  label?: string
}

import styles from './VerticalEvaluationBar.module.scss'

export const VerticalEvaluationBar: React.FC<Props> = ({
  min = 0,
  max = 1,
  value,
  label,
}: Props) => {
  const height = ((value ?? min - min) / (max - min)) * 100

  return (
    <div className={styles.container}>
      <p className={styles.label}>{label}</p>
      <div className={styles.content} style={{ height: `${height}%` }} />
    </div>
  )
}
