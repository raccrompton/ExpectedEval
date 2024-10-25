import Chessground from '@react-chess/chessground'
import Link from 'next/link'
import { Component } from 'react'

import styles from './ErrorBoundary.module.scss'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  isUnauthorized: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, isUnauthorized: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    console.log('Error caught in getDerivedStateFromError:', error)
    return { hasError: true, error: error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.log('Error caught in componentDidCatch:', error, errorInfo)
    if (error.message === 'Unauthorized') {
      this.setState({ hasError: true, isUnauthorized: true, error })
    } else {
      this.setState({ hasError: true, isUnauthorized: false, error })
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isUnauthorized) {
        return (
          <div className={styles.container}>
            <h1>Unauthorized Access</h1>
            <p>
              You do not have permission to view this content. Please log in.
            </p>
            <Link href="/">Click here to go home</Link>
          </div>
        )
      }

      return (
        <div className={styles.container}>
          <div>
            <div className={styles.board}>
              <Chessground
                contained
                config={{
                  fen: 'rn1qkb1r/ppp1pBpp/5n2/4N3/8/2N5/PPPP1PPP/R1BbK2R b KQkq - 0 7',
                  check: 'black',
                }}
              />
            </div>
          </div>
          <h2>Sorry, you encountered an Error</h2>

          <div
            role="button"
            tabIndex={0}
            className="mb-10"
            onClick={() => this.setState({ hasError: false })}
            onKeyDown={() => this.setState({ hasError: false })}
          >
            <Link href="/">Click here to go home</Link>
          </div>
          <div className="flex flex-col justify-center">
            <p>Please share this stack trace:</p>
            <code>{this.state.error?.toString()}</code>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
