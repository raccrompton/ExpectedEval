import { ComponentProps, ReactNode, useState } from 'react'

import { Modals } from 'src/types'
import { useLocalStorage } from 'src/hooks'
import { ModalContext } from 'src/contexts'
import { PlaySetupModal } from 'src/components'

export const ModalContextProvider: React.FC<{ children: ReactNode }> = ({
  children,
}: {
  children: ReactNode
}) => {
  const [modals, setModals] = useLocalStorage<Modals>('client:modals', {
    againstMaia: false,
    handAndBrain: false,
    analysis: false,
    train: false,
    turing: false,
  })

  const [playSetupModalProps, setPlaySetupModalProps] = useState<
    ComponentProps<typeof PlaySetupModal> | undefined
  >(undefined)

  return (
    <ModalContext.Provider
      value={{
        openedModals: {
          againstMaia: modals.againstMaia,
          handAndBrain: modals.handAndBrain,
          analysis: modals.analysis,
          train: modals.train,
          turing: modals.turing,
        },
        setOpenedModals: setModals,
        playSetupModalProps,
        setPlaySetupModalProps,
      }}
    >
      {playSetupModalProps && <PlaySetupModal {...playSetupModalProps} />}
      {children}
    </ModalContext.Provider>
  )
}
