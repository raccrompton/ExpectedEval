/**
 * Tensor Preprocessing for Maia 3 Neural Network
 *
 * This file converts chess positions (FEN notation) into the token/tensor
 * format that the Maia 3 ONNX model expects.
 *
 * Key differences from Maia 2 (tensor.ts):
 * - Board tokens: (64, 12) layout — square-major, not channel-major
 *   i.e. tensor[square * 12 + pieceIdx] instead of tensor[pieceIdx * 64 + square]
 * - Move vocabulary: 4352 moves (maia3-specific) vs 1880 for maia2
 * - No ELO categories: Maia 3 uses a continuous ELO float, not discrete buckets
 * - Board is always from White's perspective: if it's Black's turn the FEN is
 *   mirrored before tokenization (same convention as Maia 2)
 *
 * Ported from maia-platform-frontend/src/lib/engine/tensor.ts.
 * Re-implemented legal-move generation using chessops (already a project
 * dependency) instead of chess.ts.
 */

import { Chess } from 'chessops/chess'
import { parseFen } from 'chessops/fen'
import { makeSquare } from 'chessops/util'
import { SquareSet } from 'chessops/squareSet'

import allPossibleMovesMaia3Dict from './all_moves_maia3.json'
import allPossibleMovesMaia3ReversedDict from './all_moves_maia3_reversed.json'

/** UCI move → index in the 4352-element output vector */
export const allPossibleMovesMaia3 = allPossibleMovesMaia3Dict as Record<
  string,
  number
>

/**
 * Number of moves in the Maia 3 move vocabulary.
 * Stored as a constant to avoid re-computing Object.keys() on every call.
 */
export const MAIA3_MOVE_VOCAB_SIZE = 4352

/** Index → UCI move (reverse lookup) */
export const allPossibleMovesMaia3Reversed =
  allPossibleMovesMaia3ReversedDict as Record<number, string>

// ---------------------------------------------------------------------------
// Board tokenisation
// ---------------------------------------------------------------------------

/**
 * Converts a FEN position to (64, 12) board tokens in square-major order.
 *
 * The tensor is a Float32Array of length 768 (64 × 12).
 * For each square (0 = a1, 63 = h8) the 12 elements are:
 *   [0] white P, [1] white N, [2] white B, [3] white R, [4] white Q, [5] white K,
 *   [6] black p, [7] black n, [8] black b, [9] black r, [10] black q, [11] black k
 *
 * The FEN is assumed to already be from White's perspective (mirror before
 * calling if it's Black's turn).
 *
 * Assumes a well-formed FEN piece-placement field; callers should pass FENs
 * already validated / produced by `preprocessMaia3` or `mirrorFEN`.
 *
 * @param fen - FEN string from White's perspective
 * @returns Float32Array of length 64 * 12 = 768
 */
export function boardToMaia3Tokens(fen: string): Float32Array {
  const piecePlacement = fen.split(' ')[0]

  // Piece order: white P,N,B,R,Q,K (indices 0-5), black p,n,b,r,q,k (indices 6-11)
  const pieceTypes = [
    'P', 'N', 'B', 'R', 'Q', 'K',
    'p', 'n', 'b', 'r', 'q', 'k',
  ]

  // (64, 12) flattened — square-major layout
  const tensor = new Float32Array(64 * 12)

  const rows = piecePlacement.split('/')

  // FEN lists ranks from rank 8 (index 0) down to rank 1 (index 7)
  for (let rank = 0; rank < 8; rank++) {
    // Adjust so that row 0 = rank 1 (a1 side), row 7 = rank 8
    const row = 7 - rank
    let file = 0

    for (const char of rows[rank]) {
      if (isNaN(parseInt(char))) {
        const pieceIdx = pieceTypes.indexOf(char)
        if (pieceIdx >= 0) {
          // square index: row * 8 + file  (a1=0, h1=7, a8=56, h8=63)
          const square = row * 8 + file
          tensor[square * 12 + pieceIdx] = 1.0
        }
        file += 1
      } else {
        file += parseInt(char)
      }
    }
  }

  return tensor
}

// ---------------------------------------------------------------------------
// Legal-move generation (chessops)
// ---------------------------------------------------------------------------

/**
 * Returns all legal moves for a position in UCI format (e.g. "e2e4", "e7e8q").
 * Promotions are expanded into all four promotion pieces (q, r, b, n).
 *
 * The FEN must already be from White's perspective.
 */
function getLegalMovesUci(fen: string): string[] {
  const setup = parseFen(fen)
  if (setup.isErr) {
    throw new Error(`Invalid FEN: ${fen}`)
  }
  const chess = Chess.fromSetup(setup.value)
  if (chess.isErr) {
    throw new Error(`Invalid position: ${chess.error}`)
  }

  const pos = chess.value
  const legalMoves: string[] = []
  const ctx = pos.ctx()

  // Hoisted: depends only on pos.turn, not on any individual move
  const backrank = pos.turn === 'white'
    ? SquareSet.fromRank(7)  // rank 8
    : SquareSet.fromRank(0)  // rank 1

  for (const [from, dests] of pos.allDests(ctx)) {
    const piece = pos.board.get(from)
    const isPawn = piece?.role === 'pawn'

    for (const to of dests) {
      const fromStr = makeSquare(from)
      const toStr = makeSquare(to)

      // Promotions: pawn reaching the far rank
      const isPromotion = isPawn && backrank.has(to)

      if (isPromotion) {
        legalMoves.push(`${fromStr}${toStr}q`)
        legalMoves.push(`${fromStr}${toStr}r`)
        legalMoves.push(`${fromStr}${toStr}b`)
        legalMoves.push(`${fromStr}${toStr}n`)
      } else {
        legalMoves.push(`${fromStr}${toStr}`)
      }
    }
  }

  return legalMoves
}

