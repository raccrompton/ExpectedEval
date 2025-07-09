import React, { ComponentProps } from 'react'

import { Modals } from 'src/types'
import { PlaySetupModal } from 'src/components'

const fn = () => {
  throw new Error('poorly provided ModalContext')
}

interface IModalContext {
  openedModals: Modals
  setOpenedModals: (arg0: Modals) => void
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
  setPlaySetupModalProps: fn,
})
