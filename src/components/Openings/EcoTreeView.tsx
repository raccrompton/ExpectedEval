import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  EcoOpening,
  EcoOpeningVariation,
  EcoSection,
  PopularOpening,
} from 'src/types'

interface EcoTreeViewProps {
  sections: EcoSection[]
  popularOpenings: PopularOpening[]
  onOpeningClick: (opening: EcoOpening, variation?: EcoOpeningVariation) => void
  onQuickAdd: (opening: EcoOpening, variation?: EcoOpeningVariation) => void
  isSelected: (opening: EcoOpening, variation?: EcoOpeningVariation) => boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
}

const EcoTreeView: React.FC<EcoTreeViewProps> = ({
  sections,
  popularOpenings,
  onOpeningClick,
  onQuickAdd,
  isSelected,
  searchTerm,
  setSearchTerm,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  )
  const [expandedOpenings, setExpandedOpenings] = useState<Set<string>>(
    new Set(),
  )
  const [showPopular, setShowPopular] = useState(true)

  const toggleSection = (sectionCode: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionCode)) {
      newExpanded.delete(sectionCode)
    } else {
      newExpanded.add(sectionCode)
    }
    setExpandedSections(newExpanded)
  }

  const toggleOpening = (openingId: string) => {
    const newExpanded = new Set(expandedOpenings)
    if (newExpanded.has(openingId)) {
      newExpanded.delete(openingId)
    } else {
      newExpanded.add(openingId)
    }
    setExpandedOpenings(newExpanded)
  }

  const filteredSections = useMemo(() => {
    if (!searchTerm) return sections

    return sections
      .map((section) => ({
        ...section,
        openings: section.openings.filter(
          (opening) =>
            opening.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            opening.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            opening.eco.toLowerCase().includes(searchTerm.toLowerCase()) ||
            opening.variations.some((variation) =>
              variation.name.toLowerCase().includes(searchTerm.toLowerCase()),
            ),
        ),
      }))
      .filter((section) => section.openings.length > 0)
  }, [sections, searchTerm])

  const filteredPopularOpenings = useMemo(() => {
    if (!searchTerm) return popularOpenings

    return popularOpenings.filter(
      (popular) =>
        popular.opening.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        popular.opening.description
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        popular.variation?.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
    )
  }, [popularOpenings, searchTerm])

  return (
    <div className="flex h-full flex-col">
      {/* Search Bar */}
      <div className="border-b border-white/10 p-4">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-secondary">
            search
          </span>
          <input
            type="text"
            placeholder="Search ECO codes, openings, or variations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded bg-background-2 py-2 pl-10 pr-4 text-sm text-primary placeholder-secondary focus:outline-none focus:ring-1 focus:ring-human-4"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
      </div>

      <div className="red-scrollbar flex-1 overflow-y-auto">
        {/* Popular Openings Section */}
        {!searchTerm && (
          <div className="border-b border-white/10">
            <button
              onClick={() => setShowPopular(!showPopular)}
              className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-human-2/10"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`material-symbols-outlined text-sm transition-transform duration-200 ${
                    showPopular ? 'rotate-90' : ''
                  }`}
                >
                  chevron_right
                </span>
                <span className="font-medium text-human-4">
                  Popular Openings
                </span>
              </div>
              <span className="text-xs text-secondary">
                {filteredPopularOpenings.length} openings
              </span>
            </button>
            <AnimatePresence>
              {showPopular && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {filteredPopularOpenings.map((popular, index) => {
                    const opening = popular.opening
                    const variation = popular.variation
                    const selected = isSelected(opening, variation)

                    return (
                      <div
                        key={`popular-${opening.id}-${variation?.id || 'main'}`}
                        className={`group flex items-center border-l-2 transition-colors ${
                          selected
                            ? 'border-human-4 bg-human-2/20'
                            : 'border-transparent hover:bg-human-2/10'
                        }`}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          className="flex-1 cursor-pointer p-3 pl-6"
                          onClick={() => onOpeningClick(opening, variation)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              onOpeningClick(opening, variation)
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-human-3">
                                  {opening.eco}
                                </span>
                                <span className="text-sm font-medium">
                                  {opening.name}
                                </span>
                              </div>
                              {variation && (
                                <p className="pl-8 text-xs text-secondary">
                                  → {variation.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onQuickAdd(opening, variation)
                          }}
                          className={`mr-3 rounded p-1 transition-colors ${
                            selected
                              ? 'text-human-3 hover:text-human-4'
                              : 'text-secondary/60 hover:text-secondary group-hover:text-secondary/80'
                          }`}
                          title={selected ? 'Already selected' : 'Add opening'}
                        >
                          <span className="material-symbols-outlined !text-base">
                            {selected ? 'check' : 'add'}
                          </span>
                        </button>
                      </div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ECO Sections */}
        {filteredSections.map((section) => (
          <div
            key={section.code}
            className="border-b border-white/10 last:border-b-0"
          >
            <button
              onClick={() => toggleSection(section.code)}
              className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-human-2/10"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`material-symbols-outlined text-sm transition-transform duration-200 ${
                    expandedSections.has(section.code) ? 'rotate-90' : ''
                  }`}
                >
                  chevron_right
                </span>
                <div>
                  <span className="font-mono text-sm font-bold text-human-4">
                    {section.code}00-{section.code}99
                  </span>
                  <span className="ml-2 font-medium">{section.name}</span>
                </div>
              </div>
              <span className="text-xs text-secondary">
                {section.openings.length} openings
              </span>
            </button>

            <AnimatePresence>
              {expandedSections.has(section.code) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {section.openings.map((opening) => (
                    <div key={opening.id}>
                      {/* Main Opening */}
                      <div
                        className={`group flex items-center border-l-2 transition-colors ${
                          isSelected(opening)
                            ? 'border-human-4 bg-human-2/20'
                            : 'border-transparent hover:bg-human-2/10'
                        }`}
                      >
                        <div className="flex items-center">
                          {opening.variations.length > 0 && (
                            <button
                              onClick={() => toggleOpening(opening.id)}
                              className="p-2 text-secondary hover:text-primary"
                            >
                              <span
                                className={`material-symbols-outlined text-xs transition-transform duration-200 ${
                                  expandedOpenings.has(opening.id)
                                    ? 'rotate-90'
                                    : ''
                                }`}
                              >
                                chevron_right
                              </span>
                            </button>
                          )}
                          {opening.variations.length === 0 && (
                            <div className="w-8" />
                          )}
                        </div>

                        <div
                          role="button"
                          tabIndex={0}
                          className="flex-1 cursor-pointer p-3 pl-0"
                          onClick={() => onOpeningClick(opening)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              onOpeningClick(opening)
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-human-3">
                                  {opening.eco}
                                </span>
                                <span className="text-sm font-medium">
                                  {opening.name}
                                </span>
                              </div>
                              <p className="max-w-md truncate text-xs text-secondary">
                                {opening.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onQuickAdd(opening)
                          }}
                          className={`mr-3 rounded p-1 transition-colors ${
                            isSelected(opening)
                              ? 'text-human-3 hover:text-human-4'
                              : 'text-secondary/60 hover:text-secondary group-hover:text-secondary/80'
                          }`}
                          title={
                            isSelected(opening)
                              ? 'Already selected'
                              : 'Add opening'
                          }
                        >
                          <span className="material-symbols-outlined !text-base">
                            {isSelected(opening) ? 'check' : 'add'}
                          </span>
                        </button>
                      </div>

                      {/* Variations */}
                      <AnimatePresence>
                        {expandedOpenings.has(opening.id) &&
                          opening.variations.length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              {opening.variations.map((variation) => (
                                <div
                                  key={variation.id}
                                  className={`group flex items-center border-l-2 transition-colors ${
                                    isSelected(opening, variation)
                                      ? 'border-human-4 bg-human-2/20'
                                      : 'border-transparent hover:bg-human-2/10'
                                  }`}
                                >
                                  <div className="flex w-12 justify-center">
                                    <div className="h-4 w-4 rounded-full border border-secondary/30" />
                                  </div>

                                  <div
                                    role="button"
                                    tabIndex={0}
                                    className="flex-1 cursor-pointer p-2"
                                    onClick={() =>
                                      onOpeningClick(opening, variation)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        onOpeningClick(opening, variation)
                                      }
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-xs text-human-3">
                                            {variation.eco}
                                          </span>
                                          <span className="text-sm">
                                            {variation.name}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onQuickAdd(opening, variation)
                                    }}
                                    className={`mr-3 rounded p-1 transition-colors ${
                                      isSelected(opening, variation)
                                        ? 'text-human-3 hover:text-human-4'
                                        : 'text-secondary/60 hover:text-secondary group-hover:text-secondary/80'
                                    }`}
                                    title={
                                      isSelected(opening, variation)
                                        ? 'Already selected'
                                        : 'Add variation'
                                    }
                                  >
                                    <span className="material-symbols-outlined !text-base">
                                      {isSelected(opening, variation)
                                        ? 'check'
                                        : 'add'}
                                    </span>
                                  </button>
                                </div>
                              ))}
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {filteredSections.length === 0 && searchTerm && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-secondary/50">
              search_off
            </span>
            <p className="mt-2 text-sm text-secondary">
              No openings found for &ldquo;{searchTerm}&rdquo;
            </p>
            <p className="mt-1 text-xs text-secondary/70">
              Try searching for opening names, ECO codes, or variations
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default EcoTreeView
