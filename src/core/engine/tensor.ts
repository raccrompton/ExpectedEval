/**
 * Tensor Preprocessing for Maia Neural Network
 *
 * This file converts chess positions (FEN notation) into tensor format
 * that the Maia ONNX model can understand. Neural networks don't understand
 * chess notation directly - they need numerical arrays (tensors).
 *
 * The Maia model expects an 18-channel 8x8 tensor:
 * - Channels 0-5:   White pieces (P, N, B, R, Q, K)
 * - Channels 6-11:  Black pieces (p, n, b, r, q, k)
 * - Channel 12:     Side to move (1.0 for White, 0.0 for Black)
 * - Channels 13-16: Castling rights (K, Q, k, q)
 * - Channel 17:     En passant square
 *
 * Each channel is an 8x8 grid where 1.0 = piece/right present, 0.0 = absent.
 *
 * @example
 * // Convert starting position to tensor
 * const tensor = boardToTensor('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
 * // tensor is a Float32Array of length 1152 (18 * 8 * 8)
 */

// Import the move dictionaries that map UCI moves to indices
// These are used to convert model output back to move notation
import allPossibleMovesDict from './data/all_moves.json'
import allPossibleMovesReversedDict from './data/all_moves_reversed.json'

// Type the imported JSON as proper TypeScript records
// allPossibleMoves: "e2e4" → 123 (UCI move to array index)
const allPossibleMoves = allPossibleMovesDict as Record<string, number>
// allPossibleMovesReversed: 123 → "e2e4" (array index to UCI move)
const allPossibleMovesReversed = allPossibleMovesReversedDict as Record<
  number,
  string
>

// Pre-compute the ELO category dictionary at module load time
// This maps ELO ranges to integer category indices for the model
const eloDict = createEloDict()

/**
 * Converts a chess board position in FEN notation to a tensor representation.
 *
 * FEN (Forsyth-Edwards Notation) is a standard way to describe chess positions.
 * Example: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
 *
 * The tensor is a flat array of 18 * 8 * 8 = 1152 floats.
 * Each "channel" represents a different piece type or game state.
 *
 * @param fen - The FEN string representing the chess board position
 * @returns A Float32Array representing the tensor of the board position
 *
 * @example
 * const tensor = boardToTensor('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
 * console.log(tensor.length) // 1152
 */
