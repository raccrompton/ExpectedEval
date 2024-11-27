import Head from 'next/head'
import type { NextPage } from 'next'
import React, { useCallback, useContext, useEffect, useRef } from 'react'

import { ModalContext } from 'src/contexts'
import { HomeHero, AboutMaia } from 'src/components'

const Home: NextPage = () => {
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
