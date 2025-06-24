import React, { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import Chessground from '@react-chess/chessground'
import { Opening, OpeningVariation, OpeningSelection } from 'src/types'
import { ModalContainer } from '../Misc/ModalContainer'

const MAIA_VERSIONS = [
  { id: 'maia_kdd_1100', name: 'Maia 1100' },
  { id: 'maia_kdd_1200', name: 'Maia 1200' },
  { id: 'maia_kdd_1300', name: 'Maia 1300' },
  { id: 'maia_kdd_1400', name: 'Maia 1400' },
  { id: 'maia_kdd_1500', name: 'Maia 1500' },
  { id: 'maia_kdd_1600', name: 'Maia 1600' },
  { id: 'maia_kdd_1700', name: 'Maia 1700' },
  { id: 'maia_kdd_1800', name: 'Maia 1800' },
  { id: 'maia_kdd_1900', name: 'Maia 1900' },
]

interface Props {
  openings: Opening[]
  initialSelections?: OpeningSelection[]
  onComplete: (selections: OpeningSelection[]) => void
  onClose: () => void
}

export const OpeningSelectionModal: React.FC<Props> = ({
  openings,
  initialSelections = [],
  onComplete,
  onClose,
}) => {
  const [selections, setSelections] =
    useState<OpeningSelection[]>(initialSelections)
  const [previewOpening, setPreviewOpening] = useState<Opening>(openings[0])
  const [previewVariation, setPreviewVariation] =
    useState<OpeningVariation | null>(null)
  const [selectedMaiaVersion, setSelectedMaiaVersion] = useState(
    MAIA_VERSIONS[4],
  ) // Default to 1500
  const [selectedColor, setSelectedColor] = useState<'white' | 'black'>('white')
  const [targetMoveNumber, setTargetMoveNumber] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const previewFen = useMemo(() => {
    return previewVariation ? previewVariation.fen : previewOpening.fen
  }, [previewOpening, previewVariation])

  const filteredOpenings = useMemo(() => {
    if (!searchTerm) return openings
    return openings.filter(
      (opening) =>
        opening.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opening.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opening.variations.some((variation) =>
          variation.name.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
    )
  }, [openings, searchTerm])

  const isDuplicateSelection = (
    opening: Opening,
    variation: OpeningVariation | null,
  ) => {
    return selections.some(
      (s) =>
        s.opening.id === opening.id &&
        s.variation?.id === variation?.id &&
        s.playerColor === selectedColor &&
        s.maiaVersion === selectedMaiaVersion.id,
    )
  }

  const addSelection = () => {
    if (isDuplicateSelection(previewOpening, previewVariation)) return

    const newSelection: OpeningSelection = {
      id: `${previewOpening.id}-${previewVariation?.id || 'main'}-${selectedColor}-${selectedMaiaVersion.id}-${targetMoveNumber}`,
      opening: previewOpening,
      variation: previewVariation,
      playerColor: selectedColor,
      maiaVersion: selectedMaiaVersion.id,
      targetMoveNumber,
    }

    setSelections([...selections, newSelection])
  }

  const removeSelection = (selectionId: string) => {
    setSelections(selections.filter((s) => s.id !== selectionId))
  }

  const addQuickSelection = (
    opening: Opening,
    variation: OpeningVariation | null,
  ) => {
    if (isDuplicateSelection(opening, variation)) return

    const newSelection: OpeningSelection = {
      id: `${opening.id}-${variation?.id || 'main'}-${selectedColor}-${selectedMaiaVersion.id}-${targetMoveNumber}`,
      opening,
      variation,
      playerColor: selectedColor,
      maiaVersion: selectedMaiaVersion.id,
      targetMoveNumber,
    }

    setSelections([...selections, newSelection])
    // Also update the preview to show what was just added
    setPreviewOpening(opening)
    setPreviewVariation(variation)
  }

  const handleStartDrilling = () => {
    if (selections.length > 0) {
      onComplete(selections)
    }
  }

  return (
    <ModalContainer dismiss={onClose}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative flex h-[90vh] max-h-[900px] w-[98vw] max-w-[1400px] flex-col items-start justify-start overflow-hidden rounded-lg bg-background-1 shadow-2xl"
      >
        {/* Close Button - Top Right of Modal */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 text-secondary transition-colors hover:text-primary"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Header Section */}
        <div className="flex w-full flex-col gap-1 border-b border-white/10 p-4">
          <h1 className="text-2xl font-bold text-primary">Opening Drills</h1>
          <p className="text-sm text-secondary">
            Practice openings against Maia. Select openings to drill, choose
            your color and opponent strength.
          </p>
        </div>

        {/* Main Content - Three Panel Layout */}
        <div className="grid grid-cols-3 overflow-y-auto">
          {/* Left Panel - Opening Selection */}
          <div className="flex w-full flex-col overflow-y-scroll border-r border-white/10">
            <div className="flex h-20 flex-col justify-center gap-1 border-b border-white/10 p-4">
              <h2 className="text-xl font-bold">Select Openings</h2>
              <p className="text-xs text-secondary">
                Double-click any opening to quickly add it
              </p>
            </div>

            {/* Search Bar */}
            <div className="border-b border-white/10 p-4">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-secondary">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search openings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded bg-background-2 py-2 pl-10 pr-4 text-sm text-primary placeholder-secondary focus:outline-none focus:ring-1 focus:ring-human-4"
                />
              </div>
            </div>

            <div
              className="red-scrollbar flex flex-1 flex-col overflow-y-auto"
              style={{ userSelect: 'none' }}
            >
              {filteredOpenings.map((opening) => (
                <div key={opening.id} className="flex flex-col">
                  <div
                    role="button"
                    tabIndex={0}
                    className={`mb-1 cursor-pointer p-4 transition-colors ${
                      previewOpening.id === opening.id && !previewVariation
                        ? 'bg-human-2/20'
                        : 'hover:bg-human-2/10'
                    }`}
                    onClick={() => {
                      setPreviewOpening(opening)
                      setPreviewVariation(null)
                    }}
                    onDoubleClick={() => {
                      addQuickSelection(opening, null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setPreviewOpening(opening)
                        setPreviewVariation(null)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{opening.name}</h3>
                        <p className="text-sm text-secondary">
                          {opening.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  {opening.variations.map((variation) => (
                    <div
                      key={variation.id}
                      role="button"
                      tabIndex={0}
                      className={`cursor-pointer px-6 py-1 transition-colors ${
                        previewOpening.id === opening.id &&
                        previewVariation?.id === variation.id
                          ? 'bg-human-2/20'
                          : 'hover:bg-human-2/10'
                      }`}
                      onClick={() => {
                        setPreviewOpening(opening)
                        setPreviewVariation(variation)
                      }}
                      onDoubleClick={() => {
                        addQuickSelection(opening, variation)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setPreviewOpening(opening)
                          setPreviewVariation(variation)
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-secondary">
                          {variation.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Center Panel - Preview */}
          <div className="flex w-full flex-col">
            <div className="flex h-20 flex-col justify-center gap-1 border-b border-white/10 p-4">
              <h2 className="text-xl font-bold">{previewOpening.name}</h2>
              <p className="text-xs text-secondary">
                {previewVariation && `${previewVariation.name} →`} Configure
                your drill settings
              </p>
            </div>

            <div className="flex flex-1 items-center justify-center p-4">
              <div className="aspect-square w-full max-w-[300px]">
                <Chessground
                  contained
                  config={{
                    viewOnly: true,
                    fen: previewFen,
                    coordinates: true,
                    animation: { enabled: true, duration: 200 },
                  }}
                />
              </div>
            </div>

            {/* Selection Controls */}
            <div className="flex flex-col gap-4 border-t border-white/10 p-4">
              {/* Color Selection */}
              <div>
                <p className="mb-2 text-sm font-medium">Play as:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedColor('white')}
                    className={`flex items-center gap-2 rounded px-3 py-2 transition-colors ${
                      selectedColor === 'white'
                        ? 'bg-human-4 text-white'
                        : 'bg-background-2 hover:bg-background-3'
                    }`}
                  >
                    <div className="relative h-5 w-5">
                      <Image
                        src="/assets/pieces/white king.svg"
                        fill={true}
                        alt="white king"
                      />
                    </div>
                    White
                  </button>
                  <button
                    onClick={() => setSelectedColor('black')}
                    className={`flex items-center gap-2 rounded px-3 py-2 transition-colors ${
                      selectedColor === 'black'
                        ? 'bg-human-4 text-white'
                        : 'bg-background-2 hover:bg-background-3'
                    }`}
                  >
                    <div className="relative h-5 w-5">
                      <Image
                        src="/assets/pieces/black king.svg"
                        fill={true}
                        alt="black king"
                      />
                    </div>
                    Black
                  </button>
                </div>
              </div>

              {/* Maia Version Selection */}
              <div>
                <p className="mb-2 text-sm font-medium">Opponent:</p>
                <select
                  value={selectedMaiaVersion.id}
                  onChange={(e) => {
                    const version = MAIA_VERSIONS.find(
                      (v) => v.id === e.target.value,
                    )
                    if (version) {
                      setSelectedMaiaVersion(version)
                    }
                  }}
                  className="w-full rounded bg-background-2 p-2 text-sm focus:outline-none"
                >
                  {MAIA_VERSIONS.map((version) => (
                    <option key={version.id} value={version.id}>
                      {version.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Move Count Configuration */}
              <div>
                <p className="mb-2 text-sm font-medium">
                  Target Move Count: {targetMoveNumber}
                </p>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={targetMoveNumber}
                  onChange={(e) =>
                    setTargetMoveNumber(parseInt(e.target.value) || 10)
                  }
                  className="w-full accent-human-4"
                />
                <div className="mt-1 flex justify-between text-xs text-secondary">
                  <span>5</span>
                  <span>30</span>
                </div>
                <p className="mt-1 text-xs text-secondary">
                  How many moves you want to play in this opening
                </p>
              </div>

              <button
                onClick={addSelection}
                disabled={isDuplicateSelection(
                  previewOpening,
                  previewVariation,
                )}
                className="w-full rounded bg-human-4 py-2 text-sm font-medium transition-colors hover:bg-human-4/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDuplicateSelection(previewOpening, previewVariation)
                  ? 'Already Added with Same Settings'
                  : 'Add to Drill'}
              </button>
            </div>
          </div>

          {/* Right Panel - Selected Openings */}
          <div className="flex w-full flex-col overflow-y-scroll border-l border-white/10">
            <div className="flex h-20 flex-col justify-center gap-1 border-b border-white/10 p-4">
              <h2 className="text-xl font-bold">
                Selected Openings ({selections.length})
              </h2>
              <p className="text-xs text-secondary">
                Click to remove an opening
              </p>
            </div>
            <div className="red-scrollbar flex flex-1 flex-col items-center justify-start overflow-y-auto">
              {selections.length === 0 ? (
                <p className="my-auto max-w-xs text-center text-secondary">
                  No openings selected yet. Choose openings from the left to
                  start drilling.
                </p>
              ) : (
                <div className="flex w-full flex-col">
                  {selections.map((selection) => (
                    <div
                      tabIndex={0}
                      role="button"
                      key={selection.id}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          removeSelection(selection.id)
                        }
                      }}
                      onClick={() => removeSelection(selection.id)}
                      className="group flex cursor-pointer items-center justify-between border-b border-white/5 p-4 transition-colors hover:bg-human-2/10"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="relative h-5 w-5 flex-shrink-0">
                            <Image
                              src={
                                selection.playerColor === 'white'
                                  ? '/assets/pieces/white king.svg'
                                  : '/assets/pieces/black king.svg'
                              }
                              fill={true}
                              alt={`${selection.playerColor} king`}
                            />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-medium text-primary">
                              {selection.opening.name}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-secondary">
                              {selection.variation && (
                                <span className="truncate">
                                  {selection.variation.name} •
                                </span>
                              )}
                              <span>
                                v. Maia{' '}
                                {selection.maiaVersion.replace('maia_kdd_', '')}{' '}
                                •
                              </span>
                              <span>{selection.targetMoveNumber} moves</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button className="ml-2 text-secondary transition-colors group-hover:text-human-4">
                        <span className="material-symbols-outlined text-sm">
                          close
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4">
              <button
                onClick={handleStartDrilling}
                disabled={selections.length === 0}
                className="w-full rounded bg-human-4 py-2 text-sm font-medium transition-colors hover:bg-human-4/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start Drilling ({selections.length} opening
                {selections.length !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </ModalContainer>
  )
}
