import React, { useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (depth: number) => void
  initialDepth?: number
}

export const AnalysisConfigModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  initialDepth = 15,
}) => {
  const [selectedDepth, setSelectedDepth] = useState(initialDepth)

  const depthOptions = [
    {
      value: 12,
      label: 'Fast (d12)',
      description: 'Quick surface-level analysis',
    },
    {
      value: 15,
      label: 'Balanced (d15)',
      description: 'Deeper analysis with good speed',
    },
    {
      value: 18,
      label: 'Deep (d18)',
      description: 'Thorough analysis with slower speed',
    },
  ]

  const handleConfirm = () => {
    onConfirm(selectedDepth)
    onClose()
  }

  if (!isOpen) return null

  return (
    <motion.div
      className="absolute left-0 top-0 z-20 flex h-screen w-screen flex-col items-center justify-center bg-black/70 px-4 backdrop-blur-sm md:px-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      data-testid="analysis-config-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        className="flex w-full flex-col gap-4 rounded-md border border-white/10 bg-background-1 p-5 md:w-[min(500px,40vw)] md:p-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-2xl text-human-3">
            network_intelligence
          </span>
          <h2 className="text-xl font-semibold">Analyze Entire Game</h2>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm text-primary/80">
            Choose the Stockfish analysis depth for all positions in the game:
          </p>

          <div className="flex flex-col gap-2">
            {depthOptions.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded border p-3 transition duration-200 ${
                  selectedDepth === option.value
                    ? 'border-human-4 bg-human-4/10'
                    : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
                htmlFor={`depth-${option.value}`}
                aria-label={`Select ${option.label}`}
              >
                <input
                  type="radio"
                  name="depth"
                  id={`depth-${option.value}`}
                  value={option.value}
                  checked={selectedDepth === option.value}
                  onChange={(e) => setSelectedDepth(Number(e.target.value))}
                  className="h-4 w-4 text-human-4"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-secondary">
                    {option.description}
                  </span>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-2 flex items-start gap-2 rounded bg-background-2/60 p-3">
            <span className="material-symbols-outlined !text-base text-secondary">
              info
            </span>
            <p className="text-xs text-secondary">
              Higher depths provide more accurate analysis but take longer to
              complete. You can cancel the analysis at any time. Currently,
              analysis only persists until you close the tab, but we are working
              on a persistent analysis feature!
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex h-9 items-center gap-1 rounded bg-background-2 px-4 text-sm transition duration-200 hover:bg-background-3"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex h-9 items-center gap-1 rounded bg-human-4 px-4 text-sm font-medium text-white transition duration-200 hover:bg-human-4/90"
          >
            <span className="material-symbols-outlined text-sm">
              play_arrow
            </span>
            Start Analysis
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
