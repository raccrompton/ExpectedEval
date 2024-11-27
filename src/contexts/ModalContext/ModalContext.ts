import React, { ComponentProps } from 'react'

import { Modals } from 'src/types'
import { InstructionsModal, PlaySetupModal } from 'src/components'

const fn = () => {
  throw new Error('poorly provided ModalContext')
}

interface IModalContext {
  openedModals: Modals
  setOpenedModals: (arg0: Modals) => void
  instructionsModalProps?: ComponentProps<typeof InstructionsModal>
  setInstructionsModalProps: (
    arg0?: ComponentProps<typeof InstructionsModal>,
  ) => void
  playSetupModalProps?: ComponentProps<typeof PlaySetupModal>
  setPlaySetupModalProps: (arg0?: ComponentProps<typeof PlaySetupModal>) => void
}

export const ModalContext = React.createContext<IModalContext>({
  openedModals: {
    againstMaia: false,
    handAndBrain: false,
    analysis: false,
    train: false,
    turing: false,
  },
  setOpenedModals: fn,
  setInstructionsModalProps: fn,
  setPlaySetupModalProps: fn,
})
