import Head from 'next/head'
import type { NextPage } from 'next'
import React, { useCallback, useContext, useEffect, useRef } from 'react'

import { ModalContext } from 'src/contexts'
import {
  HomeHero,
  AboutMaia,
  PlaySection,
  AnalysisSection,
  TrainSection,
  AdditionalFeaturesSection,
} from 'src/components'

const Home: NextPage = () => {
  const { setPlaySetupModalProps } = useContext(ModalContext)

  // Close play dialog if page closed
  useEffect(
    () => () => setPlaySetupModalProps(undefined),
    [setPlaySetupModalProps],
  )

  const featuresRef = useRef<HTMLDivElement>(null)

  const scrollHandler = useCallback(() => {
    if (featuresRef.current) {
      featuresRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [featuresRef])

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
      <div ref={featuresRef}>
        <PlaySection id="play-section" />
        <AnalysisSection id="analysis-section" />
        <TrainSection id="train-section" />
        <AdditionalFeaturesSection id="more-features" />
        <AboutMaia />
      </div>
    </>
  )
}

export default Home