function boardToTensor(fen: string): Float32Array {
  // Split FEN into its 6 components:
  // [0] piece placement, [1] active color, [2] castling, [3] en passant, [4] halfmove, [5] fullmove
  const tokens = fen.split(' ')
  const piecePlacement = tokens[0]    // e.g., "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"
  const activeColor = tokens[1]        // "w" or "b"
  const castlingAvailability = tokens[2] // e.g., "KQkq" or "-"
  const enPassantTarget = tokens[3]    // e.g., "e3" or "-"

  // Define the 12 piece types in the order they appear in the tensor
  // First 6 are White pieces (uppercase), last 6 are Black (lowercase)
  const pieceTypes = [
    'P', 'N', 'B', 'R', 'Q', 'K',  // White: Pawn, Knight, Bishop, Rook, Queen, King
    'p', 'n', 'b', 'r', 'q', 'k',  // Black: pawn, knight, bishop, rook, queen, king
  ]

  // Create the tensor: 18 channels × 64 squares = 1152 values
  // Initialize all values to 0.0
  const tensor = new Float32Array((12 + 6) * 8 * 8)

  // Parse the piece placement string (ranks separated by '/')
  // FEN lists from rank 8 (top) to rank 1 (bottom)
  const rows = piecePlacement.split('/')

  // Fill in piece positions (channels 0-11)
  for (let rank = 0; rank < 8; rank++) {
    // FEN rank 0 is actually rank 8 (top of board)
    // We need to flip because tensor indexing starts from bottom (rank 1)
    const row = 7 - rank
    let file = 0  // File 0 = 'a', File 7 = 'h'

    // Process each character in this rank's FEN segment
    for (const char of rows[rank]) {
      if (isNaN(parseInt(char))) {
        // Character is a piece letter (P, N, B, R, Q, K, p, n, b, r, q, k)
        // Find which piece type it is (0-11)
        const index = pieceTypes.indexOf(char)
        // Calculate position in the flat tensor array
        // Each piece type has 64 squares (8x8), then row*8+file within that channel
        const tensorIndex = index * 64 + row * 8 + file
        tensor[tensorIndex] = 1.0  // Mark this square as occupied by this piece
        file += 1
      } else {
        // Character is a digit representing empty squares (1-8)
        file += parseInt(char)
      }
    }
  }

  // Channel 12: Player's turn
  // Fill entire channel with 1.0 for White's turn, 0.0 for Black's turn
  const turnChannelStart = 12 * 64  // Start of channel 12
  const turnChannelEnd = turnChannelStart + 64
  const turnValue = activeColor === 'w' ? 1.0 : 0.0
  tensor.fill(turnValue, turnChannelStart, turnChannelEnd)

  // Channels 13-16: Castling rights
  // Each castling right gets its own channel (K, Q, k, q)
  const castlingRights = [
    castlingAvailability.includes('K'),  // White kingside
    castlingAvailability.includes('Q'),  // White queenside
    castlingAvailability.includes('k'),  // Black kingside
    castlingAvailability.includes('q'),  // Black queenside
  ]

  for (let i = 0; i < 4; i++) {
    if (castlingRights[i]) {
      // If this castling right exists, fill entire channel with 1.0
      const channelStart = (13 + i) * 64
      const channelEnd = channelStart + 64
      tensor.fill(1.0, channelStart, channelEnd)
    }
    // If right doesn't exist, channel stays 0.0 (initialized above)
  }

  // Channel 17: En passant target square
  // Only one square (if any) will be set to 1.0
  const epChannel = 17 * 64
  if (enPassantTarget !== '-') {
    // Parse the en passant square (e.g., "e3")
    // 'a' is file 0, 'h' is file 7
    const file = enPassantTarget.charCodeAt(0) - 'a'.charCodeAt(0)
    // '1' is rank 0, '8' is rank 7
    const rank = parseInt(enPassantTarget[1], 10) - 1
    // Mark this square in the en passant channel
    const index = epChannel + rank * 8 + file
    tensor[index] = 1.0
  }

  return tensor
}

/**
 * Preprocesses input data for the Maia ONNX model.
 *
 * The Maia model needs several inputs:
 * 1. Board tensor (18 channels × 8 × 8)
 * 2. ELO category for the player (integer)
 * 3. ELO category for the opponent (integer)
 * 4. Legal moves mask (array of 0s and 1s)
 *
 * IMPORTANT: Maia always evaluates from White's perspective.
 * If it's Black's turn, we mirror the board to pretend White is playing.
 * This is called "perspective normalization".
 *
 * @param fen - The FEN string representing the board position
 * @param eloSelf - The ELO rating of the player making the move
 * @param eloOppo - The ELO rating of the opponent
 * @param legalMoves - Array of legal moves in UCI format (e.g., ['e2e4', 'd2d4'])
 * @returns Preprocessed data ready for model inference
 *
 * @example
 * const result = preprocess(
 *   'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
 *   1500,
 *   1500,
 *   ['e2e4', 'd2d4', 'g1f3', ...]
 * )
 */
function preprocess(
  fen: string,
  eloSelf: number,
  eloOppo: number,
  legalMoves: string[],
): {
  boardInput: Float32Array
  eloSelfCategory: number
  eloOppoCategory: number
  legalMovesMask: Float32Array
} {
  // Determine if it's Black's turn
  const isBlackTurn = fen.split(' ')[1] === 'b'

  // If it's Black's turn, mirror the FEN to evaluate from White's perspective
  // This is how Maia was trained - it always "thinks" as White
  const normalizedFen = isBlackTurn ? mirrorFEN(fen) : fen

  // Convert the (possibly mirrored) board to tensor format
  const boardInput = boardToTensor(normalizedFen)

  // Map ELO ratings to discrete categories (model expects integers)
  const eloSelfCategory = mapToCategory(eloSelf, eloDict)
  const eloOppoCategory = mapToCategory(eloOppo, eloDict)

  // Create a mask indicating which moves are legal
  // The model outputs probabilities for ALL possible moves (1880 total)
  // We mask illegal moves so they get 0 probability
  const legalMovesMask = new Float32Array(Object.keys(allPossibleMoves).length)

  for (const move of legalMoves) {
    // If Black's turn, mirror the move coordinates too
    // (e.g., e7e5 becomes e2e4 after mirroring)
    const normalizedMove = isBlackTurn ? mirrorMove(move) : move
    const moveIndex = allPossibleMoves[normalizedMove]

    if (moveIndex !== undefined) {
      legalMovesMask[moveIndex] = 1.0
    }
  }

  return {
    boardInput,
    eloSelfCategory,
    eloOppoCategory,
    legalMovesMask,
  }
}

