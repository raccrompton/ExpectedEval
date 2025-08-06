import { EcoDatabase, EcoSection, EcoOpening, PopularOpening } from 'src/types'

export const ECO_SECTION_DEFINITIONS = {
  A: {
    name: 'Irregular Openings & Flank Games',
    description:
      'Openings that do not begin with 1.e4 or 1.d4, including English Opening, Réti, Bird Opening, and various irregular first moves.',
  },
  B: {
    name: 'Semi-Open Games',
    description:
      'Black responses to 1.e4 other than 1...e5, including Sicilian Defense, French Defense (partial), Caro-Kann, and Alekhine Defense.',
  },
  C: {
    name: 'Open Games & French Defense',
    description:
      'Games beginning with 1.e4 e5, including Ruy Lopez, Italian Game, and the French Defense (1.e4 e6).',
  },
  D: {
    name: "Closed Games & Queen's Gambit",
    description:
      "Games beginning with 1.d4 d5, including Queen's Gambit variations, Slav Defense, and various Queen's Pawn games.",
  },
  E: {
    name: 'Indian Defenses',
    description:
      "Games beginning with 1.d4 Nf6, including King's Indian, Nimzo-Indian, Queen's Indian, and other Indian defenses.",
  },
}

// Most popular openings based on chess database statistics
export const POPULAR_OPENING_IDS = [
  // Most played openings across all levels
  { id: 'ruy-lopez', variationId: null, popularity: 95 },
  { id: 'sicilian-defense', variationId: 'najdorf-variation', popularity: 92 },
  { id: 'queens-gambit-declined', variationId: null, popularity: 90 },
  { id: 'kings-indian-defense', variationId: 'main-line', popularity: 88 },
  { id: 'italian-game', variationId: 'giuoco-piano', popularity: 85 },
  { id: 'french-defense', variationId: 'winawer-variation', popularity: 82 },
  { id: 'caro-kann-defense', variationId: 'advance-variation', popularity: 80 },
  { id: 'nimzo-indian-defense', variationId: 'main-line', popularity: 78 },
  {
    id: 'english-opening',
    variationId: 'symmetrical-variation',
    popularity: 75,
  },
  { id: 'queens-indian-defense', variationId: null, popularity: 72 },
  { id: 'scandinavian-defense', variationId: 'main-line', popularity: 70 },
  { id: 'scotch-game', variationId: null, popularity: 68 },
  { id: 'alekhine-defense', variationId: null, popularity: 65 },
  { id: 'pirc-defense', variationId: 'main-line', popularity: 62 },
  { id: 'petrov-defense', variationId: null, popularity: 60 },
]

export function processEcoDatabase(ecoDatabase: EcoDatabase): {
  sections: EcoSection[]
  allOpenings: EcoOpening[]
  popularOpenings: PopularOpening[]
} {
  const sections: EcoSection[] = []
  const allOpenings: EcoOpening[] = []

  // Process each ECO section
  Object.entries(ecoDatabase.openings).forEach(([sectionCode, openings]) => {
    const sectionDef =
      ECO_SECTION_DEFINITIONS[
        sectionCode as keyof typeof ECO_SECTION_DEFINITIONS
      ]

    if (sectionDef && openings.length > 0) {
      sections.push({
        code: sectionCode,
        name: sectionDef.name,
        description: sectionDef.description,
        openings: openings,
      })

      allOpenings.push(...openings)
    }
  })

  // Sort sections by code
  sections.sort((a, b) => a.code.localeCompare(b.code))

  // Create popular openings list
  const popularOpenings: PopularOpening[] = []

  POPULAR_OPENING_IDS.forEach((popularId) => {
    // Find opening in all sections
    const opening = allOpenings.find((o) => o.id === popularId.id)
    if (opening) {
      const variation = popularId.variationId
        ? opening.variations.find((v) => v.id === popularId.variationId)
        : undefined

      popularOpenings.push({
        opening,
        variation,
        popularity: popularId.popularity,
      })
    }
  })

  // Sort popular openings by popularity
  popularOpenings.sort((a, b) => b.popularity - a.popularity)

  return {
    sections,
    allOpenings,
    popularOpenings,
  }
}

export function searchOpenings(
  sections: EcoSection[],
  searchTerm: string,
): EcoSection[] {
  if (!searchTerm.trim()) return sections

  const lowerSearchTerm = searchTerm.toLowerCase()

  return sections
    .map((section) => ({
      ...section,
      openings: section.openings.filter(
        (opening) =>
          opening.name.toLowerCase().includes(lowerSearchTerm) ||
          opening.description.toLowerCase().includes(lowerSearchTerm) ||
          opening.eco.toLowerCase().includes(lowerSearchTerm) ||
          opening.pgn.toLowerCase().includes(lowerSearchTerm) ||
          opening.variations.some(
            (variation) =>
              variation.name.toLowerCase().includes(lowerSearchTerm) ||
              variation.eco.toLowerCase().includes(lowerSearchTerm) ||
              variation.pgn.toLowerCase().includes(lowerSearchTerm),
          ),
      ),
    }))
    .filter((section) => section.openings.length > 0)
}

// Convert EcoOpening to the legacy Opening format for backward compatibility
export function ecoToLegacyOpening(ecoOpening: EcoOpening) {
  return {
    id: ecoOpening.id,
    name: ecoOpening.name,
    description: ecoOpening.description,
    fen: ecoOpening.fen,
    pgn: ecoOpening.pgn,
    variations: ecoOpening.variations.map((v) => ({
      id: v.id,
      name: v.name,
      fen: v.fen,
      pgn: v.pgn,
    })),
  }
}
