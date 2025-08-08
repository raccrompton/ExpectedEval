import { AnalyzedGame, AnalysisWebGame } from 'src/types'
import { storeCustomGame } from 'src/api/analysis'

export interface StoredCustomAnalysis {
  id: string
  name: string
  type: 'custom-pgn' | 'custom-fen'
  data: string // PGN or FEN data
  createdAt: string
  preview?: string // Short preview for display
}

const STORAGE_KEY = 'maia_custom_analyses'
const MIGRATION_KEY = 'maia_custom_analyses_migrated'

let migrationPromise: Promise<void> | null = null

const generatePreview = (type: 'pgn' | 'fen', data: string): string => {
  if (type === 'pgn') {
    const whiteMatch = data.match(/\[White\s+"([^"]+)"\]/)
    const blackMatch = data.match(/\[Black\s+"([^"]+)"\]/)
    if (whiteMatch && blackMatch) {
      return `${whiteMatch[1]} vs ${blackMatch[1]}`
    } else {
      return 'PGN Game'
    }
  } else {
    return 'FEN Position'
  }
}

export const saveCustomAnalysis = async (
  type: 'pgn' | 'fen',
  data: string,
  name?: string,
): Promise<StoredCustomAnalysis> => {
  const preview = generatePreview(type, data)
  const finalName = name || preview

  try {
    const response = await storeCustomGame({
      name: finalName,
      [type]: data,
    })

    const analysis: StoredCustomAnalysis = {
      id: response.id,
      name: response.name,
      type: `custom-${type}` as 'custom-pgn' | 'custom-fen',
      data,
      createdAt: response.created_at,
      preview,
    }

    return analysis
  } catch (error) {
    console.error('Failed to store custom game on backend:', error)
    
    const analyses = getLocalStoredCustomAnalyses()
    const id = `${type}-${Date.now()}`
    
    const analysis: StoredCustomAnalysis = {
      id,
      name: finalName,
      type: `custom-${type}` as 'custom-pgn' | 'custom-fen',
      data,
      createdAt: new Date().toISOString(),
      preview,
    }

    analyses.unshift(analysis)
    const trimmedAnalyses = analyses.slice(0, 50)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedAnalyses))

    return analysis
  }
}

const getLocalStoredCustomAnalyses = (): StoredCustomAnalysis[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.warn('Failed to parse stored custom analyses:', error)
    return []
  }
}

const migrateLocalStorageToBackend = async (): Promise<void> => {
  if (typeof window === 'undefined') return
  
  const hasBeenMigrated = localStorage.getItem(MIGRATION_KEY)
  if (hasBeenMigrated) return

  const localAnalyses = getLocalStoredCustomAnalyses()
  if (localAnalyses.length === 0) {
    localStorage.setItem(MIGRATION_KEY, 'true')
    return
  }

  console.log(`Migrating ${localAnalyses.length} custom analyses to backend...`)

  const migrationResults = []
  for (const analysis of localAnalyses) {
    try {
      const type = analysis.type === 'custom-pgn' ? 'pgn' : 'fen'
      await storeCustomGame({
        name: analysis.name,
        [type]: analysis.data,
      })
      migrationResults.push({ success: true, id: analysis.id })
    } catch (error) {
      console.warn(`Failed to migrate analysis ${analysis.id}:`, error)
      migrationResults.push({ success: false, id: analysis.id, error })
    }
  }

  const successCount = migrationResults.filter(r => r.success).length
  console.log(`Migration completed: ${successCount}/${localAnalyses.length} analyses migrated successfully`)

  if (successCount === localAnalyses.length) {
    localStorage.removeItem(STORAGE_KEY)
  }
  
  localStorage.setItem(MIGRATION_KEY, 'true')
}

export const ensureMigration = (): Promise<void> => {
  if (!migrationPromise) {
    migrationPromise = migrateLocalStorageToBackend()
  }
  return migrationPromise
}

export const getStoredCustomAnalyses = (): StoredCustomAnalysis[] => {
  return getLocalStoredCustomAnalyses()
}

export const deleteCustomAnalysis = (id: string): void => {
  const analyses = getLocalStoredCustomAnalyses()
  const filtered = analyses.filter((analysis) => analysis.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

export const getCustomAnalysisById = (
  id: string,
): StoredCustomAnalysis | undefined => {
  const analyses = getLocalStoredCustomAnalyses()
  return analyses.find((analysis) => analysis.id === id)
}

export const convertStoredAnalysisToWebGame = (
  analysis: StoredCustomAnalysis,
): AnalysisWebGame => {
  return {
    id: analysis.id,
    type: analysis.type,
    label: analysis.name,
    result: '*',
    pgn: analysis.type === 'custom-pgn' ? analysis.data : undefined,
  }
}

export const getCustomAnalysesAsWebGames = (): AnalysisWebGame[] => {
  const stored = getLocalStoredCustomAnalyses()
  return stored.map(convertStoredAnalysisToWebGame)
}
