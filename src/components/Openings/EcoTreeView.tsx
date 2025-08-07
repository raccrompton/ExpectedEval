import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  previewOpening?: EcoOpening | null
  previewVariation?: EcoOpeningVariation | null
}

const TreeNode: React.FC<{
  level: number
  hasChildren: boolean
  isExpanded: boolean
  isLast: boolean
  parentLines: boolean[]
  onToggle?: () => void
  children: React.ReactNode
}> = ({
  level,
  hasChildren,
  isExpanded,
  isLast,
  parentLines,
  onToggle,
  children,
}) => {
  const nodeHeight = 24 // Height of each node for proper line alignment
  const lineOffset = Math.floor(nodeHeight / 2) // Center the lines vertically

  return (
    <div className="relative" style={{ height: nodeHeight }}>
      {/* Tree lines */}
      <div className="absolute left-0 top-0 flex h-full">
        {/* Parent connection lines */}
        {parentLines.map((showLine, index) => (
          <div key={index} className="relative w-5 flex-shrink-0">
            {showLine && (
              <div className="absolute bottom-0 left-2 top-0 w-px bg-secondary/20" />
            )}
          </div>
        ))}

        {/* Current level connector */}
        <div className="relative w-5 flex-shrink-0">
          {/* Horizontal line - centered vertically */}
          {level > 0 && (
            <div
              className="absolute left-2 h-px w-3 bg-secondary/20"
              style={{ top: `${lineOffset}px` }}
            />
          )}

          {/* Vertical line continuing down */}
          {!isLast && level > 0 && (
            <div
              className="absolute left-2 w-px bg-secondary/20"
              style={{
                top: `${lineOffset}px`,
                height: `${nodeHeight - lineOffset}px`,
              }}
            />
          )}

          {/* Vertical line from top to center (connecting to parent) */}
          {level > 0 && (
            <div
              className="absolute left-2 top-0 w-px bg-secondary/20"
              style={{ height: `${lineOffset}px` }}
            />
          )}
        </div>
      </div>

      {/* Node content */}
      <div
        className="relative flex h-full items-center"
        style={{ marginLeft: `${(level + 1) * 20}px` }}
      >
        {/* Expand/collapse button */}
        {hasChildren && (
          <button
            onClick={onToggle}
            className="mr-1 flex h-3 w-3 flex-shrink-0 items-center justify-center rounded text-xs text-secondary/70 hover:bg-secondary/10 hover:text-primary"
          >
            {isExpanded ? '−' : '+'}
          </button>
        )}

        {/* Node content */}
        <div className="h-full min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

const EcoTreeView: React.FC<EcoTreeViewProps> = ({
  sections,
  popularOpenings,
  onOpeningClick,
  onQuickAdd,
  isSelected,
  searchTerm,
  setSearchTerm,
  previewOpening,
  previewVariation,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  )
  const [expandedOpenings, setExpandedOpenings] = useState<Set<string>>(
    new Set(),
  )
  const [showPopular, setShowPopular] = useState(true)

  // Helper function to check if an opening is currently being previewed
  const isBeingPreviewed = (
    opening: EcoOpening,
    variation?: EcoOpeningVariation,
  ) => {
    if (!previewOpening) return false
    const matchesOpening = previewOpening.id === opening.id
    const matchesVariation = variation
      ? previewVariation?.id === variation.id
      : !previewVariation
    return matchesOpening && matchesVariation
  }

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

    const searchLower = searchTerm.toLowerCase()

    return sections
      .map((section) => {
        const matchingOpenings = section.openings
          .map((opening) => {
            const openingMatches =
              opening.name.toLowerCase().includes(searchLower) ||
              opening.eco.toLowerCase().includes(searchLower) ||
              opening.pgn.toLowerCase().includes(searchLower)

            const matchingVariations = opening.variations.filter(
              (variation) =>
                variation.name.toLowerCase().includes(searchLower) ||
                variation.pgn.toLowerCase().includes(searchLower),
            )

            // Include opening if it matches or has matching variations
            if (openingMatches || matchingVariations.length > 0) {
              return {
                ...opening,
                // Only show matching variations when searching
                variations: matchingVariations,
              }
            }
            return null
          })
          .filter(Boolean) as EcoOpening[]

        return {
          ...section,
          openings: matchingOpenings,
        }
      })
      .filter((section) => section.openings.length > 0)
  }, [sections, searchTerm])

  // Auto-expand sections and openings when searching
  const autoExpandedSections = useMemo(() => {
    if (!searchTerm) return expandedSections

    const newExpanded = new Set(expandedSections)
    filteredSections.forEach((section) => {
      newExpanded.add(section.code)
    })
    return newExpanded
  }, [expandedSections, filteredSections, searchTerm])

  const autoExpandedOpenings = useMemo(() => {
    if (!searchTerm) return expandedOpenings

    const newExpanded = new Set(expandedOpenings)
    filteredSections.forEach((section) => {
      section.openings.forEach((opening) => {
        // Auto-expand openings that have matching variations
        if (opening.variations.length > 0) {
          newExpanded.add(opening.id)
        }
      })
    })
    return newExpanded
  }, [expandedOpenings, filteredSections, searchTerm])

  const filteredPopularOpenings = useMemo(() => {
    if (!searchTerm) return popularOpenings

    return popularOpenings.filter(
      (popular) =>
        popular.opening.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        popular.opening.pgn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        popular.variation?.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        popular.variation?.pgn
          ?.toLowerCase()
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
            placeholder="Search ECO codes, openings, variations, or PGN..."
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
          <div className="py-1">
            <TreeNode
              level={0}
              hasChildren={filteredPopularOpenings.length > 0}
              isExpanded={showPopular}
              isLast={false}
              parentLines={[]}
              onToggle={() => setShowPopular(!showPopular)}
            >
              <div className="flex flex-1 cursor-pointer items-center justify-between rounded px-1 py-0.5 hover:bg-human-2/10">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-human-4">
                    star
                  </span>
                  <span className="font-medium text-human-4">
                    Popular Openings
                  </span>
                </div>
                <span className="text-xs text-secondary">
                  ({filteredPopularOpenings.length})
                </span>
              </div>
            </TreeNode>

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
                    const previewed = isBeingPreviewed(opening, variation)
                    const isLastPopular =
                      index === filteredPopularOpenings.length - 1

                    return (
                      <TreeNode
                        key={`popular-${opening.id}-${variation?.id || 'main'}`}
                        level={1}
                        hasChildren={false}
                        isExpanded={false}
                        isLast={isLastPopular}
                        parentLines={[true]}
                      >
                        <div
                          className={`group flex h-full flex-1 cursor-pointer items-center rounded px-1 transition-colors ${
                            selected
                              ? 'bg-human-2/20'
                              : previewed
                                ? 'bg-human-2/10'
                                : 'hover:bg-human-2/10'
                          }`}
                          onClick={() => onOpeningClick(opening, variation)}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            <span className="flex-shrink-0 font-mono text-xs font-medium text-secondary">
                              {opening.eco}
                            </span>
                            <span className="flex-shrink-0 text-sm text-primary">
                              {opening.name}
                            </span>
                            {variation && (
                              <span className="flex-shrink-0 text-xs text-secondary">
                                • {variation.name}
                              </span>
                            )}
                            <span className="ml-auto truncate font-mono text-xxs text-secondary/70">
                              {variation ? variation.pgn : opening.pgn}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onQuickAdd(opening, variation)
                            }}
                            className={`ml-1 flex-shrink-0 rounded p-0.5 transition-colors ${
                              selected
                                ? 'text-human-3 hover:text-human-4'
                                : 'text-secondary/60 hover:text-secondary group-hover:text-secondary/80'
                            }`}
                            title={
                              selected ? 'Already selected' : 'Add opening'
                            }
                          >
                            <span className="material-symbols-outlined !text-sm">
                              {selected ? 'check' : 'add'}
                            </span>
                          </button>
                        </div>
                      </TreeNode>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ECO Sections Tree */}
        <div className="py-1">
          {filteredSections.map((section, sectionIndex) => {
            const isLastSection = sectionIndex === filteredSections.length - 1
            const sectionExpanded = autoExpandedSections.has(section.code)

            return (
              <div key={section.code}>
                {/* ECO Section Root Node */}
                <TreeNode
                  level={0}
                  hasChildren={section.openings.length > 0}
                  isExpanded={sectionExpanded}
                  isLast={isLastSection}
                  parentLines={[]}
                  onToggle={() => toggleSection(section.code)}
                >
                  <div className="flex flex-1 cursor-pointer items-center justify-between rounded px-1 py-0.5 hover:bg-human-2/10">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-bold text-human-4">
                        {section.code}
                      </span>
                      <span className="text-sm font-medium text-primary">
                        {section.name}
                      </span>
                    </div>
                    <span className="text-xs text-secondary">
                      ({section.openings.length})
                    </span>
                  </div>
                </TreeNode>

                {/* Openings under this section */}
                <AnimatePresence>
                  {sectionExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {section.openings.map((opening, openingIndex) => {
                        const isLastOpening =
                          openingIndex === section.openings.length - 1
                        const openingExpanded = autoExpandedOpenings.has(
                          opening.id,
                        )
                        const hasVariations = opening.variations.length > 0
                        const openingPreviewed = isBeingPreviewed(opening)

                        return (
                          <div key={opening.id}>
                            {/* Opening Node */}
                            <TreeNode
                              level={1}
                              hasChildren={hasVariations}
                              isExpanded={openingExpanded}
                              isLast={isLastOpening}
                              parentLines={[!isLastSection]}
                              onToggle={
                                hasVariations
                                  ? () => toggleOpening(opening.id)
                                  : undefined
                              }
                            >
                              <div
                                className={`group flex h-full flex-1 cursor-pointer items-center rounded px-1 transition-colors ${
                                  isSelected(opening)
                                    ? 'bg-human-2/20'
                                    : openingPreviewed
                                      ? 'bg-human-2/10'
                                      : 'hover:bg-human-2/10'
                                }`}
                                onClick={() => onOpeningClick(opening)}
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                  <span className="flex-shrink-0 font-mono text-xs text-secondary">
                                    {opening.eco}
                                  </span>
                                  <span className="flex-shrink-0 text-sm text-primary">
                                    {opening.name}
                                  </span>
                                  <span className="ml-auto truncate font-mono text-xxs text-secondary/70">
                                    {opening.pgn}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onQuickAdd(opening)
                                  }}
                                  className={`ml-1 flex-shrink-0 rounded p-0.5 transition-colors ${
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
                                  <span className="material-symbols-outlined !text-sm">
                                    {isSelected(opening) ? 'check' : 'add'}
                                  </span>
                                </button>
                              </div>
                            </TreeNode>

                            {/* Opening Variations */}
                            <AnimatePresence>
                              {openingExpanded && hasVariations && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  {opening.variations.map(
                                    (variation, variationIndex) => {
                                      const isLastVariation =
                                        variationIndex ===
                                        opening.variations.length - 1
                                      const variationPreviewed =
                                        isBeingPreviewed(opening, variation)

                                      return (
                                        <TreeNode
                                          key={variation.id}
                                          level={2}
                                          hasChildren={false}
                                          isExpanded={false}
                                          isLast={isLastVariation}
                                          parentLines={[
                                            !isLastSection,
                                            !isLastOpening,
                                          ]}
                                        >
                                          <div
                                            className={`group flex h-full flex-1 cursor-pointer items-center rounded px-1 transition-colors ${
                                              isSelected(opening, variation)
                                                ? 'bg-human-2/20'
                                                : variationPreviewed
                                                  ? 'bg-human-2/10'
                                                  : 'hover:bg-human-2/10'
                                            }`}
                                            onClick={() =>
                                              onOpeningClick(opening, variation)
                                            }
                                          >
                                            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                              <span className="flex-shrink-0 font-mono text-xs text-secondary">
                                                {variation.eco}
                                              </span>
                                              <span className="flex-shrink-0 text-sm text-primary">
                                                {variation.name}
                                              </span>
                                              <span className="ml-auto truncate font-mono text-xxs text-secondary/70">
                                                {variation.pgn}
                                              </span>
                                            </div>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                onQuickAdd(opening, variation)
                                              }}
                                              className={`ml-1 flex-shrink-0 rounded p-0.5 transition-colors ${
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
                                              <span className="material-symbols-outlined !text-sm">
                                                {isSelected(opening, variation)
                                                  ? 'check'
                                                  : 'add'}
                                              </span>
                                            </button>
                                          </div>
                                        </TreeNode>
                                      )
                                    },
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        {filteredSections.length === 0 && searchTerm && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-secondary/50">
              search_off
            </span>
            <p className="mt-2 text-sm text-secondary">
              No openings found for &ldquo;{searchTerm}&rdquo;
            </p>
            <p className="mt-1 text-xs text-secondary/70">
              Try searching for opening names, ECO codes, variations, or PGN
              moves
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default EcoTreeView
