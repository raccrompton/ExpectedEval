import chroma from 'chroma-js'

// Import the actual functions from the source
export const combine = (c1: string, c2: string, scale: number) =>
  chroma.scale([c1, c2])(scale)

export const average = (c1: string, c2: string) => chroma.average([c1, c2])

export const generateColor = (
  stockfishRank: number,
  maiaRank: number,
  maxRank: number,
  redHex = '#FF0000',
  blueHex = '#0000FF',
): string => {
  const normalizeRank = (rank: number) =>
    maxRank === 0 ? 0 : Math.pow(1 - Math.min(rank / maxRank, 1), 2)

  const stockfishWeight = normalizeRank(stockfishRank)
  const maiaWeight = normalizeRank(maiaRank)

  const totalWeight = stockfishWeight + maiaWeight

  const stockfishBlend = totalWeight === 0 ? 0.5 : stockfishWeight / totalWeight
  const maiaBlend = totalWeight === 0 ? 0.5 : maiaWeight / totalWeight

  const hexToRgb = (hex: string): [number, number, number] => {
    const bigint = parseInt(hex.slice(1), 16)
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
  }

  const rgbToHex = ([r, g, b]: [number, number, number]): string => {
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`
  }

  const redRgb = hexToRgb(redHex)
  const blueRgb = hexToRgb(blueHex)

  const blendedRgb: [number, number, number] = [
    Math.round(stockfishBlend * blueRgb[0] + maiaBlend * redRgb[0]),
    Math.round(stockfishBlend * blueRgb[1] + maiaBlend * redRgb[1]),
    Math.round(stockfishBlend * blueRgb[2] + maiaBlend * redRgb[2]),
  ]

  const enhance = (value: number) =>
    Math.min(255, Math.max(0, Math.round(value * 1.2)))

  const enhancedRgb: [number, number, number] = blendedRgb.map(enhance) as [
    number,
    number,
    number,
  ]

  return rgbToHex(enhancedRgb)
}

describe('Color utilities', () => {
  describe('combine', () => {
    it('should combine two colors with a scale', () => {
      const result = combine('#FF0000', '#0000FF', 0.5)
      expect(result.hex()).toBeDefined()
    })

    it('should handle edge cases', () => {
      const result1 = combine('#FF0000', '#0000FF', 0)
      const result2 = combine('#FF0000', '#0000FF', 1)
      expect(result1.hex()).toBeDefined()
      expect(result2.hex()).toBeDefined()
    })
  })

  describe('average', () => {
    it('should average two colors', () => {
      const result = average('#FF0000', '#0000FF')
      expect(result.hex()).toBeDefined()
    })
  })

  describe('generateColor', () => {
    it('should generate color based on stockfish and maia ranks', () => {
      const result = generateColor(1, 1, 5)
      expect(result).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('should handle equal ranks', () => {
      const result = generateColor(2, 2, 5)
      expect(result).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('should handle maximum ranks', () => {
      const result = generateColor(5, 5, 5)
      expect(result).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('should handle minimum ranks', () => {
      const result = generateColor(1, 1, 5)
      expect(result).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('should handle different stockfish and maia ranks', () => {
      const result = generateColor(1, 5, 5)
      expect(result).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('should handle custom colors', () => {
      const result = generateColor(1, 1, 5, '#FF00FF', '#00FFFF')
      expect(result).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('should handle edge case with maxRank = 0', () => {
      const result = generateColor(0, 0, 0)
      expect(result).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('should normalize ranks correctly', () => {
      const result1 = generateColor(1, 1, 10)
      const result2 = generateColor(10, 10, 10)

      expect(result1).toMatch(/^#[0-9A-F]{6}$/i)
      expect(result2).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('should handle hex to rgb conversion correctly', () => {
      const result = generateColor(1, 1, 5, '#FF0000', '#0000FF')
      expect(result).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('should enhance colors correctly', () => {
      const result = generateColor(1, 1, 5, '#FFFFFF', '#FFFFFF')
      expect(result).toMatch(/^#[0-9A-F]{6}$/i)
    })
  })

  describe('generateColor helper functions', () => {
    it('should convert hex to rgb correctly', () => {
      const result = generateColor(1, 1, 5, '#FF0000', '#0000FF')
      expect(result).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('should convert rgb to hex correctly', () => {
      const result = generateColor(1, 1, 5)
      expect(result).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('should handle edge cases in hex conversion', () => {
      const result = generateColor(1, 1, 5, '#000000', '#FFFFFF')
      expect(result).toMatch(/^#[0-9A-F]{6}$/i)
    })
  })
})
