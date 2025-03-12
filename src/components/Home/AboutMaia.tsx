import Link from 'next/link'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

import personJon from './people/jon.jpg'
import { TeamMember } from './TeamMember'
import personSid from './people/sid.jpeg'
import personReid from './people/reid.jpg'
import personIsaac from './people/isaac.jpg'
import personKevin from './people/kevin.jpg'
import personJoseph from './people/joseph.jpg'
import personAshton from './people/ashton.jpeg'
import personDmitriy from './people/dmitriy.jpg'

const teamMembers = [
  {
    image: personAshton,
    name: 'Ashton Anderson',
    website: 'http://www.cs.toronto.edu/~ashton/',
    institution: 'University of Toronto',
    role: 'Project Lead',
    github: 'ashtonanderson',
  },
  {
    image: personReid,
    name: 'Reid McIlroy-Young',
    website: 'https://reidmcy.com/',
    institution: 'University of Toronto',
    role: 'Head Developer',
    github: 'reidmcy',
  },
  {
    image: personJon,
    name: 'Jon Kleinberg',
    website: 'https://www.cs.cornell.edu/home/kleinber/',
    institution: 'Cornell University',
    role: 'Collaborator',
  },
  {
    image: personSid,
    name: 'Siddhartha Sen',
    website: 'http://sidsen.org/',
    institution: 'Microsoft Research',
    role: 'Collaborator',
    github: 'sidsen',
  },
  {
    image: personJoseph,
    name: 'Joseph Tang',
    website: 'https://lilv98.github.io/',
    institution: 'University of Toronto',
    role: 'Model Developer',
    github: 'lilv98',
  },
  {
    image: personIsaac,
    name: 'Isaac Waller',
    website: 'https://waller.is/',
    institution: 'University of Toronto',
    role: 'Web Developer',
  },
  {
    image: personDmitriy,
    name: 'Dmitriy Prokopchuk',
    website: 'https://prokopchukdim.github.io/',
    institution: 'University of Toronto',
    role: 'Web Developer',
    github: 'prokopchukdim',
  },
  {
    image: personKevin,
    name: 'Kevin Thomas',
    website: 'https://kevinjosethomas.com/',
    institution: 'Burnaby South Secondary',
    role: 'Web Developer',
    github: 'kevinjosethomas',
  },
]

export const AboutMaia = () => {
  const [projectRef, projectInView] = useInView({
    triggerOnce: false,
    threshold: 0.2,
  })

  const [teamRef, teamInView] = useInView({
    triggerOnce: false,
    threshold: 0.2,
  })

  const [acknowledgementsRef, acknowledgementsInView] = useInView({
    triggerOnce: false,
    threshold: 0.2,
  })

  return (
    <div className="font-helvetica [&_a]:text-human-3">
      <section
        id="main_info"
        className="relative flex items-center justify-center bg-background-1 py-20 text-center"
        ref={projectRef}
      >
        <div className="z-10 mx-auto my-0 max-w-[1170px]">
          <div className="m-auto box-border w-auto px-4 md:w-2/3">
            <h3 className="text-xl font-bold uppercase">
              Human-AI Collaboration for Chess
            </h3>
            <h2 className="mx-auto my-8 text-center text-4xl font-bold">
              What is Maia Chess?
            </h2>
            <p className="text-primary/90">
              Maia is a human-like chess engine, designed to play like a human
              instead of playing the strongest moves. Maia uses the same deep
              learning techniques that power superhuman chess engines, but with
              a novel approach: Maia is trained to play like a human rather than
              to win.
            </p>
            <br />
            <br />
            <p className="text-primary/90">
              Maia is trained to predict human moves rather than to find the
              optimal move in a position. As a result, Maia exhibits common
              human biases and makes many of the same mistakes that humans make.
              We have trained a set of nine neural network engines, each
              targeting a specific rating level on the Lichess.org rating scale,
              from 1100 to 1900.
            </p>
            <br />
            <br />
            <p className="text-primary/90">
              We introduced Maia in our paper that appeared at NeurIPS 2020.
            </p>
            <br />
            <div className="mx-auto flex items-center justify-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/"
                  className="rounded bg-human-3 p-4 !text-white transition-opacity hover:opacity-90"
                >
                  Play Maia Chess
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://maiachess.com/maia-paper.pdf"
                  className="rounded bg-engine-3 p-4 !text-white transition-opacity hover:opacity-90"
                >
                  Read Paper
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="team_info"
        className="relative overflow-hidden bg-background-2 py-16"
        ref={teamRef}
      >
        <div className="relative z-10 mx-auto my-0 max-w-[1200px]">
          <div className="m-auto box-border w-auto px-4 md:w-2/3">
            <h3 className="text-center text-xl font-bold uppercase">Team</h3>
          </div>
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-x-2 gap-y-12 px-4 text-center sm:grid-cols-2 md:grid-cols-4">
            {teamMembers.map((member, index) => (
              <TeamMember key={member.name} {...member} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section
        className="relative flex flex-col justify-evenly overflow-hidden bg-background-1 py-20"
        ref={acknowledgementsRef}
      >
        <div className="z-10 mx-auto my-0 max-w-[1170px]">
          <div className="m-auto box-border w-auto px-4 md:w-2/3">
            <h3 className="text-center text-xl font-bold uppercase">
              Acknowledgments
            </h3>
            <p className="text-center text-primary/90">
              Many thanks to Lichess.org for providing the human games that we
              trained on and hosting our Maia models that you can play against.
              Ashton Anderson was supported in part by an NSERC grant, a
              Microsoft Research gift, and a CFI grant. Jon Kleinberg was
              supported in part by a Simons Investigator Award, a Vannevar Bush
              Faculty Fellowship, a MURI grant, and a MacArthur Foundation
              grant.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
