import { EcoDatabase, EcoOpening, EcoOpeningVariation } from 'src/types'
import ecoAData from './data/ecoA.json'
import ecoBData from './data/ecoB.json'
import ecoCData from './data/ecoC.json'
import ecoDData from './data/ecoD.json'
import ecoEData from './data/ecoE.json'

type RawEcoEntry = {
  src?: string
  eco: string // e.g., "A00"
  moves: string // PGN-like string
  name: string // e.g., "English Opening: Symmetrical Variation"
  scid?: string
  aliases?: Record<string, string>
}

type RawEcoFile = Record<string, RawEcoEntry> // key is FEN

function slugifyId(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function buildEcoDatabaseFromRaw(): EcoDatabase {
  const rawFiles: RawEcoFile[] = [
    ecoAData as RawEcoFile,
    ecoBData as RawEcoFile,
    ecoCData as RawEcoFile,
    ecoDData as RawEcoFile,
    ecoEData as RawEcoFile,
  ]

  // Map of section letter to map of openingKey -> EcoOpening (with variations aggregated)
  const sectionToOpeningsMap = new Map<string, Map<string, EcoOpening>>()

  for (const raw of rawFiles) {
    for (const [fen, entry] of Object.entries(raw)) {
      const ecoCode = entry.eco
      if (!ecoCode || ecoCode.length < 1) continue
      const sectionLetter = ecoCode.charAt(0)
      if (!sectionToOpeningsMap.has(sectionLetter)) {
        sectionToOpeningsMap.set(sectionLetter, new Map<string, EcoOpening>())
      }

      const [baseNameRaw, ...restParts] = entry.name.split(':')
      const baseName = baseNameRaw.trim()
      const variationNameRaw =
        restParts.length > 0 ? restParts.join(':').trim() : null

      // Build opening key stable across files
      const openingKey = `${ecoCode}-${slugifyId(baseName)}`

      const openingsMap = sectionToOpeningsMap.get(sectionLetter) as Map<
        string,
        EcoOpening
      >

      if (!openingsMap.has(openingKey)) {
        const openingId = slugifyId(baseName)
        openingsMap.set(openingKey, {
          eco: ecoCode,
          id: openingId,
          name: baseName,
          description: baseName,
          // Initialize with this entry's PGN/FEN; may be overwritten by a non-variation record later
          pgn: entry.moves,
          fen,
          variations: [],
        })
      }

      const opening = openingsMap.get(openingKey) as EcoOpening

      if (variationNameRaw && variationNameRaw.length > 0) {
        // Treat as a variation under the base opening
        const variationId = slugifyId(variationNameRaw)
        const existing = opening.variations.find((v) => v.id === variationId)
        if (!existing) {
          const variation: EcoOpeningVariation = {
            eco: ecoCode,
            id: variationId,
            name: variationNameRaw,
            pgn: entry.moves,
            fen,
          }
          opening.variations.push(variation)
        }
      } else {
        // Base record without explicit variation: prefer using this as the opening's main line
        opening.pgn = entry.moves
        opening.fen = fen
      }
    }
  }

  // Convert maps to arrays and sort
  const openings: Record<string, EcoOpening[]> = {}
  const sectionLetters = ['A', 'B', 'C', 'D', 'E']
  sectionLetters.forEach((letter) => {
    const map =
      sectionToOpeningsMap.get(letter) || new Map<string, EcoOpening>()
    const arr = Array.from(map.values())

    // Sort by ECO code then name
    arr.sort((a, b) =>
      a.eco === b.eco
        ? a.name.localeCompare(b.name)
        : a.eco.localeCompare(b.eco),
    )

    // Sort variations by name for consistency
    arr.forEach((o) =>
      o.variations.sort((a, b) => a.name.localeCompare(b.name)),
    )

    openings[letter] = arr
  })

  const totalOpenings = Object.values(openings).reduce(
    (sum, list) => sum + list.length,
    0,
  )

  const ecoDatabase: EcoDatabase = {
    meta: {
      title: 'Comprehensive Chess ECO Opening Database (Full)',
      description:
        'Complete database of chess openings aggregated from ECO data files A–E',
      version: '2.0.0',
      totalOpenings,
      ecoSections: sectionLetters,
    },
    openings,
  }

  return ecoDatabase
}

export const getComprehensiveOpenings = (): EcoDatabase => {
  return buildEcoDatabaseFromRaw()
}

export * from './ecoProcessor'
