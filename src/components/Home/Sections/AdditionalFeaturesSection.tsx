import Link from 'next/link'
import { useContext } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

import { ModalContext } from 'src/contexts'
import { PlayType } from 'src/types'
import { StarIcon, TuringIcon } from 'src/components/Icons/icons'

interface AdditionalFeaturesSectionProps {
  id: string
}

export const AdditionalFeaturesSection = ({
  id,
}: AdditionalFeaturesSectionProps) => {
  const { setPlaySetupModalProps } = useContext(ModalContext)
  const [ref, inView] = useInView({
    triggerOnce: false,
    threshold: 0.2,
  })

  const startHandBrainGame = () => {
    setPlaySetupModalProps({ playType: 'handAndBrain' as PlayType })
  }

  // Animation variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  }

  return (
    <section
      id={id}
      className="relative w-full flex-col items-center overflow-hidden bg-background-1 py-16"
      ref={ref}
    >
      <div className="container mx-auto px-4">
        <div className="mb-14 max-w-3xl text-left">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mb-2 inline-block rounded-full bg-human-3/10 px-4 py-1 text-sm font-medium text-human-3"
          >
            More Features
          </motion.div>
          <motion.h2
            className="mb-4 text-3xl font-bold md:text-4xl lg:text-5xl"
            initial={{ opacity: 0, y: -10 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            Explore other ways to use Maia
          </motion.h2>
          <motion.p
            className="max-w-2xl text-lg text-primary/80"
            initial={{ opacity: 0, y: -10 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            Maia offers a range of innovative tools to help you understand human
            chess and improve your skills
          </motion.p>
        </div>

        <motion.div
          className="grid gap-6 md:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          {/* Openings Feature */}
          <motion.div
            className="hover:scale-102 flex flex-col rounded-lg bg-background-2 p-5 shadow-lg transition-transform duration-200"
            variants={itemVariants}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-human-3/10 p-2">
              <div className="h-7 w-7 text-human-3">
                <StarIcon />
              </div>
            </div>
            <h3 className="mb-3 text-xl font-bold">Openings Practice</h3>
            <p className="mb-5 flex-grow text-primary/80">
              Drill chess openings against Maia models calibrated to specific
              rating levels, allowing you to practice against opponents similar
              to those you&apos;ll face.
            </p>
            <Link
              href="/openings"
              className="mt-auto inline-flex items-center justify-center rounded-md bg-background-3 px-5 py-3 font-medium transition duration-200 hover:bg-background-4"
            >
              Practice Openings
            </Link>
          </motion.div>

          {/* Hand & Brain Feature */}
          <motion.div
            className="hover:scale-102 flex flex-col rounded-lg bg-background-2 p-5 shadow-lg transition-transform duration-200"
            variants={itemVariants}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-engine-3/10 p-2">
              <div className="h-7 w-7 text-engine-3">
                <TuringIcon />
              </div>
            </div>
            <h3 className="mb-3 text-xl font-bold">Hand & Brain</h3>
            <p className="mb-5 flex-grow text-primary/80">
              Team up with Maia in this collaborative chess variant. You can be
              the &quot;Hand&quot; making moves while Maia is the
              &quot;Brain&quot; selecting pieces, or vice versa.
            </p>
            <button
              onClick={startHandBrainGame}
              className="mt-auto inline-flex items-center justify-center rounded-md bg-background-3 px-5 py-3 font-medium transition duration-200 hover:bg-background-4"
            >
              Play Hand & Brain
            </button>
          </motion.div>

          {/* Bot or Not Feature */}
          <motion.div
            className="hover:scale-102 flex flex-col rounded-lg bg-background-2 p-5 shadow-lg transition-transform duration-200"
            variants={itemVariants}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-human-4/10 p-2">
              <div className="h-7 w-7 text-human-4">
                <TuringIcon />
              </div>
            </div>
            <h3 className="mb-3 text-xl font-bold">Bot or Not</h3>
            <p className="mb-5 flex-grow text-primary/80">
              Test your ability to distinguish between human and AI chess play.
              This Turing test for chess helps you understand the differences
              between human and engine moves.
            </p>
            <Link
              href="/turing"
              className="mt-auto inline-flex items-center justify-center rounded-md bg-background-3 px-5 py-3 font-medium transition duration-200 hover:bg-background-4"
            >
              Try Bot or Not
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
