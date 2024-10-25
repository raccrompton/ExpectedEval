import classNames from 'classnames'
import styles from './ModalContainer.module.scss'

interface Props {
  dismiss: () => void
  children: React.ReactNode
  className?: string
}

export const ModalContainer: React.FC<Props> = ({
  children,
  dismiss,
  className,
}: Props) => {
  return (
    // Modal always has dismiss button so not required for a11y
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className={classNames(styles.container, className)} onClick={dismiss}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  )
}
