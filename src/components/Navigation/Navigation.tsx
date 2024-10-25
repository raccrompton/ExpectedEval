import Link from 'next/link'
import styles from './Navigation.module.scss'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { WindowSizeContext } from 'src/contexts'
import {
  BackIcon,
  ForwardIcon,
  DownIcon,
  UpIcon,
} from 'src/components/Icons/icons'

export const Navigation: React.FC = () => {
  const { width } = useContext(WindowSizeContext)
  const isMobile = useMemo(() => width > 0 && width <= 670, [width])
  const [hidden, setHidden] = useState(isMobile)
  useEffect(() => {
    setHidden(isMobile)
  }, [isMobile])

  const hideMenu = useCallback(() => {
    setHidden(true)
  }, [setHidden])

  const showMenu = useCallback(() => {
    setHidden(false)
  }, [setHidden])

  const toggleMenu = useCallback(() => {
    setHidden(!hidden)
  }, [setHidden, hidden])

  const onHeaderButtonClick = useMemo(
    () => (isMobile ? toggleMenu : hideMenu),
    [hideMenu, isMobile, toggleMenu],
  )

  return (
    <>
      <div className={`${hidden ? styles.hidden : styles.container}`}>
        <div className={styles.header}>
          <h1>Maia Chess</h1>
          <button className={styles.button} onClick={onHeaderButtonClick}>
            {isMobile ? (hidden ? DownIcon : UpIcon) : BackIcon}
          </button>
        </div>
        <div className={styles.menu}>
          <h3>
            <Link href="/asdf">Stats</Link>
          </h3>
          <h3>
            <Link href="/train">Train</Link>
          </h3>
          <h3>
            <Link href="/analysis">Analyze</Link>
          </h3>
          <h3>
            <Link href="/asdf">Settings</Link>
          </h3>
          <h3>
            <Link href="/asdf">Blog</Link>
          </h3>
        </div>
        <div className={styles.auth}>
          <h5>Logged In As</h5>
          <h4>Magnus Carlsen</h4>
        </div>
      </div>
      {hidden && !isMobile ? (
        <button className={styles.open} onClick={showMenu}>
          {ForwardIcon}
        </button>
      ) : undefined}
    </>
  )
}
