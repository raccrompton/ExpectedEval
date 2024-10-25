import styles from './Tooltip.module.scss'

interface Props {
  children?: React.ReactNode
  text: string
}

export const Tooltip: React.FC<Props> = ({ children, text }: Props) => {
  return (
    <div className={styles.tooltip}>
      {children}
      <span className={styles.text}>{text}</span>
    </div>
  )
}
