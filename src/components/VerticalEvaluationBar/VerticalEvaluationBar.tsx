interface Props {
  min?: number
  max?: number
  value?: number
  label?: string
}

import styles from './VerticalEvaluationBar.module.scss'

export const VerticalEvaluationBar: React.FC<Props> = ({
  min = 0,
  max = 1,
  value,
  label,
}: Props) => {
  const height = ((value ?? min - min) / (max - min)) * 100

  return (
    <div className="relative flex h-[75vh] max-h-[70vw] w-6 flex-col justify-end overflow-hidden rounded-sm bg-human-4">
      <div className="absolute left-0 top-0 z-0 h-full w-full bg-black bg-opacity-40" />
      <p className="z-10 mb-2 -rotate-90 whitespace-nowrap text-sm">{label}</p>
      <div
        className="absolute bottom-0 left-0 z-0 h-full w-full transform rounded-t-sm bg-human-3 duration-300"
        style={{ height: `${height}%` }}
      />
    </div>
  )
}
