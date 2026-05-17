/**
 * Lightweight memory diagnostics.
 *
 * Logs what each browser exposes about memory use, so we can see the real
 * engine footprint instead of guessing. `performance.memory` (JS heap) is
 * Chrome-only; the Stockfish WASM heap size is available cross-browser.
 */
import { getStockfishMemoryBytes } from './stockfish'

const mb = (bytes: number): string => `${(bytes / 1048576).toFixed(0)}MB`

/**
 * Log a memory snapshot tagged with `label` (e.g. 'stockfish-init',
 * 'winfinder-end'). Safe to call anywhere; never throws.
 */
export function logEngineMemory(label: string): void {
  try {
    const parts: string[] = [`[mem:${label}]`]

    const sf = getStockfishMemoryBytes()
    if (sf != null) parts.push(`stockfish-wasm=${mb(sf)}`)

    // performance.memory is non-standard (Chromium only).
    const pm = (
      performance as Performance & {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number }
      }
    ).memory
    if (pm) {
      parts.push(`jsHeap=${mb(pm.usedJSHeapSize)}`)
      parts.push(`jsHeapLimit=${mb(pm.jsHeapSizeLimit)}`)
    }

    if (typeof crossOriginIsolated !== 'undefined') {
      parts.push(`crossOriginIsolated=${crossOriginIsolated}`)
    }

    console.log(parts.join(' '))
  } catch {
    // Diagnostics must never break the app.
  }
}
