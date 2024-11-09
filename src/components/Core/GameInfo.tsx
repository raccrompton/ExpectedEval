import { useContext } from 'react'

import { ModalContext } from 'src/contexts'
import { InstructionsType } from 'src/components/modals/InstructionsModal'

interface Props {
  icon: string
  title: string
  type: InstructionsType
  children: React.ReactNode
}

export const GameInfo: React.FC<Props> = ({
  icon,
  title,
  type,
  children,
}: Props) => {
  const { setInstructionsModalProps } = useContext(ModalContext)
  return (
    <div className="flex w-full flex-col items-start justify-start gap-1 overflow-hidden bg-background-1 p-3 md:rounded">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center justify-start gap-1.5">
          <span className="material-symbols-outlined text-xl">{icon}</span>
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        <button
          className="material-symbols-outlined duration-200 hover:text-human-3"
          onClick={() => {
            setInstructionsModalProps({ instructionsType: type })
          }}
        >
          help
        </button>
      </div>
      <div className="flex w-full flex-col">{children}</div>
    </div>
  )
}
