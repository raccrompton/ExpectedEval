/**
 * Perspective Verification Tests
 *
 * Empirically verify what perspective Stockfish returns evaluations from.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NodeStockfish } from './stockfish.node'

describe('Stockfish Perspective Verification', () => {
  let stockfish: NodeStockfish

  // Position where White is up a queen (clearly winning for White)
  const WHITE_WINNING_WHITE_TO_MOVE =
    'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  const WHITE_WINNING_BLACK_TO_MOVE =
    'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1'

  // Position where Black is up a queen (clearly winning for Black)
  const BLACK_WINNING_WHITE_TO_MOVE =
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1'
  const BLACK_WINNING_BLACK_TO_MOVE =
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR b KQkq - 0 1'

  beforeAll(async () => {
    stockfish = new NodeStockfish()
    await stockfish.init()
  }, 30000)

  afterAll(() => {
    stockfish.destroy()
  })

  it('determines cp perspective (should be White)', async () => {
    const whiteWinWhiteMove = await stockfish.evaluate(WHITE_WINNING_WHITE_TO_MOVE, { depth: 12 })
    const whiteWinBlackMove = await stockfish.evaluate(WHITE_WINNING_BLACK_TO_MOVE, { depth: 12 })
    const blackWinWhiteMove = await stockfish.evaluate(BLACK_WINNING_WHITE_TO_MOVE, { depth: 12 })
    const blackWinBlackMove = await stockfish.evaluate(BLACK_WINNING_BLACK_TO_MOVE, { depth: 12 })

    console.log('\n========== CP PERSPECTIVE ==========')
    console.log('White winning (White has queen, Black missing):')
    console.log(`  White to move: cp=${whiteWinWhiteMove.cp}`)
    console.log(`  Black to move: cp=${whiteWinBlackMove.cp}`)
    console.log('Black winning (Black has queen, White missing):')
    console.log(`  White to move: cp=${blackWinWhiteMove.cp}`)
    console.log(`  Black to move: cp=${blackWinBlackMove.cp}`)

    // If cp is from White's perspective:
    // - White winning → cp should be POSITIVE in both cases
    // - Black winning → cp should be NEGATIVE in both cases
    const cpIsWhitePerspective =
      whiteWinWhiteMove.cp > 0 &&
      whiteWinBlackMove.cp > 0 &&
      blackWinWhiteMove.cp < 0 &&
      blackWinBlackMove.cp < 0

    console.log(`\nCP is from: ${cpIsWhitePerspective ? "WHITE'S" : "SIDE-TO-MOVE'S"} perspective`)
    console.log('=========================================\n')

    expect(cpIsWhitePerspective).toBe(true)
  })

  it('determines winrate perspective (should be side-to-move)', async () => {
    const whiteWinWhiteMove = await stockfish.evaluate(WHITE_WINNING_WHITE_TO_MOVE, { depth: 12 })
    const whiteWinBlackMove = await stockfish.evaluate(WHITE_WINNING_BLACK_TO_MOVE, { depth: 12 })
    const blackWinWhiteMove = await stockfish.evaluate(BLACK_WINNING_WHITE_TO_MOVE, { depth: 12 })
    const blackWinBlackMove = await stockfish.evaluate(BLACK_WINNING_BLACK_TO_MOVE, { depth: 12 })

    console.log('\n========== WINRATE PERSPECTIVE ==========')
    console.log('White winning (White has queen, Black missing):')
    console.log(`  White to move: winrate=${(whiteWinWhiteMove.winrate * 100).toFixed(1)}%`)
    console.log(`  Black to move: winrate=${(whiteWinBlackMove.winrate * 100).toFixed(1)}%`)
    console.log('Black winning (Black has queen, White missing):')
    console.log(`  White to move: winrate=${(blackWinWhiteMove.winrate * 100).toFixed(1)}%`)
    console.log(`  Black to move: winrate=${(blackWinBlackMove.winrate * 100).toFixed(1)}%`)

    // If winrate is from White's perspective:
    // - White winning → winrate should be HIGH in both cases
    // - Black winning → winrate should be LOW in both cases
    const winrateIsWhitePerspective =
      whiteWinWhiteMove.winrate > 0.7 &&
      whiteWinBlackMove.winrate > 0.7 &&
      blackWinWhiteMove.winrate < 0.3 &&
      blackWinBlackMove.winrate < 0.3

    // If winrate is from side-to-move's perspective:
    // - White winning, White to move → HIGH (I'm winning)
    // - White winning, Black to move → LOW (I'm losing)
    // - Black winning, White to move → LOW (I'm losing)
    // - Black winning, Black to move → HIGH (I'm winning)
    const winrateIsSideToMovePerspective =
      whiteWinWhiteMove.winrate > 0.7 &&
      whiteWinBlackMove.winrate < 0.3 &&
      blackWinWhiteMove.winrate < 0.3 &&
      blackWinBlackMove.winrate > 0.7

    console.log(`\nWinrate is from: ${
      winrateIsWhitePerspective ? "WHITE'S" :
      winrateIsSideToMovePerspective ? "SIDE-TO-MOVE'S" :
      "UNCLEAR"
    } perspective`)
    console.log('==========================================\n')

    // Based on our observations, expect side-to-move perspective
    expect(winrateIsSideToMovePerspective).toBe(true)
  })
})
