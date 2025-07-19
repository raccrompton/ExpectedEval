import React, { useState } from 'react'

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
      <div className="w-full max-w-md rounded-lg bg-background-1 p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Edit Favorite Game
        </h3>

        <div className="mb-4">
          <label
            htmlFor="favorite-name"
            className="mb-2 block text-sm text-secondary"
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
            className="w-full rounded border border-white border-opacity-20 bg-background-2 px-3 py-2 text-primary placeholder-secondary focus:border-opacity-40 focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 rounded bg-human-4 px-4 py-2 text-sm text-primary transition hover:bg-human-4/80 disabled:opacity-50"
          >
            Save
          </button>
          {onRemove && (
            <button
              onClick={handleRemove}
              className="rounded bg-red-600 px-4 py-2 text-sm text-white transition hover:bg-red-700"
            >
              Remove
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded border border-white border-opacity-20 px-4 py-2 text-sm text-secondary transition hover:bg-background-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
