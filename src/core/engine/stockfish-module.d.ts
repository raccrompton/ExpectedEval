/**
 * Type declarations for the Stockfish WASM module
 *
 * This provides TypeScript types for dynamically importing the Stockfish JS module.
 * The module is loaded from /public/stockfish/sf17-79.js at runtime.
 *
 * Note: The actual file comes from maia-platform-frontend's stockfish build,
 * not the lila-stockfish-web npm package (which has sf171-79.js).
 */

declare module 'lila-stockfish-web/sf171-79.js' {
  import StockfishWeb from 'lila-stockfish-web'

  /**
   * Options for initializing the Stockfish module.
   */
  interface StockfishModuleOptions {
    /** Shared WebAssembly memory for multi-threading */
    wasmMemory: WebAssembly.Memory
    /** Error handler for module initialization */
    onError?: (_msg: string) => void
    /** Function to locate WASM and NNUE files */
    locateFile?: (_name: string) => string
  }

  /**
   * Module factory function.
   *
   * @param options - Configuration for the module
   * @returns Promise resolving to initialized Stockfish instance
   */
  function makeModule(_options: StockfishModuleOptions): Promise<StockfishWeb>

  export default makeModule
}
