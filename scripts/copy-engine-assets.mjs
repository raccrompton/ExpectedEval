/**
 * Copy the Stockfish engine files from the lila-stockfish-web package into
 * public/stockfish/ so they are served as untouched static assets.
 *
 * The app loads the engine via `import('/stockfish/sf17-79.js')` with a
 * webpackIgnore comment (see src/core/engine/stockfish.ts) — webpack must
 * never bundle it, or its self-spawned pthread worker crashes in Safari.
 *
 * Runs automatically before `npm run build` / `npm run dev` (pre-hooks).
 */
import { copyFileSync, existsSync } from 'node:fs'

const SRC = 'node_modules/lila-stockfish-web'
const DEST = 'public/stockfish'

// Only the files the app actually loads. The .nnue networks are not shipped
// in the npm package — they are committed separately under public/stockfish/.
const FILES = ['sf17-79.js', 'sf17-79.wasm']

let copied = 0
for (const file of FILES) {
  const from = `${SRC}/${file}`
  const to = `${DEST}/${file}`
  if (!existsSync(from)) {
    console.error(`[copy-engine-assets] missing source: ${from}`)
    process.exit(1)
  }
  copyFileSync(from, to)
  copied++
  console.log(`[copy-engine-assets] ${from} -> ${to}`)
}
console.log(`[copy-engine-assets] synced ${copied} engine file(s).`)
