import React, { useState, useEffect } from 'react'

interface FavoriteModalProps {
  isOpen: boolean
  currentName: string
  onClose: () => void
  onSave: (name: string) => void
  onRemove?: () => void
}

export const FavoriteModal: React.FC<FavoriteModalProps> = ({
  isOpen,
  currentName,
  onClose,
  onSave,
  onRemove,
}) => {
  const [name, setName] = useState(currentName)

  // Reset the name when modal opens with a new currentName
  useEffect(() => {
    if (isOpen) {
      setName(currentName)
    }
  }, [isOpen, currentName])

  if (!isOpen) return null

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim())
      onClose()
    }
  }

  const handleRemove = () => {
    if (onRemove) {
      onRemove()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-sm rounded-lg bg-background-1 p-4 shadow-lg">
        <h3 className="mb-3 text-base font-semibold text-primary">
          Edit Favourite Game
        </h3>

        <div className="mb-3">
          <label
            htmlFor="favorite-name"
            className="mb-1 block text-xs text-secondary"
          >
            Custom Name
          </label>
          <input
            id="favorite-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Enter custom name for this game"
            className="w-full rounded border border-white border-opacity-20 bg-background-2 px-2 py-1.5 text-sm text-primary placeholder-secondary focus:border-opacity-40 focus:outline-none"
          />
        </div>

        <div className="flex gap-1">
          <button
            onClick={onClose}
            className="rounded border border-white border-opacity-20 px-3 py-1.5 text-xs text-secondary transition hover:bg-background-2"
          >
            Cancel
          </button>

          {onRemove && (
            <button
              onClick={handleRemove}
              className="rounded border border-white border-opacity-20 px-3 py-1.5 text-xs text-white transition hover:bg-background-2"
            >
              Remove
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 rounded bg-human-4 px-3 py-1.5 text-xs text-primary transition hover:bg-human-4/80 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
