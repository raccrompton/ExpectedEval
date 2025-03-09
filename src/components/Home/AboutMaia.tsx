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
    <div className="font-helvetica [&_a]:text-blue-500">
      <div className="flex flex-row items-center justify-center gap-10 bg-white py-5 text-sm uppercase tracking-wider">
        <a href="#main_info" className="!text-black">
          Project
        </a>
        <a href="#team" className="!text-black">
          Team
        </a>
        <a
          id="#code"
          target="_blank"
          rel="noreferrer"
          href="https://github.com/CSSLab/maia-chess"
          className="flex flex-row items-center justify-start gap-2"
        >
          <i className="flex [&>*]:!fill-black">{GithubIcon}</i>{' '}
          <span className="!text-black">Code</span>
        </a>
        <a
          id="#email"
          target="_blank"
          rel="noreferrer"
          href="https://forms.gle/jaQfzSGmaeMcu2UA7"
          className="flex flex-row items-center justify-start gap-2"
        >
          <i className="flex text-black [&>*]:!fill-black">
            {EnvelopeSquareIcon}
          </i>{' '}
          <span className="!text-black">Email list</span>
        </a>
      </div>
      <section
        id="team"
        className="flex min-h-[60vh] flex-col justify-evenly bg-white py-20 text-black"
      >
        <div className="mx-auto my-0 max-w-[1170px]">
          <div>
            <h3 className="text-center text-xl font-bold uppercase">Team</h3>
            <div className="flex flex-col items-center justify-center text-center md:flex-row md:flex-wrap md:items-stretch md:justify-between">
              <div className="flex min-w-[270px] flex-col items-center justify-center gap-3 pb-16">
                <Image
                  src={personAshton}
                  alt="Picture of Ashton Anderson"
                  className="h-48 w-48 rounded-full"
                />
                <div className="flex flex-col">
                  <a
                    target="_blank"
                    href="http://www.cs.toronto.edu/~ashton/"
                    className="text-2xl"
                  >
                    Ashton Anderson
                  </a>

                  <p>University of Toronto</p>
                </div>
                <p className="font-semibold">Project Lead</p>
              </div>
              <div className="flex min-w-[270px] flex-col items-center justify-center gap-3 pb-16">
                <Image
                  src={personReid}
                  alt="Picture of Reid McIlroy-Young"
                  className="h-48 w-48 rounded-full"
                />
                <div className="flex flex-col">
                  <a
                    target="_blank"
                    href="https://reidmcy.com"
                    className="text-2xl"
                  >
                    Reid McIlroy-Young
                  </a>

                  <p>University of Toronto</p>
                </div>
                <p className="font-semibold">Head Developer</p>
              </div>
              <div className="flex min-w-[270px] flex-col items-center justify-center gap-3 pb-16">
                <Image
                  src={personJon}
                  alt="Picture of Jon Kleinberg"
                  className="h-48 w-48 rounded-full"
                />
                <div className="flex flex-col">
                  <a
                    target="_blank"
                    href="http://www.cs.cornell.edu/home/kleinber"
                    className="text-2xl"
                  >
                    Jon Kleinberg
                  </a>

                  <p>Cornell University</p>
                </div>
                <p className="font-semibold">Collaborator</p>
              </div>
              <div className="flex min-w-[270px] flex-col items-center justify-center gap-3 pb-16">
                <Image
                  src={personSid}
                  alt="Picture of Siddhartha Sen"
                  className="h-48 w-48 rounded-full"
                />
                <div className="flex flex-col">
                  <a
                    target="_blank"
                    href="http://sidsen.org"
                    className="text-2xl"
                  >
                    Siddhartha Sen
                  </a>

                  <p>Microsoft Research</p>
                </div>
                <p className="font-semibold">Collaborator</p>
              </div>
              <div className="flex min-w-[270px] flex-col items-center justify-center gap-3 pb-16">
                <Image
                  src={personJoseph}
                  alt="Picture of Joseph Tang"
                  className="h-48 w-48 rounded-full"
                />
                <div className="flex flex-col">
                  <a
                    target="_blank"
                    href="https://lilv98.github.io/"
                    className="text-2xl"
                  >
                    Joseph Tang
                  </a>

                  <p>University of Toronto</p>
                </div>
                <p className="font-semibold">Model Developer</p>
              </div>
              <div className="flex min-w-[270px] flex-col items-center justify-center gap-3 pb-16">
                <Image
                  src={personIsaac}
                  alt="Picture of Isaac Waller"
                  className="h-48 w-48 rounded-full"
                />
                <div className="flex flex-col">
                  <a
                    target="_blank"
                    href="https://waller.is/"
                    className="text-2xl"
                  >
                    Isaac Waller
                  </a>

                  <p>University of Toronto</p>
                </div>
                <p className="font-semibold">Web Developer</p>
              </div>
              <div className="flex min-w-[270px] flex-col items-center justify-center gap-3 pb-16">
                <Image
                  src={personDmitriy}
                  className="h-48 w-48 rounded-full"
                  alt="Picture of Dmitriy Prokopchuk"
                />
                <div className="flex flex-col">
                  <a
                    target="_blank"
                    href="https://prokopchukdim.github.io/"
                    className="text-2xl"
                  >
                    Dmitriy Prokopchuk
                  </a>

                  <p>University of Toronto</p>
                </div>
                <p className="font-semibold">Web Developer</p>
              </div>
              <div className="flex min-w-[270px] flex-col items-center justify-center gap-3 pb-16">
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
        </div>
      </section>
      <section className="flex flex-col justify-evenly bg-white py-20 text-black">
        <div className="mx-auto my-0 max-w-[1170px]">
          <div className="m-auto box-border w-auto px-4 md:w-2/3">
            <h3 className="text-center text-xl font-bold uppercase">
              Acknowledgments
            </h3>
            <p className="text-center">
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
