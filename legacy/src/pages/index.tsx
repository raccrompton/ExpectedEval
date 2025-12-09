/**
 * Home Page - Redirects to Analysis
 *
 * This is the ExpectedEval MVP entry point. It immediately redirects
 * users to the analysis page where they can use the Expected Winrate tool.
 *
 * In the full application, this would be a landing page, but for the MVP
 * we go straight to the analysis functionality.
 */

import { useRouter } from 'next/router'
import { useEffect } from 'react'

/**
 * Home component that redirects to the analysis page
 *
 * Uses client-side navigation to redirect users from the root URL
 * to the analysis page. Returns null during the redirect to avoid
 * rendering any intermediate content.
 */
export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Immediately redirect to the analysis page
    router.replace('/analysis')
  }, [router])

  // Return null during redirect - no need to render anything
  return null
}
