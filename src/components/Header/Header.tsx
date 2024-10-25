import Link from 'next/link'
import Image from 'next/image'
import classNames from 'classnames'
import { useRouter } from 'next/router'
import { MenuIcon, UserIcon, DiscordIcon } from 'src/components/Icons/icons'
import { useCallback, useContext, useEffect, useState } from 'react'

import styles from './Header.module.scss'
import { ThemeButton } from '../ThemeButton'
import { AuthContext, ModalContext } from 'src/contexts'

export const Header: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false)

  const { user, connectLichess, logout } = useContext(AuthContext)

  const router = useRouter()

  const { setPlaySetupModalProps } = useContext(ModalContext)

  const startGame = useCallback(
    (playType) => {
      if (document.activeElement instanceof HTMLElement) {
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

  const userInfo = user?.lichessId ? (
    <div className={styles.auth}>
      <div className={styles.user}>
        {UserIcon}
        <div className={styles.content}>
          {user?.displayName}
          <p>View Info</p>
        </div>
      </div>
      <div className={styles.dropdown}>
        <Link
          href="/profile"
          className={
            router.pathname.startsWith('/profile') ? styles.selected : ''
          }
        >
          Profile
        </Link>
        <button onClick={logout}>Logout</button>
      </div>
    </div>
  ) : (
    <div className={styles.auth}>
      <button onClick={connectLichess}>Sign in</button>
    </div>
  )

  const headerContent = (
    <>
      <Link href="/" passHref>
        <div className="flex flex-row items-center gap-2">
          <Image src="/maia.png" width={40} height={40} alt="Maia Logo" />
          <h2 className="text-2xl font-bold">Maia Chess</h2>
        </div>
      </Link>
      <div className={styles.links}>
        {user?.lichessId ? (
          <div
            className={
              router.pathname.startsWith('/play') ? styles.selected : ''
            }
          >
            <button>Play</button>
            <div className={styles.dropdownContent}>
              <button onClick={() => startGame('againstMaia')}>
                Play Maia
              </button>
              <a
                href="https://lichess.org/@/maia1"
                target="_blank"
                rel="noreferrer"
              >
                Play Maia on Lichess
              </a>
              <button onClick={() => startGame('handAndBrain')}>
                Play Hand and Brain
              </button>
            </div>
          </div>
        ) : (
          <a
            target="_blank"
            rel="noreferrer"
            href="https://lichess.org/@/maia1"
          >
            Play
          </a>
        )}
        <Link
          href="/analysis"
          className={
            router.pathname.startsWith('/analysis') ? styles.selected : ''
          }
        >
          Analysis
        </Link>
        <Link
          href="/train"
          className={
            router.pathname.startsWith('/train') ? styles.selected : ''
          }
        >
          Train
        </Link>
        <Link
          href="/turing"
          className={
            router.pathname.startsWith('/turing') ? styles.selected : ''
          }
        >
          Bot-or-not
        </Link>
        <Link
          href="/leaderboard"
          className={
            router.pathname.startsWith('/leaderboard') ? styles.selected : ''
          }
        >
          Leaderboard
        </Link>
        <Link
          href="/blog"
          className={router.pathname.startsWith('/blog') ? styles.selected : ''}
        >
          Blog
        </Link>
        <a target="_blank" rel="noreferrer" href="https://twitch.tv/maiachess">
          WATCH
        </a>
        <a
          target="_blank"
          rel="noreferrer"
          href="https://forms.gle/XYeoTJF4YgUu4Vq28"
        >
          FEEDBACK
        </a>
      </div>
      <div className={styles.linksRight}>
        <ThemeButton />
        <a
          target="_blank"
          rel="noreferrer"
          href="https://discord.gg/Az93GqEAs7"
        >
          {DiscordIcon}
        </a>
        {userInfo}
      </div>
      <button
        className={styles.button}
        onClick={() => setShowMenu((show) => !show)}
      >
        {MenuIcon}
      </button>
    </>
  )

  return (
    <>
      <div className={styles.header}>{headerContent}</div>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={classNames(styles.menu, { [styles.active]: showMenu })}
        onClick={() => setShowMenu(false)}
      >
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div className={styles.mobile} onClick={(e) => e.stopPropagation()}>
          {headerContent}
        </div>
      </div>
    </>
  )
}