/**
 * Maps an ELO rating to a predefined category based on 100-point intervals.
 *
 * The Maia model was trained on games grouped by ELO ranges:
 * - Category 0: < 1100
 * - Category 1: 1100-1199
 * - Category 2: 1200-1299
 * - ...and so on...
 * - Category 10: >= 2000
 *
 * @param elo - The ELO rating to categorize
 * @param eloDict - Dictionary mapping ELO ranges to category indices
 * @returns The category index (0-10)
 *
 * @example
 * mapToCategory(1500, eloDict) // returns 5 (for 1500-1599 range)
 */
function mapToCategory(elo: number, eloDict: Record<string, number>): number {
  const interval = 100  // ELO ranges are 100 points wide
  const start = 1100    // First tracked ELO range
  const end = 2000      // Last tracked ELO (anything >= 2000 is one category)

  // ELO below 1100 goes to the first category
  if (elo < start) {
    return eloDict[`<${start}`]
  }

  // ELO 2000+ goes to the last category
  if (elo >= end) {
    return eloDict[`>=${end}`]
  }

  // Find the appropriate 100-point range
  for (let lowerBound = start; lowerBound < end; lowerBound += interval) {
    const upperBound = lowerBound + interval
    if (elo >= lowerBound && elo < upperBound) {
      return eloDict[`${lowerBound}-${upperBound - 1}`]
    }
  }

  // This should never happen if ELO is valid
  throw new Error(`ELO value ${elo} is out of range.`)
}

/**
 * Creates a dictionary mapping ELO rating ranges to category indices.
 *
 * This is called once at module load time to pre-compute the mapping.
 *
 * @returns Dictionary like { "<1100": 0, "1100-1199": 1, "1200-1299": 2, ... }
 */
function createEloDict(): Record<string, number> {
  const interval = 100
  const start = 1100
  const end = 2000

  // Start with the "below minimum" category
  const eloDict: Record<string, number> = { [`<${start}`]: 0 }
  let rangeIndex = 1

  // Create categories for each 100-point range
  for (let lowerBound = start; lowerBound < end; lowerBound += interval) {
    const upperBound = lowerBound + interval
    eloDict[`${lowerBound}-${upperBound - 1}`] = rangeIndex
    rangeIndex += 1
  }

  // Add the "above maximum" category
  eloDict[`>=${end}`] = rangeIndex

  return eloDict
}

/**
 * Mirrors a chess move in UCI notation vertically (rank flip).
 *
 * Used when converting Black's moves to White's perspective.
 * The move "e7e5" (Black's e-pawn) becomes "e2e4" (White's perspective).
 *
 * @param moveUci - The move in UCI notation (e.g., "e7e5" or "e7e8q")
 * @returns The mirrored move in UCI notation
 *
 * @example
 * mirrorMove('e7e5')  // returns 'e2e4'
 * mirrorMove('a7a8q') // returns 'a2a1q' (with promotion)
 */
function mirrorMove(moveUci: string): string {
  // Check if move includes promotion (5 characters like "e7e8q")
  const isPromotion: boolean = moveUci.length > 4

  // Extract the start and end squares
  const startSquare: string = moveUci.substring(0, 2)  // e.g., "e7"
  const endSquare: string = moveUci.substring(2, 4)    // e.g., "e5"
  const promotionPiece: string = isPromotion ? moveUci.substring(4) : ''  // e.g., "q"

  // Mirror both squares vertically
  const mirroredStart: string = mirrorSquare(startSquare)
  const mirroredEnd: string = mirrorSquare(endSquare)

  // Combine with promotion piece if present
  return mirroredStart + mirroredEnd + promotionPiece
}

