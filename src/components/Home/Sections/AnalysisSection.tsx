import Link from 'next/link'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import {
  SimplifiedChessboard,
  SimplifiedBlunderMeter,
  SimplifiedMovesByRating,
  SimplifiedMoveMap,
  SimplifiedHighlight,
} from './SimplifiedAnalysisComponents'

interface AnalysisSectionProps {
  id: string
}

export const AnalysisSection = ({ id }: AnalysisSectionProps) => {
  const [ref, inView] = useInView({
    triggerOnce: false,
    threshold: 0.2,
  })

  return (
    <section
      id={id}
      className="relative flex w-full flex-col items-center justify-center overflow-hidden bg-background-1 py-8"
      ref={ref}
    >
      <div className="mx-auto flex w-full max-w-[90%] flex-col-reverse items-center px-4 md:flex-row md:gap-8 lg:gap-12">
        {/* Analysis Interface Visual */}
        <motion.div
          className="relative mt-6 w-full md:mt-0 md:w-1/2"
          initial={{ opacity: 0, x: -50 }}
          animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
        >
          <div className="relative w-full overflow-hidden rounded-lg border border-background-3/20 bg-background-2 shadow-xl">
            <div className="flex flex-col gap-3 p-3">
              <div className="flex gap-3">
                <div className="flex w-1/2 flex-col">
                  <div className="flex flex-col">
                    <motion.div
                      className="w-full rounded-t-sm bg-background-1/60 p-2 text-left text-sm font-medium text-primary/80"
                      initial={{ opacity: 0 }}
                      animate={inView ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                    >
                      Magnus Carlsen (2850)
                    </motion.div>
                    <motion.div
                      className="aspect-square w-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={
                        inView
                          ? { opacity: 1, scale: 1 }
                          : { opacity: 0, scale: 0.95 }
                      }
                      transition={{ duration: 0.3, delay: 0.3 }}
                    >
                      <SimplifiedChessboard />
                    </motion.div>
                    <motion.div
                      className="rounded-b-sm bg-background-1/60 p-2 text-left text-sm font-medium text-primary/80"
                      initial={{ opacity: 0 }}
                      animate={inView ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                    >
                      Hikaru Nakamura (2836)
                    </motion.div>
                  </div>
                </div>
                <div className="flex w-1/2 flex-col justify-between">
                  <motion.div
                    className="flex-1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={
                      inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                    }
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <SimplifiedHighlight />
                  </motion.div>
                  <motion.div
                    className="mt-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={
                      inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                    }
                    transition={{ duration: 0.3, delay: 0.5 }}
                  >
                    <SimplifiedBlunderMeter />
                  </motion.div>
                </div>
              </div>
              <div className="flex gap-3">
                <motion.div
                  className="h-48 w-1/2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                  }
                  transition={{ duration: 0.3, delay: 0.6 }}
                >
                  <SimplifiedMovesByRating />
                </motion.div>
                <motion.div
                  className="h-48 w-1/2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                  }
                  transition={{ duration: 0.3, delay: 0.7 }}
                >
                  <SimplifiedMoveMap />
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div
          className="w-full md:w-1/2"
          initial={{ opacity: 0, x: 50 }}
          animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
        >
          <div className="mb-4 inline-block rounded-full bg-engine-3/10 px-4 py-1 text-sm font-medium text-engine-3">
            Game Analysis
          </div>
          <motion.h2
            className="mb-6 max-w-2xl text-3xl font-bold md:text-4xl lg:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            Analyze Your Games with Powerful AI Tools
          </motion.h2>
          <motion.p
            className="mb-4 max-w-xl text-lg leading-relaxed text-primary/80"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
          >
            Maia combines traditional Stockfish precision with human-like
            pattern recognition, showing you both the perfect moves and what
            humans typically play. Discover your strengths and weaknesses
            compared to players at different skill levels.
          </motion.p>
          <motion.p
            className="mb-4 max-w-xl text-lg leading-relaxed text-primary/80"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.2 }}
          >
            Visualize move probabilities across different rating levels, compare
            human tendencies with engine evaluations, and understand the
            likelihood of mistakes in each position. Get personalized insights
            based on your playing style and rating level.
          </motion.p>
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Link
              href="/analysis"
              className="flex w-fit items-center justify-center rounded-md bg-engine-3 px-6 py-3 font-medium text-white"
            >
              Try Analysis
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