// ---------------------------------------------------------------------------
// FEN / move mirroring (shared with Maia 2, duplicated here for isolation)
// ---------------------------------------------------------------------------

/**
 * Mirrors a square on the board vertically (rank flip: 1↔8, 2↔7, …).
 * The file is unchanged.
 */
function mirrorSquare(square: string): string {
  const file = square.charAt(0)
  const rank = (9 - parseInt(square.charAt(1))).toString()
  return file + rank
}

/**
 * Mirrors a chess move in UCI notation vertically.
 * e2e4 ↔ e7e5, e7e8q → e2e1q, etc.
 */
export function mirrorMove(moveUci: string): string {
  const isPromotion = moveUci.length > 4
  const startSquare = moveUci.substring(0, 2)
  const endSquare = moveUci.substring(2, 4)
  const promotionPiece = isPromotion ? moveUci.substring(4) : ''

  return mirrorSquare(startSquare) + mirrorSquare(endSquare) + promotionPiece
}

/** Swaps uppercase ↔ lowercase in a FEN rank segment. */
function swapColorsInRank(rank: string): string {
  let swapped = ''
  for (const char of rank) {
    if (/[A-Z]/.test(char)) {
      swapped += char.toLowerCase()
    } else if (/[a-z]/.test(char)) {
      swapped += char.toUpperCase()
    } else {
      swapped += char
    }
  }
  return swapped
}

/** Swaps White ↔ Black castling rights. */
function swapCastlingRights(castling: string): string {
  if (castling === '-') return '-'

  const rights = new Set(castling.split(''))
  const swapped = new Set<string>()

  if (rights.has('K')) swapped.add('k')
  if (rights.has('Q')) swapped.add('q')
  if (rights.has('k')) swapped.add('K')
  if (rights.has('q')) swapped.add('Q')

  let output = ''
  if (swapped.has('K')) output += 'K'
  if (swapped.has('Q')) output += 'Q'
  if (swapped.has('k')) output += 'k'
  if (swapped.has('q')) output += 'q'

  return output === '' ? '-' : output
}

/**
 * Mirrors a FEN string vertically while swapping piece colors.
 *
 * Used to convert a Black-to-move position into an equivalent White-to-move
 * position. Maia 3 (like Maia 2) always evaluates from White's perspective.
 *
 * @param fen - Original FEN string
 * @returns Mirrored FEN string with active color swapped to the opposite side
 */
export function mirrorFEN(fen: string): string {
  const [position, activeColor, castling, enPassant, halfmove, fullmove] =
    fen.split(' ')

  const mirroredPosition = position
    .split('/')
    .reverse()
    .map(swapColorsInRank)
    .join('/')

  const mirroredActiveColor = activeColor === 'w' ? 'b' : 'w'
  const mirroredCastling = swapCastlingRights(castling)
  const mirroredEnPassant = enPassant !== '-' ? mirrorSquare(enPassant) : '-'

  return `${mirroredPosition} ${mirroredActiveColor} ${mirroredCastling} ${mirroredEnPassant} ${halfmove} ${fullmove}`
}

// ---------------------------------------------------------------------------
// Main preprocessing entry point
// ---------------------------------------------------------------------------

/**
 * Preprocesses a FEN position for Maia 3 inference.
 *
 * If it is Black's turn the board is mirrored to White's perspective before
 * tokenisation and legal-move generation (moves are mirrored accordingly).
 *
 * @param fen - FEN string for the position to analyse
 * @returns
 *   - `boardTokens`: Float32Array of length 768 (64 × 12)
 *   - `legalMoves`: Float32Array of length 4352 with 1.0 at each legal move index
 */
export function preprocessMaia3(fen: string): {
  boardTokens: Float32Array
  legalMoves: Float32Array
} {
  const activeColor = fen.split(' ')[1]

  if (activeColor !== 'w' && activeColor !== 'b') {
    throw new Error(`Invalid FEN (unexpected active color "${activeColor}"): ${fen}`)
  }

  // Mirror Black-to-move positions so the model always sees White to move
  const isBlackTurn = activeColor === 'b'
  const normalizedFen = isBlackTurn ? mirrorFEN(fen) : fen

  // Build (64, 12) board token tensor
  const boardTokens = boardToMaia3Tokens(normalizedFen)

  // Build legal-move mask over the 4352-move vocabulary
  const legalMoves = new Float32Array(MAIA3_MOVE_VOCAB_SIZE)

  for (const move of getLegalMovesUci(normalizedFen)) {
    // Black moves are already normalised (mirrored) inside normalizedFen,
    // so the UCI strings from getLegalMovesUci are already in White's frame.
    const moveIndex = allPossibleMovesMaia3[move]
    if (moveIndex !== undefined) {
      legalMoves[moveIndex] = 1.0
    }
  }

  return { boardTokens, legalMoves }
}
