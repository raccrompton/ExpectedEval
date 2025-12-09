/**
 * Analysis Index Page
 *
 * Redirects users to an analysis game. For the MVP, this creates a default
 * custom game from the starting position so users can start analyzing
 * immediately without needing to log in.
 */
import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { DelayedLoading } from 'src/components'
import { getAnalyzedCustomFEN } from 'src/api'

// Standard starting position FEN
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const AnalysisPage: NextPage = () => {
  const { push } = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const createDefaultGame = async () => {
      try {
        // Create a default game from the starting position
        const game = await getAnalyzedCustomFEN(STARTING_FEN, 'New Analysis')
        push(`/analysis/${game.id}/custom`)
      } catch (error) {
        console.error('Error creating default game:', error)
        setLoading(false)
      }
    }

    createDefaultGame()
  }, [push])

  return (
    <DelayedLoading isLoading={loading}>
      <div></div>
    </DelayedLoading>
  )
}

export default AnalysisPage
