const MIN = -8
const MAX = 0

export const normalize = (value: number, min: number, max: number) => {
  if (max == min) return 1
  return (value - min) / (max - min)
}

export const normalizeEvaluation = (
  value: number,
  min: number,
  max: number,
) => {
  if (max == min) return 1
  return MIN + (Math.abs(value - min) / Math.abs(max - min)) * (MAX - MIN)
}

export const pseudoNL = (value: number) => {
  if (value >= -1) return value / 2 - 0.5
  return value
}
