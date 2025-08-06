import { EcoDatabase } from 'src/types'
import comprehensiveOpenings from './comprehensive-openings.json'

export const getComprehensiveOpenings = (): EcoDatabase => {
  return comprehensiveOpenings as EcoDatabase
}

export * from './ecoProcessor'