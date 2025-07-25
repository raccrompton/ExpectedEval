import React, { useEffect } from 'react'
import { motion } from 'framer-motion'

interface Props {
  isActive: boolean
}

export const AnalysisOverlay: React.FC<Props> = ({ isActive }) => {
  useEffect(() => {
    if (isActive) {
      // More aggressive scroll prevention
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.documentElement.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.documentElement.style.overflow = ''
    }
  }, [isActive])

  if (!isActive) return null

  return (
    <motion.div
      className="fixed inset-0 z-20 bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      data-testid="analysis-overlay"
      style={{ pointerEvents: 'auto' }}
    />
  )
}
