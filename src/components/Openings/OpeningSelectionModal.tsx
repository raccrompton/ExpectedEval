import React, { useState, useMemo } from 'react'
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
  const [searchTerm, setSearchTerm] = useState('')

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
      id: `${previewOpening.id}-${previewVariation?.id || 'main'}-${selectedColor}-${selectedMaiaVersion.id}`,
      opening: previewOpening,
      variation: previewVariation,
      playerColor: selectedColor,
      maiaVersion: selectedMaiaVersion.id,
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
      id: `${opening.id}-${variation?.id || 'main'}-${selectedColor}-${selectedMaiaVersion.id}`,
      opening,
      variation,
      playerColor: selectedColor,
      maiaVersion: selectedMaiaVersion.id,
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
        className="relative flex h-[90vh] max-h-[800px] w-[98vw] max-w-[1400px] rounded-lg bg-background-1 shadow-2xl"
      >
        {/* Close Button - Top Right of Modal */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 text-secondary transition-colors hover:text-primary"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Left Panel - Opening Selection */}
        <div className="flex w-1/3 flex-col border-r border-white/10">
          <div className="flex h-20 flex-col justify-center border-b border-white/10 p-4">
            <h2 className="text-xl font-bold">Select Openings</h2>
            <p className="mt-1 text-xs text-secondary">
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
            className="red-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto p-4"
            style={{ userSelect: 'none' }}
          >
            {filteredOpenings.map((opening) => (
              <div key={opening.id} className="flex flex-col">
                <div
                  role="button"
                  tabIndex={0}
                  className={`mb-2 cursor-pointer rounded p-3 transition-colors ${
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
                    className={`ml-4 cursor-pointer rounded p-2 transition-colors ${
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
                      <p className="text-sm text-secondary">{variation.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel - Preview */}
        <div className="flex w-1/3 flex-col">
          <div className="flex h-20 flex-col justify-center border-b border-white/10 p-4">
            <h3 className="text-lg font-semibold">{previewOpening.name}</h3>
            {previewVariation && (
              <p className="text-sm text-secondary">{previewVariation.name}</p>
            )}
          </div>

          <div className="flex flex-1 items-center justify-center p-4">
            <div className="aspect-square w-full max-w-sm">
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
                  <span className="material-symbols-outlined">chess</span>
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
                  <span className="material-symbols-outlined">chess</span>
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

            <button
              onClick={addSelection}
              disabled={isDuplicateSelection(previewOpening, previewVariation)}
              className="w-full rounded bg-human-4 py-2 text-sm font-medium transition-colors hover:bg-human-4/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDuplicateSelection(previewOpening, previewVariation)
                ? 'Already Added with Same Settings'
                : 'Add to Drill'}
            </button>
          </div>
        </div>

        {/* Right Panel - Selected Openings */}
        <div className="flex w-1/3 flex-col border-l border-white/10">
          <div className="flex h-20 flex-col justify-center border-b border-white/10 p-4">
            <h3 className="text-lg font-semibold">
              Selected Openings ({selections.length})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selections.length === 0 ? (
              <p className="text-center text-secondary">
                No openings selected yet. Choose openings from the left to start
                drilling.
              </p>
            ) : (
              <div className="flex flex-col">
                {selections.map((selection) => (
                  <div
                    key={selection.id}
                    className="flex cursor-pointer items-center justify-between border-b border-white/5 p-3 transition-colors hover:bg-human-2/10"
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
                              <>
                                <span className="truncate">
                                  {selection.variation.name}
                                </span>
                                <span>•</span>
                              </>
                            )}
                            <span>
                              v. Maia{' '}
                              {selection.maiaVersion.replace('maia_kdd_', '')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeSelection(selection.id)}
                      className="ml-2 text-secondary transition-colors hover:text-human-4"
                    >
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
      </motion.div>
    </ModalContainer>
  )
}
