export interface Opening {
  id: string
  name: string
  description: string
  fen: string
  pgn: string
  variations: OpeningVariation[]
}

export interface OpeningVariation {
  id: string
  name: string
  fen: string
  pgn: string
}
