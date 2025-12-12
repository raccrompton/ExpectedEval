/**
 * Debug: Print ALL raw model outputs to see exactly what we're getting
 */

import { InferenceSession, Tensor } from 'onnxruntime-node'
import { preprocess } from '../src/core/engine/tensor'

async function main() {
  const model = await InferenceSession.create('./public/maia2/maia_rapid.onnx')

  console.log('Model outputs:', model.outputNames)

  // After 1.e4
  const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
  const legalMoves = ['e7e5', 'e7e6', 'd7d5', 'c7c5', 'g8f6', 'b8c6'] // simplified

  const { boardInput, eloSelfCategory, eloOppoCategory } = preprocess(fen, 1500, 1500, legalMoves)

  const feeds: Record<string, Tensor> = {
    boards: new Tensor('float32', boardInput, [1, 18, 8, 8]),
    elo_self: new Tensor('int64', BigInt64Array.from([BigInt(eloSelfCategory)])),
    elo_oppo: new Tensor('int64', BigInt64Array.from([BigInt(eloOppoCategory)])),
  }

  const result = await model.run(feeds)

  console.log('\n=== Raw Model Outputs ===')
  for (const name of model.outputNames) {
    const tensor = result[name]
    console.log(`\n${name}:`)
    console.log(`  dims: ${tensor.dims}`)
    console.log(`  type: ${tensor.type}`)

    const data = tensor.data as Float32Array
    if (data.length <= 5) {
      console.log(`  ALL values: [${Array.from(data).map(v => v.toFixed(6)).join(', ')}]`)
    } else {
      console.log(`  first 5: [${Array.from(data).slice(0, 5).map(v => v.toFixed(6)).join(', ')}]`)

      // For logits_maia, find the highest values (top moves)
      if (name === 'logits_maia') {
        const indexed = Array.from(data).map((v, i) => ({ v, i }))
        indexed.sort((a, b) => b.v - a.v)
        console.log(`  top 5 indices: ${indexed.slice(0, 5).map(x => `[${x.i}]=${x.v.toFixed(4)}`).join(', ')}`)
      }
    }
  }

  // Now let's see what logits_value actually is
  const valueData = result.logits_value.data as Float32Array
  console.log('\n=== Value Interpretation ===')
  console.log(`Raw logits_value[0]: ${valueData[0]}`)
  console.log(`As (raw/2 + 0.5): ${valueData[0] / 2 + 0.5}`)
  console.log(`As sigmoid: ${1 / (1 + Math.exp(-valueData[0]))}`)
  console.log(`As tanh->0-1: ${(Math.tanh(valueData[0]) + 1) / 2}`)
}

main().catch(console.error)
