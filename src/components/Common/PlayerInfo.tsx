interface PlayerInfoProps {
  name: string
  color: string
  rating?: number
  termination?: string
  showArrowLegend?: boolean
  clock?: {
    timeInSeconds: number
    isActive: boolean
    lastUpdateTime: number
  }
}

import { useState, useEffect } from 'react'

export const PlayerInfo: React.FC<PlayerInfoProps> = ({
  name,
  rating,
  color,
  termination,
  showArrowLegend = false,
  clock,
}) => {
  const [currentTime, setCurrentTime] = useState<number>(
    clock?.timeInSeconds || 0,
  )

  // Update clock countdown every second if this clock is active
  useEffect(() => {
    if (!clock || !clock.isActive) return

    const interval = setInterval(() => {
      const now = Date.now()
      const elapsedSinceUpdate = (now - clock.lastUpdateTime) / 1000
      const newTime = Math.max(0, clock.timeInSeconds - elapsedSinceUpdate)
      setCurrentTime(newTime)
    }, 100) // Update every 100ms for smooth countdown

    return () => clearInterval(interval)
  }, [clock])

  // Update current time when clock prop changes (new move received)
  useEffect(() => {
    if (clock) {
      setCurrentTime(clock.timeInSeconds)
    }
  }, [clock?.timeInSeconds, clock?.lastUpdateTime])

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex h-10 w-full items-center justify-between bg-background-1 px-4">
      <div className="flex items-center gap-1.5">
        <div
          className={`h-2.5 w-2.5 rounded-full ${color === 'white' ? 'bg-white' : 'border bg-black'}`}
        />
        <p>
          {name ?? 'Unknown'} {rating ? `(${rating})` : null}
        </p>
      </div>
      <div className="flex items-center gap-4">
        {showArrowLegend && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-0.5">
              <span className="material-symbols-outlined !text-xxs text-human-3">
                arrow_outward
              </span>
              <span className="text-xxs text-human-3">Most Human Move</span>
            </div>
            <div className="flex items-center gap-0.5">
              <span className="material-symbols-outlined !text-xxs text-engine-3">
                arrow_outward
              </span>
              <span className="text-xxs text-engine-3">Best Engine Move</span>
            </div>
          </div>
        )}
        {clock && (
          <div className="flex items-center bg-primary px-2 py-0.5">
            <span
              className={`font-mono text-xs font-medium ${
                clock.isActive ? 'text-black' : 'text-black/60'
              } ${currentTime < 60 ? 'text-red-500' : ''}`}
            >
              {formatTime(currentTime)}
            </span>
          </div>
        )}

        {termination === color ? (
          <p className="text-engine-3">1</p>
        ) : termination === undefined ? (
          <></>
        ) : termination !== 'none' ? (
          <p className="text-human-3">0</p>
        ) : (
          <p className="text-secondary">½</p>
        )}
      </div>
    </div>
  )
}
