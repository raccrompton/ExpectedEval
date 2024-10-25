/* eslint-disable @typescript-eslint/ban-ts-comment */
import chroma from 'chroma-js'
import { normalize } from '..'
import { distToLine } from '../math'

export const combine = (c1: string, c2: string, scale: number) =>
  chroma.scale([c1, c2])(scale)

export const average = (c1: string, c2: string) => chroma.average([c1, c2])

export const computeColour = (nx: number, ny: number) => {
  const distToNx = distToLine([nx, ny], [1, 1, -1])
  const distToPx = distToLine([nx, ny], [-1, 1, 0])
  const sqrt2 = Math.sqrt(2)
  const normalizedNx = normalize(distToNx, -sqrt2 / 2, sqrt2 / 2)
  const normalizedPx = normalize(distToPx, -sqrt2 / 2, sqrt2 / 2)
  //   return combine('#000000', '#FFFFFF', normalizedNx).alpha(normalizedNx).hex()

  return combine(
    combine('#000000', '#FFFFFF', normalizedNx).alpha(normalizedNx).hex(),
    combine('#00FFE0', '#FF7A00', normalizedPx + 0.3).hex(),
    normalizedNx,
  ).hex()
}
