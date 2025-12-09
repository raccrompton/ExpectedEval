/**
 * Header Component
 *
 * Simplified header for the ExpectedEval MVP. Shows branding and basic
 * mobile menu toggle. Authentication and navigation features removed
 * for the MVP version.
 */

import Link from 'next/link'
import { useContext, useEffect, useState } from 'react'
import { WindowSizeContext } from 'src/contexts'

export const Header: React.FC = () => {
  // Track mobile menu visibility state
  const [showMenu, setShowMenu] = useState(false)

  // Get window size context to determine if we're on mobile
  const { isMobile } = useContext(WindowSizeContext)

  // Lock body scroll when mobile menu is open
  // This prevents scrolling the page content behind the menu
  useEffect(() => {
    if (showMenu) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup: restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showMenu])

  const desktopLayout = (
    <div className="flex w-[90%] flex-row items-center justify-between">
      <div className="flex flex-row items-center justify-start gap-6">
        <Link href="/" className="flex flex-row items-center gap-2">
          <h2 className="text-2xl font-bold">ExpectedEval</h2>
        </Link>
      </div>
    </div>
  )

  const mobileLayout = (
    <div className="flex w-full flex-row justify-between px-4">
      <Link href="/" passHref>
        <div className="flex flex-row items-center gap-2">
          <h2 className="text-2xl font-bold">ExpectedEval</h2>
        </div>
      </Link>
      <button
        className="block cursor-pointer *:*:fill-primary md:hidden"
        onClick={() => setShowMenu((show) => !show)}
      >
        <span className="material-symbols-outlined text-3xl">menu</span>
      </button>
      {showMenu && (
        <div className="fixed left-0 top-0 z-40 flex h-screen w-screen flex-col items-start justify-between bg-backdrop py-4">
          <div className="flex w-full flex-row justify-between px-4">
            <Link href="/" passHref>
              <div className="flex flex-row items-center gap-2">
                <h2 className="text-2xl font-bold">ExpectedEval</h2>
              </div>
            </Link>
            <button
              className="block cursor-pointer *:*:fill-primary md:hidden"
              onClick={() => setShowMenu(false)}
            >
              <span className="material-symbols-outlined text-3xl">menu</span>
            </button>
          </div>
          <div className="flex flex-col gap-6 px-12">
            <Link href="/" className="text-xl font-bold uppercase">
              ExpectedEval
            </Link>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="flex w-screen flex-row items-center justify-center pb-1 pt-4 md:pb-0">
        {isMobile ? mobileLayout : desktopLayout}
      </div>
    </>
  )
}
