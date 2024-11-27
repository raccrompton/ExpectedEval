import Head from 'next/head'
import Script from 'next/script'
import { useRouter } from 'next/router'
import type { AppProps } from 'next/app'
import { Analytics } from '@vercel/analytics/react'

import {
  AuthContextProvider,
  ModalContextProvider,
  ThemeContextProvider,
  WindowSizeContextProvider,
  AnalysisListContextProvider,
} from 'src/providers'
import 'src/styles/globals.scss'
import 'src/styles/tailwind.css'
import 'react-tooltip/dist/react-tooltip.css'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'
import { Footer, Compose, ErrorBoundary, Header } from 'src/components'

function MaiaPlatform({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const isAnalysisPage = router.pathname.startsWith('/analysis')

  return (
    <Compose
      components={[
        ErrorBoundary,
        ThemeContextProvider,
        WindowSizeContextProvider,
        AuthContextProvider,
        ModalContextProvider,
        ...(isAnalysisPage ? [AnalysisListContextProvider] : []),
      ]}
    >
      <Head>
        <link rel="icon" type="image/png" href="/favicon.png" />
      </Head>
      <div className="app-container">
        <Header />
        <div className="content-container">
          <Component {...pageProps} />
        </div>
        <Footer />
      </div>
      <Analytics />
      <Script async src="/analytics.js?id=G-SNP84LXLKY" />
      <Script id="analytics">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-SNP84LXLKY');
        `}
      </Script>
    </Compose>
  )
}

export default MaiaPlatform
