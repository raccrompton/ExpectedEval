import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import classNames from 'classnames'

import maiaDiagram from './maia_diagram.png'
import { AuthContext, ModalContext } from 'src/contexts'
import { AuthenticatedWrapper } from 'src/components'
import { AboutMaia } from 'src/components/AboutMaia/AboutMaia'
import { HomeHero } from 'src/components/HomeHero/HomeHero'

const Home: NextPage = () => {
  const { user, connectLichess, logout } = useContext(AuthContext)

  const { setPlaySetupModalProps } = useContext(ModalContext)

  // Close play dialog if page closed
  useEffect(
    () => () => setPlaySetupModalProps(undefined),
    [setPlaySetupModalProps],
  )

  const helpRef = useRef<HTMLDivElement>(null)

  const scrollHandler = useCallback(() => {
    if (helpRef.current) {
      helpRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [helpRef])

  return (
    <>
      <Head>
        <title>Maia Chess</title>
        <meta
          name="description"
          content="Collection of chess training and analysis tools centered around Maia."
        />
      </Head>
      <HomeHero scrollHandler={scrollHandler} />
      <div ref={helpRef}>
        <AboutMaia />
      </div>
    </>
  )
}

export default Home
