import React from 'react'
import { render, screen } from '@testing-library/react'
import { AnalysisConfigModal } from 'src/components/Analysis/AnalysisConfigModal'
import { AnalysisProgressOverlay } from 'src/components/Analysis/AnalysisProgressOverlay'
import '@testing-library/jest-dom'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('Analyze Entire Game Components', () => {
  describe('AnalysisConfigModal', () => {
    const defaultProps = {
      isOpen: true,
      onClose: jest.fn(),
      onConfirm: jest.fn(),
      initialDepth: 15,
    }

    it('renders the modal when open', () => {
      render(<AnalysisConfigModal {...defaultProps} />)

      expect(screen.getByText('Analyze Entire Game')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Choose the Stockfish analysis depth for all positions in the game:',
        ),
      ).toBeInTheDocument()
    })

    it('renders depth options', () => {
      render(<AnalysisConfigModal {...defaultProps} />)

      expect(screen.getByText('Fast (d12)')).toBeInTheDocument()
      expect(screen.getByText('Balanced (d15)')).toBeInTheDocument()
      expect(screen.getByText('Deep (d18)')).toBeInTheDocument()
    })

    it('renders start analysis button', () => {
      render(<AnalysisConfigModal {...defaultProps} />)

      expect(screen.getByText('Start Analysis')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<AnalysisConfigModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('Analyze Entire Game')).not.toBeInTheDocument()
    })
  })

  describe('AnalysisProgressOverlay', () => {
    const mockProgress = {
      currentMoveIndex: 5,
      totalMoves: 20,
      currentMove: 'e4',
      isAnalyzing: true,
      isComplete: false,
      isCancelled: false,
    }

    const defaultProps = {
      progress: mockProgress,
      onCancel: jest.fn(),
    }

    it('renders progress overlay when analyzing', () => {
      render(<AnalysisProgressOverlay {...defaultProps} />)

      expect(screen.getByText('Analyzing Game')).toBeInTheDocument()
      expect(
        screen.getByText('Deep analysis in progress...'),
      ).toBeInTheDocument()
      expect(screen.getByText('Position 5 of 20')).toBeInTheDocument()
      expect(screen.getByText('25%')).toBeInTheDocument()
    })

    it('renders current move being analyzed', () => {
      render(<AnalysisProgressOverlay {...defaultProps} />)

      expect(screen.getByText('Currently analyzing:')).toBeInTheDocument()
      expect(screen.getByText('e4')).toBeInTheDocument()
    })

    it('renders cancel button', () => {
      render(<AnalysisProgressOverlay {...defaultProps} />)

      expect(screen.getByText('Cancel Analysis')).toBeInTheDocument()
    })

    it('does not render when not analyzing', () => {
      const notAnalyzingProgress = {
        ...mockProgress,
        isAnalyzing: false,
      }

      render(
        <AnalysisProgressOverlay
          {...defaultProps}
          progress={notAnalyzingProgress}
        />,
      )

      expect(screen.queryByText('Analyzing Game')).not.toBeInTheDocument()
    })
  })
})
