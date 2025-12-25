import type { AppProps } from 'next/app'
import { EngineProvider, SettingsProvider } from '@/contexts'
import { ErrorBoundary, EngineErrorFallback } from '@/components/ErrorBoundary'
import '@/styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <ErrorBoundary fallback={<EngineErrorFallback />}>
          <EngineProvider>
            <Component {...pageProps} />
          </EngineProvider>
        </ErrorBoundary>
      </SettingsProvider>
    </ErrorBoundary>
  )
}
