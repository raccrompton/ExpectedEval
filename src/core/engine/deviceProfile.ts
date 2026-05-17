/**
 * Device-aware engine memory budgeting.
 *
 * The app runs TWO WebAssembly engines at once — Stockfish and Maia (ONNX
 * Runtime Web). Their combined resident footprint can exceed Safari's
 * per-tab memory ceiling (Chrome reserves lazily and never hits it). iOS
 * Safari OOMs at engine init; desktop Safari can OOM under heavy load
 * (e.g. Win Finder on a long game).
 *
 * These helpers pick conservative engine settings so the combined
 * footprint stays within budget. Inspired by Lichess's device-aware
 * `maxHashMB()` (ui/lib/src/ceval/engines/engines.ts).
 */

/** True on iPhone/iPod/iPad, including iPadOS which reports a macOS UA. */
export function isIOSorIPadOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  // iPadOS 13+ pretends to be macOS; distinguish via touch support.
  return ua.includes('Mac') && (navigator.maxTouchPoints ?? 0) > 1
}

/** True specifically on iPad (more RAM headroom than iPhone). */
export function isIPad(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad/.test(ua)) return true
  return ua.includes('Mac') && (navigator.maxTouchPoints ?? 0) > 1
}

/**
 * Stockfish transposition-table size in MB. Kept small — at the depths the
 * app searches (~10-18) a large hash gives little benefit but a lot of
 * resident memory. Mirrors Lichess's mobile caps.
 */
export function recommendedHashMB(): number {
  if (isIPad()) return 32
  if (isIOSorIPadOS()) return 16
  return 64
}

/** Stockfish search threads. Conservative; leaves cores free. */
export function recommendedThreads(): number {
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4
  if (isIOSorIPadOS()) return Math.min(2, cores)
  return Math.max(1, Math.min(cores - 1, 4))
}

/** ONNX Runtime Web WASM thread count for Maia inference. */
export function recommendedOnnxThreads(): number {
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4
  if (isIOSorIPadOS()) return 1
  return Math.min(2, cores)
}

/**
 * Upper bound (in 64KiB WASM pages) for Stockfish's shared WebAssembly
 * memory. The default of 32767 pages reserves ~2GB; with two engines
 * coexisting that reservation is itself a problem on Safari. Stockfish
 * with a small Hash + NNUE needs only a few hundred MB, so 6144 pages
 * (~384MB) is ample headroom while drastically shrinking the reservation.
 */
export function stockfishMaxPages(): number {
  return 6144
}
