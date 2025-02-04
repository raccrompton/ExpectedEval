import { motion } from 'framer-motion'

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
    (<motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      onClick={dismiss}
      className={`fixed bottom-0 top-0 z-[100] flex w-screen items-center justify-center bg-backdrop/90 text-primary ${className}`}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.2, type: 'tween' }}
        className="max-w-[100vw] rounded bg-backdrop p-8"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>)
  );
}
