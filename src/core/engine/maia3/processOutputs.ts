import { allPossibleMovesMaia3Reversed, mirrorMove } from './tensor'

/**
 * Convert Maia 3 raw model outputs into the app's MaiaEvaluation shape.
 *
 * @param fen         position FEN (used for the black-to-move flip)
 * @param moveLogits  4352-dim policy logits for one position
 * @param valueLogits 3-dim LDW logits: [Loss, Draw, Win] for side-to-move
 * @param legalMoves  legal-move mask Float32Array from preprocessMaia3
 * @returns { policy, value } — value is side-to-move's win probability;
 *          policy maps UCI move -> probability, sorted descending.
 */
export function processMaia3Outputs(
  fen: string,
  moveLogits: Float32Array,
  valueLogits: ArrayLike<number>,
  legalMoves: Float32Array,
): { policy: Record<string, number>; value: number } {
  // --- Value head: softmax over LDW logits → winProb ---
  // Model output channels: index 0 = Loss, 1 = Draw, 2 = Win (for side-to-move)
  const maxWdl = Math.max(valueLogits[0], valueLogits[1], valueLogits[2])
  const expL = Math.exp(valueLogits[0] - maxWdl)
  const expD = Math.exp(valueLogits[1] - maxWdl)
  const expW = Math.exp(valueLogits[2] - maxWdl)
  const sumExp = expL + expD + expW
  let winProb = (expW + 0.5 * expD) / sumExp

  // Black-to-move flip: preprocessMaia3 mirrors black boards to white
  // perspective before inference, so the model's "Win" is for the mirrored
  // white side. Flip to restore side-to-move perspective.
  let black_flag = false
  if (fen.split(' ')[1] === 'b') {
    black_flag = true
    winProb = 1 - winProb
  }

  // Round to 4 decimal places (matches reference implementation)
  winProb = Math.round(winProb * 10000) / 10000

  // --- Policy head: softmax over legal moves only ---
  const legalMoveIndices = legalMoves
    .map((value, index) => (value > 0 ? index : -1))
    .filter((index) => index !== -1)

  // Map indices to UCI move strings, mirroring for black positions
  const legalMovesMirrored: string[] = []
  for (const moveIndex of legalMoveIndices) {
    let move = allPossibleMovesMaia3Reversed[moveIndex]
    if (black_flag) {
      move = mirrorMove(move)
    }
    legalMovesMirrored.push(move)
  }

  // Stable-max softmax over legal move logits
  const legalLogits = legalMoveIndices.map((idx) => moveLogits[idx])
  const maxLogit = Math.max(...legalLogits)
  const expLogits = legalLogits.map((logit) => Math.exp(logit - maxLogit))
  const sumExpMoves = expLogits.reduce((a, b) => a + b, 0)
  const probs = expLogits.map((expLogit) => expLogit / sumExpMoves)

  const moveProbs: Record<string, number> = {}
  for (let i = 0; i < legalMoveIndices.length; i++) {
    moveProbs[legalMovesMirrored[i]] = probs[i]
  }

  // Sort descending by probability
  const sortedMoveProbs = Object.keys(moveProbs)
    .sort((a, b) => moveProbs[b] - moveProbs[a])
    .reduce(
      (acc, key) => {
        acc[key] = moveProbs[key]
        return acc
      },
      {} as Record<string, number>,
    )

  return { policy: sortedMoveProbs, value: winProb }
}
