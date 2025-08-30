/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import Link from 'next/link'
import { PlayType } from 'src/types'
import { useRouter } from 'next/router'
import { DiscordIcon } from './Icons'
import { useCallback, useContext, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthContext, ModalContext, WindowSizeContext } from 'src/contexts'
import { LeaderboardNavBadge } from '../Leaderboard/LeaderboardNavBadge'
import { useLeaderboardStatus } from 'src/hooks/useLeaderboardStatus'

export const Header: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false)
  const [showPlayDropdown, setShowPlayDropdown] = useState(false)
  const [showMoreDropdown, setShowMoreDropdown] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const { isMobile } = useContext(WindowSizeContext)

  const { user, connectLichess, logout } = useContext(AuthContext)

  // Get leaderboard status for the logged in user
  const { status: leaderboardStatus, loading: leaderboardLoading } =
    useLeaderboardStatus(user?.displayName)

  const router = useRouter()

  const { setPlaySetupModalProps } = useContext(ModalContext)

  const startGame = useCallback(
    (playType: PlayType) => {
      if (
        typeof document !== 'undefined' &&
        document.activeElement instanceof HTMLElement
      ) {
        document.activeElement.blur()
      }
      setPlaySetupModalProps({ playType: playType })
    },
    [setPlaySetupModalProps],
  )

  // Close play dialog if page closed
  useEffect(
    () => () => setPlaySetupModalProps(undefined),
    [setPlaySetupModalProps],
  )

  useEffect(() => {
    const handleRouteChange = () => {
      setShowMenu(false)
    }

    router.events.on('routeChangeStart', handleRouteChange)

    // If the component is unmounted, unsubscribe
    // from the event with the `off` method:
    return () => {
      router.events.off('routeChangeStart', handleRouteChange)
    }
  }, [router])

  useEffect(() => {
    if (showMenu) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showMenu])

  const userInfo = user?.lichessId ? (
    <div
      className="relative flex items-center gap-2 rounded-full bg-background-1/50 px-3 py-1.5 transition-all duration-200 hover:bg-background-1"
      onMouseEnter={() => setShowProfileDropdown(true)}
      onMouseLeave={() => setShowProfileDropdown(false)}
    >
      <span className="material-symbols-outlined text-xl text-primary/80">
        account_circle
      </span>
      <span className="text-sm font-medium text-primary/90">
        {user?.displayName}
      </span>
      <motion.i
        className="material-symbols-outlined text-sm text-primary/60"
        animate={{ rotate: showProfileDropdown ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        arrow_drop_down
      </motion.i>
      <AnimatePresence>
        {showProfileDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-[100%] left-0 z-50 w-full overflow-hidden rounded border border-white/10 bg-background-1 shadow-lg md:bottom-auto md:top-[100%]"
          >
            <Link
              href="/profile"
              className="flex w-full items-center justify-start px-3 py-2 text-sm hover:bg-background-2/60"
            >
              Profile
            </Link>
            <Link
              href="/settings"
              className="flex w-full items-center justify-start px-3 py-2 text-sm hover:bg-background-2/60"
            >
              Settings
            </Link>
            <button
              onClick={logout}
              className="flex w-full items-center justify-start px-3 py-2 text-sm hover:bg-background-2/60"
            >
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  ) : (
    <button onClick={connectLichess}>Sign in</button>
  )

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
