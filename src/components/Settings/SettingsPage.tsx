import React from 'react'
import { motion } from 'framer-motion'
import { SoundSettings } from './SoundSettings'
import { ChessboardSettings } from './ChessboardSettings'
import { MaiaModelSettings } from './MaiaModelSettings'

export const SettingsPage: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.2,
        staggerChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 4 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.25,
        ease: [0.25, 0.46, 0.45, 0.94],
        type: 'tween',
      },
    },
    exit: {
      opacity: 0,
      y: -4,
      transition: {
        duration: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94],
        type: 'tween',
      },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{ willChange: 'transform, opacity' }}
      className="mx-auto flex h-full w-[90%] max-w-4xl flex-col gap-6 py-6 md:py-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl">settings</span>
          <h1 className="text-3xl font-semibold">Settings</h1>
        </div>
        <p className="text-secondary">
          Customize your Maia Chess experience. All settings are saved locally
          in your browser.
        </p>
      </motion.div>

      {/* Settings Sections */}
      <div className="flex flex-col gap-6">
        <motion.div variants={itemVariants}>
          <SoundSettings />
        </motion.div>

        <motion.div variants={itemVariants}>
          <ChessboardSettings />
        </motion.div>

        <motion.div variants={itemVariants}>
          <MaiaModelSettings />
        </motion.div>
      </div>
    </motion.div>
  )
}