/**
 * Mirrors a square on the chess board vertically (rank flip).
 *
 * File stays the same, rank is inverted: 1↔8, 2↔7, 3↔6, 4↔5.
 *
 * @param square - The square in algebraic notation (e.g., "e7")
 * @returns The mirrored square (e.g., "e2")
 *
 * @example
 * mirrorSquare('e7') // returns 'e2'
 * mirrorSquare('a1') // returns 'a8'
 */
function mirrorSquare(square: string): string {
  const file: string = square.charAt(0)  // 'a' through 'h' - stays the same
  // Flip the rank: 1→8, 2→7, 3→6, etc.
  // Formula: 9 - original_rank gives the mirrored rank
  const rank: string = (9 - parseInt(square.charAt(1))).toString()

  return file + rank
}

/**
 * Swaps the colors of pieces in a FEN rank string.
 *
 * Uppercase → lowercase and vice versa.
 * Used when mirroring the board for Black's perspective.
 *
 * @param rank - A rank string from FEN (e.g., "PPPPPPPP" or "rnbqkbnr")
 * @returns The rank with colors swapped (e.g., "pppppppp" or "RNBQKBNR")
 */
function swapColorsInRank(rank: string): string {
  let swappedRank = ''

  for (const char of rank) {
    if (/[A-Z]/.test(char)) {
      // Uppercase (White) → lowercase (Black)
      swappedRank += char.toLowerCase()
    } else if (/[a-z]/.test(char)) {
      // Lowercase (Black) → uppercase (White)
      swappedRank += char.toUpperCase()
    } else {
      // Digits (empty squares) stay the same
      swappedRank += char
    }
  }

  return swappedRank
}

/**
 * Swaps castling rights between White and Black.
 *
 * K↔k (kingside) and Q↔q (queenside) are swapped.
 *
 * @param castling - Castling string from FEN (e.g., "KQkq" or "Kq")
 * @returns Swapped castling string (e.g., "KQkq" or "Qk")
 */
function swapCastlingRights(castling: string): string {
  if (castling === '-') return '-'

  // Capture current rights in a Set for easy lookup
  const rights = new Set(castling.split(''))
  const swapped = new Set<string>()

  // Swap White ↔ Black rights
  if (rights.has('K')) swapped.add('k')  // White kingside → Black kingside
  if (rights.has('Q')) swapped.add('q')  // White queenside → Black queenside
  if (rights.has('k')) swapped.add('K')  // Black kingside → White kingside
  if (rights.has('q')) swapped.add('Q')  // Black queenside → White queenside

  // Reconstruct in canonical order: KQkq
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
 * This is used for "perspective normalization" - converting a position
 * where Black is to move into an equivalent position where White is to move.
 * The Maia model always evaluates from White's perspective.
 *
 * The transformation:
 * 1. Reverse the ranks (flip board vertically)
 * 2. Swap piece colors (uppercase ↔ lowercase)
 * 3. Swap active color (w ↔ b)
 * 4. Swap castling rights
 * 5. Mirror en passant square
 *
 * @param fen - The original FEN string
 * @returns The mirrored FEN string
 *
 * @example
 * // Position after 1.e4:
 * mirrorFEN('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1')
 * // Returns something like White's perspective for Black's response
 */
function mirrorFEN(fen: string): string {
  // Split FEN into its 6 parts
  const [position, activeColor, castling, enPassant, halfmove, fullmove] =
    fen.split(' ')

  // 1. Mirror board vertically and swap piece colors
  const ranks = position.split('/')
  const mirroredRanks = ranks
    .slice()             // Copy the array
    .reverse()           // Reverse rank order (8→1 becomes 1→8)
    .map((rank) => swapColorsInRank(rank))  // Swap piece colors

  const mirroredPosition = mirroredRanks.join('/')

  // 2. Swap active color
  const mirroredActiveColor = activeColor === 'w' ? 'b' : 'w'

  // 3. Swap castling rights
  const mirroredCastling = swapCastlingRights(castling)

  // 4. Mirror en passant square
  const mirroredEnPassant = enPassant !== '-' ? mirrorSquare(enPassant) : '-'

  // Halfmove and fullmove clocks stay the same
  return `${mirroredPosition} ${mirroredActiveColor} ${mirroredCastling} ${mirroredEnPassant} ${halfmove} ${fullmove}`
}

// Export the functions and data needed by other modules
export { preprocess, mirrorMove, mirrorFEN, allPossibleMoves, allPossibleMovesReversed }
