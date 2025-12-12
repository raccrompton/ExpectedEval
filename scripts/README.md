# Engine Testing Scripts

This directory contains scripts for testing the chess engines without requiring a browser.

## Quick Commands

```bash
# Test Maia model in Node.js (no browser needed)
npm run test:maia

# Test all engines (currently just Maia)
npm run test:engines

# Browser-based E2E tests (requires dev server)
npm run test:e2e
```

## Maia Testing (Node.js)

The `test-maia-node.ts` script tests the Maia ONNX model directly using `onnxruntime-node`. This allows fast validation without requiring a browser.

### What it tests:
- Model loads successfully
- Value head output makes sense for various positions
- Policy output produces valid move probabilities

### Test positions:
1. **Starting position** (White to move) - expects roughly equal evaluation
2. **After 1.e4** (Black to move) - expects slight White advantage
3. **After 1.e4 e5** (White to move) - expects roughly equal
4. **Queen vs King** (winning positions) - expects clear winning evaluations

### Understanding Maia Value Output

The model outputs a raw value in the range `[-1, +1]`:
- `+1` = side-to-move is completely winning
- `0` = equal position
- `-1` = side-to-move is completely losing

This is converted to win probability: `winProb = (rawValue / 2) + 0.5`

**Important**: For Black positions, the board is mirrored before inference. The model always "thinks" as White. So the value output is from the **side-to-move's perspective** after mirroring.

## Stockfish Testing (Browser Only)

**Stockfish cannot be tested in Node.js** due to technical limitations:

1. **SharedArrayBuffer Requirement**: Stockfish WASM uses multi-threading which requires `SharedArrayBuffer`
2. **CORS Headers**: `SharedArrayBuffer` requires special HTTP headers (`Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`)
3. **Browser-only**: These security features only work in browser contexts

### To test Stockfish:

1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:3000/verify-engines`
3. Click "Test Stockfish"

Or run Playwright E2E tests:
```bash
npm run test:e2e
```

## Adding New Tests

To add more test positions to the Maia test:

1. Edit `scripts/test-maia-node.ts`
2. Add a new entry to `TEST_POSITIONS` array
3. Provide the FEN, legal moves, and expected value range

Example:
```typescript
{
  name: 'Sicilian Defense',
  fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
  legalMoves: [...], // All legal moves in UCI format
  expectedValueRange: [-0.4, 0.4],
  description: 'After 1.e4 c5, White to move.',
}
```
