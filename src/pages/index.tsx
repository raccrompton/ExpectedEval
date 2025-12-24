import { GameBoard } from '@/components/Board'

export default function Home() {
  return (
    <main className="main-container">
      <header className="header">
        <h1>ExpectedEval</h1>
      </header>
      <div className="board-section">
        <GameBoard />
      </div>
      <style jsx>{`
        .main-container {
          min-height: 100vh;
          padding: var(--space-md);
        }
        .header {
          margin-bottom: var(--space-lg);
        }
        .board-section {
          display: flex;
          justify-content: center;
        }
      `}</style>
    </main>
  )
}
