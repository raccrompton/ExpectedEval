import styles from './HorizontalEvaluationBar.module.scss'

interface Props {
  min?: number
  max?: number
  value?: number
  label?: string
}

export const HorizontalEvaluationBar: React.FC<Props> = ({
  min = 0,
  max = 1,
  value,
  label,
}: Props) => {
  let width = (((value ?? min) - min) / (max - min)) * 100
  width = Math.max(0, Math.min(100, width))

  return (
    <div className="relative flex h-6 w-[75vh] max-w-[70vw] flex-col justify-center overflow-hidden rounded-sm bg-engine-1">
      <div className="absolute left-0 top-0 z-0 h-full w-full bg-black bg-opacity-40" />
      <p className="z-10 ml-2 whitespace-nowrap text-sm">{label}</p>
      <div
        className="absolute bottom-0 left-0 z-0 h-full w-full transform rounded-r-sm bg-engine-1 duration-300"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
