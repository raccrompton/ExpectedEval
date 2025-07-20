import React from 'react'
import { useSettings } from 'src/contexts/SettingsContext'
import { useChessSoundManager } from 'src/lib/chessSoundManager'

export const SoundSettings: React.FC = () => {
  const { settings, updateSetting } = useSettings()
  const { playMoveSound } = useChessSoundManager()

  const handleToggleSound = () => {
    const newValue = !settings.soundEnabled
    updateSetting('soundEnabled', newValue)
  }

  const handleTestSound = () => {
    if (settings.soundEnabled) {
      playMoveSound(false) // Test regular move sound
    }
  }

  const handleTestCaptureSound = () => {
    if (settings.soundEnabled) {
      playMoveSound(true) // Test capture sound
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-background-1 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sound Settings</h3>
      </div>

      <div className="flex flex-col gap-4">
        {/* Sound Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Enable Move Sounds</span>
            <p className="text-xs text-secondary">
              Play sounds when chess pieces are moved or captured
            </p>
          </div>
          <label
            htmlFor="sound-toggle"
            className="relative inline-flex cursor-pointer items-center"
          >
            <input
              id="sound-toggle"
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={handleToggleSound}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full border-0 bg-background-3 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-human-4/50 peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:after:bg-human-3 peer-focus:outline-none"></div>
            <span className="sr-only">Toggle move sounds</span>
          </label>
        </div>

        {/* Test Buttons */}
        {settings.soundEnabled && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-secondary">Test sounds:</p>
            <div className="flex gap-2">
              <button
                onClick={handleTestSound}
                className="flex items-center gap-2 rounded bg-background-2 px-3 py-2 text-sm hover:bg-background-3"
              >
                <span className="material-symbols-outlined text-base">
                  volume_up
                </span>
                Move Sound
              </button>
              <button
                onClick={handleTestCaptureSound}
                className="flex items-center gap-2 rounded bg-background-2 px-3 py-2 text-sm hover:bg-background-3"
              >
                <span className="material-symbols-outlined text-base">
                  volume_up
                </span>
                Capture Sound
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
