import { useEffect } from 'react'
import { AnimatePresence, progress } from 'framer-motion'

export interface Props {
  progress: number
  download: () => Promise<void>
}

export const DownloadModelModal: React.FC<Props> = ({
  progress,
  download,
}: Props) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  console.log(progress)

  return (
    <AnimatePresence>
      <div className="absolute left-0 top-0 z-20 flex h-screen w-screen flex-col items-center justify-center bg-black/90">
        <div
          style={{ width: 'min(750px, 50vw)' }}
          className="flex flex-col gap-5 rounded-md border border-background-1 bg-backdrop p-8"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl">
              auto_awesome
            </span>
            <h1 className="text-3xl font-bold">Download Our New Model</h1>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-primary/80">
              Our newest model, Maia 2, provides richer and more in-depth
              analysis, allowing for:
            </p>
            <ul className="flex list-inside flex-col gap-1.5 pl-2 text-primary/80">
              <li>
                ✨ Detailed move evaluations tailored to different rating levels
              </li>
              <li>
                🧠 Insights into how players of various strengths approach the
                game
              </li>
              <li>
                ⚡ Faster, local analysis without needing to send data to a
                server
              </li>
            </ul>
            <p className="text-primary/80">
              Maia 2 will run entirely on your device but requires a one-time
              90mb download. If you prefer to use our older analysis, you can
              still use our Legacy Analysis page.
            </p>
          </div>
          <div className="mt-6 flex flex-row items-center justify-end gap-2">
            {progress ? (
              <div className="flex h-10 flex-1 items-center overflow-hidden rounded bg-human-4/20">
                <div
                  className="h-10 rounded-l bg-human-4/80"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
            <div
              tabIndex={0}
              role="button"
              className="flex h-10 cursor-pointer select-none items-center gap-1 self-end rounded bg-human-4 px-4 transition duration-200 hover:bg-human-4/90"
              onClick={download}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  download()
                }
              }}
            >
              <span className="material-symbols-outlined">download</span>
              <p>
                Download Maia 2{' '}
                <span className="text-xs text-primary/60">(90mb)</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  )
}
