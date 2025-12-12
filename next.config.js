/**
 * Next.js Configuration for ExpectedEval
 *
 * This configuration file sets up Next.js with the required headers
 * for SharedArrayBuffer support (needed by Stockfish WASM).
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * React Strict Mode helps identify potential problems in the app.
   * It activates additional checks and warnings for descendants.
   */
  reactStrictMode: true,

  /**
   * Custom HTTP headers required for WebAssembly with SharedArrayBuffer.
   *
   * Stockfish WASM requires SharedArrayBuffer for multi-threaded operation.
   * Modern browsers require specific CORS headers to enable this feature:
   * - Cross-Origin-Opener-Policy: same-origin
   * - Cross-Origin-Embedder-Policy: require-corp
   *
   * Without these headers, SharedArrayBuffer is disabled and Stockfish
   * will fall back to single-threaded mode (slower).
   */
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            // Isolates the browsing context exclusively to same-origin documents
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            // Prevents loading resources that don't grant permission
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ]
  },

  /**
   * Webpack configuration for handling WASM files.
   *
   * We need to tell webpack how to handle .wasm files used by
   * Stockfish and ONNX Runtime.
   */
  webpack: (config, { isServer }) => {
    // WASM files should be treated as assets
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    }

    return config
  },
}

module.exports = nextConfig
