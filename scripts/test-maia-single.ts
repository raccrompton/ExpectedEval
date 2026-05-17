/**
 * Minimal test of Maia value output
 * Compare with https://www.maiachess.com/analysis/ which shows 57.5% for White after 1.e4
 */

import { NodeMaia } from '../src/core/engine/maia.node'

async function main() {
  console.log('=== Minimal Maia Value Test ===\n')

  const maia = new NodeMaia('./public/maia3/maia3_simplified.onnx')
  await maia.init()

  // Test position: After 1.e4 (Black to move)
  const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

  console.log(`FEN: ${fen}`)
  console.log(`Position: After 1.e4 (Black to move)\n`)

  // Test at different ELO levels
  const eloLevels = [1100, 1300, 1500, 1700, 1900]

  for (const elo of eloLevels) {
    const result = await maia.predict(fen, { eloLevel: elo })
    console.log(`ELO ${elo}: White's expected score = ${(result.value * 100).toFixed(1)}%`)
  }

  console.log('\n--- Expected from maiachess.com: ~57.5% for White ---')

  // Also test starting position
  console.log('\n\n=== Starting Position ===')
  const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  for (const elo of eloLevels) {
    const result = await maia.predict(startFen, { eloLevel: elo })
    console.log(`ELO ${elo}: White's expected score = ${(result.value * 100).toFixed(1)}%`)
  }

  console.log('\n--- Expected: ~50-53% for White (first move advantage) ---')
}

main().catch(console.error)
