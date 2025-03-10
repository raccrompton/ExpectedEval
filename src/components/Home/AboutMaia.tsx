import Image from 'next/image'
import Link from 'next/link'

import personJon from './people/jon.jpg'
import personSid from './people/sid.jpeg'
import personReid from './people/reid.jpg'
import personIsaac from './people/isaac.jpg'
import personKevin from './people/kevin.jpg'
import personJoseph from './people/joseph.jpg'
import personAshton from './people/ashton.jpeg'
import personDmitriy from './people/dmitriy.jpg'
import { EnvelopeSquareIcon, GithubIcon } from 'src/components/Icons/icons'

export const AboutMaia = () => {
  return (
    <div className="font-helvetica [&_a]:text-human-3">
      <div className="flex flex-row items-center justify-center gap-10 bg-background-2 py-5 text-sm uppercase tracking-wider">
        <a href="#main_info" className="!text-primary">
          Project
        </a>
        <a href="#team_info" className="!text-primary">
          Team
        </a>
      </div>
      <section
        id="main_info"
        className="flex items-center justify-center bg-background-1 py-20 text-center"
      >
        <div className="mx-auto my-0 max-w-[1170px]">
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
              <Link
                href="/"
                className="rounded bg-human-3 p-4 !text-white transition-opacity hover:opacity-90"
              >
                Play Maia Chess
              </Link>
              <a
                target="_blank"
                rel="noreferrer"
                href="https://maiachess.com/maia-paper.pdf"
                className="rounded bg-engine-3 p-4 !text-white transition-opacity hover:opacity-90"
              >
                Read Paper
              </a>
            </div>
          </div>
        </div>
      </section>
      <section id="team_info" className="bg-background-2 py-20">
        <div className="mx-auto my-0 max-w-[1170px]">
          <div className="m-auto box-border w-auto px-4 md:w-2/3">
            <h3 className="text-center text-xl font-bold uppercase">Team</h3>
            <p className="mb-10 mt-2 text-center text-primary/90">
              The Maia team consists of students, postdocs, and faculty spanning
              Cornell University and the University of Toronto.
            </p>
          </div>
          <div className="mx-auto grid max-w-[900px] grid-cols-1 gap-10 px-4 text-center md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col items-center space-y-4">
              <Image
                src={personAshton}
                className="h-48 w-48 rounded-full"
                alt="Picture of Ashton Anderson"
              />
              <div className="flex flex-col">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="http://www.cs.toronto.edu/~ashton/"
                  className="text-2xl"
                >
                  Ashton Anderson
                </a>
                <p>University of Toronto</p>
              </div>
              <p className="font-semibold">Principal Investigator</p>
              <div className="flex items-center justify-center space-x-4">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="mailto:ashton@cs.toronto.edu"
                  className="*:h-5 *:w-5 *:fill-human-3"
                >
                  {EnvelopeSquareIcon}
                </a>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://github.com/ashtona"
                  className="*:h-5 *:w-5 *:fill-human-3"
                >
                  {GithubIcon}
                </a>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <Image
                src={personJon}
                className="h-48 w-48 rounded-full"
                alt="Picture of Jon Kleinberg"
              />
              <div className="flex flex-col">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://www.cs.cornell.edu/home/kleinber/"
                  className="text-2xl"
                >
                  Jon Kleinberg
                </a>
                <p>Cornell University</p>
              </div>
              <p className="font-semibold">Principal Investigator</p>
              <div className="flex items-center justify-center space-x-4">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="mailto:kleinber@cs.cornell.edu"
                  className="*:h-5 *:w-5 *:fill-human-3"
                >
                  {EnvelopeSquareIcon}
                </a>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <Image
                src={personReid}
                className="h-48 w-48 rounded-full"
                alt="Picture of Reid McIlroy-Young"
              />
              <div className="flex flex-col">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://reidmcy.com/"
                  className="text-2xl"
                >
                  Reid McIlroy-Young
                </a>
                <p>University of Toronto</p>
              </div>
              <p className="font-semibold">Graduate Student</p>
              <div className="flex items-center justify-center space-x-4">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="mailto:reid@cs.toronto.edu"
                  className="*:h-5 *:w-5 *:fill-human-3"
                >
                  {EnvelopeSquareIcon}
                </a>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://github.com/reidmcy"
                  className="*:h-5 *:w-5 *:fill-human-3"
                >
                  {GithubIcon}
                </a>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <Image
                src={personSid}
                className="h-48 w-48 rounded-full"
                alt="Picture of Siddhartha Sen"
              />
              <div className="flex flex-col">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://www.microsoft.com/en-us/research/people/sidsen/"
                  className="text-2xl"
                >
                  Siddhartha Sen
                </a>
                <p>Microsoft Research</p>
              </div>
              <p className="font-semibold">Principal Investigator</p>
              <div className="flex items-center justify-center space-x-4">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="mailto:sidsen@microsoft.com"
                  className="*:h-5 *:w-5 *:fill-human-3"
                >
                  {EnvelopeSquareIcon}
                </a>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://github.com/sidsen"
                  className="*:h-5 *:w-5 *:fill-human-3"
                >
                  {GithubIcon}
                </a>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <Image
                src={personDmitriy}
                className="h-48 w-48 rounded-full"
                alt="Picture of Dmitriy Ostrovsky"
              />
              <div className="flex flex-col">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://github.com/dostro"
                  className="text-2xl"
                >
                  Dmitriy Ostrovsky
                </a>
                <p>Independent Researcher</p>
              </div>
              <p className="font-semibold">Research Engineer</p>
              <div className="flex items-center justify-center space-x-4">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://github.com/dostro"
                  className="*:h-5 *:w-5 *:fill-human-3"
                >
                  {GithubIcon}
                </a>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <Image
                src={personJoseph}
                className="h-48 w-48 rounded-full"
                alt="Picture of Joseph Benton"
              />
              <div className="flex flex-col">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://github.com/jpbenton"
                  className="text-2xl"
                >
                  Joseph Benton
                </a>
                <p>University of Toronto</p>
              </div>
              <p className="font-semibold">Data Scientist</p>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <Image
                src={personIsaac}
                className="h-48 w-48 rounded-full"
                alt="Picture of Isaac Tamblyn"
              />
              <div className="flex flex-col">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://github.com/tamblyne"
                  className="text-2xl"
                >
                  Isaac Tamblyn
                </a>
                <p>National Research Council Canada</p>
              </div>
              <p className="font-semibold">Principal Investigator</p>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <Image
                src={personKevin}
                className="h-48 w-48 rounded-full"
                alt="Picture of Kevin Thomas"
              />
              <div className="flex flex-col">
                <a
                  target="_blank"
                  href="https://kevinjosethomas.com/"
                  className="text-2xl"
                >
                  Kevin Thomas
                </a>
                <p>Burnaby South Secondary</p>
              </div>
              <p className="font-semibold">Web Developer</p>
            </div>
          </div>
        </div>
      </section>
      <section className="flex flex-col justify-evenly bg-background-1 py-20">
        <div className="mx-auto my-0 max-w-[1170px]">
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
