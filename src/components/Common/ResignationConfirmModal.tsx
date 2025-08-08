interface ResignationConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export const ResignationConfirmModal: React.FC<
  ResignationConfirmModalProps
> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-sm rounded-lg bg-background-1 p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Confirm Resignation
        </h3>

        <p className="mb-6 text-sm text-secondary">
          Are you sure you want to resign this game? This action cannot be
          undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded border border-white border-opacity-20 px-4 py-2 text-sm text-secondary transition hover:bg-background-2"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded bg-red-600 px-4 py-2 text-sm text-white transition hover:bg-red-700"
          >
            Resign
          </button>
        </div>
      </div>
    </div>
  )
}
