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
    <div className="relative flex h-6 w-[55vh] max-w-[55vw] flex-col justify-center overflow-hidden bg-human-3/30">
      <p className="z-10 ml-2 whitespace-nowrap text-xs">{label}</p>
      <div
        className="absolute left-0 top-0 z-0 h-full w-full transform bg-human-3 duration-300"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
