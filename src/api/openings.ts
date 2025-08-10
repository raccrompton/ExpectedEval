import { buildUrl } from './utils'

// API Types for opening drill logging
export interface OpeningDrillSelection {
  opening_fen: string
  side_played: string
}

export interface SelectOpeningDrillsRequest {
  openings: OpeningDrillSelection[]
  opponent: string
  num_moves: number
  num_drills: number
}

export interface SelectOpeningDrillsResponse {
  session_id: string
}

export interface SubmitOpeningDrillRequest {
  session_id: string
  opening_fen: string
  side_played: string
  moves_played_uci: string[]
}

// API function to log opening drill selections and start a session
export const selectOpeningDrills = async (
  request: SelectOpeningDrillsRequest,
): Promise<SelectOpeningDrillsResponse> => {
  const res = await fetch(buildUrl('opening/select_opening_drills'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    throw new Error(`Failed to select opening drills: ${res.statusText}`)
  }

  const data = await res.json()
  return data as SelectOpeningDrillsResponse
}

// API function to submit a completed opening drill
export const submitOpeningDrill = async (
  request: SubmitOpeningDrillRequest,
): Promise<void> => {
  const res = await fetch(buildUrl('opening/record_opening_drill'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (res.status === 401) {
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    throw new Error(`Failed to submit opening drill: ${res.statusText}`)
  }
}
