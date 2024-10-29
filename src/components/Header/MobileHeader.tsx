/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import Link from 'next/link'
import Image from 'next/image'
import classNames from 'classnames'
import { useRouter } from 'next/router'

import styles from './Header.module.scss'

type Props = {
    use
  showMenu: boolean
  setShowMenu: (show: boolean) => void
}

export const MobileHeader: React.FC = ({ showMenu, setShowMenu }: Props) => {
  const router = useRouter()
  return (

  )
}

// <div className="flex w-[90%] flex-row items-center justify-between">
//   <div className="flex flex-row items-center justify-start gap-6">
// <Link href="/" passHref>
//   <div className="flex flex-row items-center gap-2">
//     <Image src="/maia.png" width={40} height={40} alt="Maia Logo" />
//     <h2 className="text-2xl font-bold">Maia Chess</h2>
//   </div>
// </Link>
// <div className="hidden flex-row gap-1 *:px-2 *:py-1 md:flex">
//   {user?.lichessId ? (
//     <div
//       className={`${router.pathname.startsWith('/play') && 'bg-background-1'} group relative`}
//     >
//       <button>PLAY</button>
//       <div className="absolute left-0 top-[100%] z-30 hidden w-48 flex-col items-start bg-background-1 group-hover:flex">
//         <button
//           onClick={() => startGame('againstMaia')}
//           className="flex w-full items-center justify-start px-3 py-2 hover:bg-background-2"
//         >
//           Play Maia
//         </button>
//         <a
//           className="flex w-full items-center justify-start px-3 py-2 hover:bg-background-2"
//           href="https://lichess.org/@/maia1"
//           target="_blank"
//           rel="noreferrer"
//         >
//           Play Maia on Lichess
//         </a>
//         <button
//           onClick={() => startGame('handAndBrain')}
//           className="flex w-full items-center justify-start px-3 py-2 hover:bg-background-2"
//         >
//           Play Hand and Brain
//         </button>
//       </div>
//     </div>
//   ) : (
//     <a
//       target="_blank"
//       rel="noreferrer"
//       href="https://lichess.org/@/maia1"
//     >
//       Play
//     </a>
//   )}
//   <Link
//     href="/analysis"
//     className={`${router.pathname.startsWith('/analysis') && styles.selected} uppercase hover:bg-background-1`}
//   >
//     Analysis
//   </Link>
//   <Link
//     href="/train"
//     className={`${router.pathname.startsWith('/train') && styles.selected} uppercase hover:bg-background-1`}
//   >
//     Train
//   </Link>
//   <Link
//     href="/turing"
//     className={`${router.pathname.startsWith('/turing') && styles.selected} uppercase hover:bg-background-1`}
//   >
//     Bot-or-not
//   </Link>
//   <Link
//     href="/leaderboard"
//     className={`${router.pathname.startsWith('/leaderboard') && styles.selected} uppercase hover:bg-background-1`}
//   >
//     Leaderboard
//   </Link>
//   <Link
//     href="/blog"
//     className={`${router.pathname.startsWith('/blog') && styles.selected} uppercase hover:bg-background-1`}
//   >
//     Blog
//   </Link>
//   <a
//     target="_blank"
//     rel="noreferrer"
//     href="https://twitch.tv/maiachess"
//     className="uppercase hover:bg-background-1"
//   >
//     WATCH
//   </a>
//   <a
//     target="_blank"
//     rel="noreferrer"
//     href="https://forms.gle/XYeoTJF4YgUu4Vq28"
//     className="uppercase hover:bg-background-1"
//   >
//     FEEDBACK
//   </a>
// </div>
//   </div>
//   <div className="hidden flex-row items-center gap-3 md:flex">
//     <ThemeButton />
//     <a
//       target="_blank"
//       rel="noreferrer"
//       href="https://discord.gg/Az93GqEAs7"
//     >
//       {DiscordIcon}
//     </a>
//     {userInfo}
//   </div>
//   <button
//     className={styles.button}
//     onClick={() => setShowMenu((show) => !show)}
//   >
//     {MenuIcon}
//   </button>
// </div>
