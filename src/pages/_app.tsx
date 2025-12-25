import type { AppProps } from 'next/app'
import { EngineProvider } from '@/contexts'
import { ErrorBoundary, EngineErrorFallback } from '@/components/ErrorBoundary'
import '@/styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <ErrorBoundary fallback={<EngineErrorFallback />}>
        <EngineProvider>
          <Component {...pageProps} />
        </EngineProvider>
      </ErrorBoundary>
    </ErrorBoundary>
  )
}
