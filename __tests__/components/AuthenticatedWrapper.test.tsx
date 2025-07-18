import { render, screen } from '@testing-library/react'
import { AuthenticatedWrapper } from '../../src/components/Common/AuthenticatedWrapper'
import { AuthContext } from '../../src/contexts/AuthContext'
import { User } from '../../src/types/auth'

const mockUser: User = {
  clientId: 'test-client-id',
  displayName: 'TestUser',
  lichessId: 'testuser',
}

const AuthProvider = ({
  user,
  children,
}: {
  user: User | null
  children: React.ReactNode
}) => (
  <AuthContext.Provider
    value={{
      user,
      connectLichess: jest.fn(),
      logout: jest.fn(),
    }}
  >
    {children}
  </AuthContext.Provider>
)

describe('AuthenticatedWrapper Component', () => {
  it('should render children when user is authenticated', () => {
    render(
      <AuthProvider user={mockUser}>
        <AuthenticatedWrapper>
          <div>Protected content</div>
        </AuthenticatedWrapper>
      </AuthProvider>,
    )

    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })

  it('should not render children when user is not authenticated', () => {
    render(
      <AuthProvider user={null}>
        <AuthenticatedWrapper>
          <div>Protected content</div>
        </AuthenticatedWrapper>
      </AuthProvider>,
    )

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('should handle multiple children when user is authenticated', () => {
    render(
      <AuthProvider user={mockUser}>
        <AuthenticatedWrapper>
          <div>First child</div>
          <div>Second child</div>
          <span>Third child</span>
        </AuthenticatedWrapper>
      </AuthProvider>,
    )

    expect(screen.getByText('First child')).toBeInTheDocument()
    expect(screen.getByText('Second child')).toBeInTheDocument()
    expect(screen.getByText('Third child')).toBeInTheDocument()
  })

  it('should not render multiple children when user is not authenticated', () => {
    render(
      <AuthProvider user={null}>
        <AuthenticatedWrapper>
          <div>First child</div>
          <div>Second child</div>
          <span>Third child</span>
        </AuthenticatedWrapper>
      </AuthProvider>,
    )

    expect(screen.queryByText('First child')).not.toBeInTheDocument()
    expect(screen.queryByText('Second child')).not.toBeInTheDocument()
    expect(screen.queryByText('Third child')).not.toBeInTheDocument()
  })

  it('should handle no children gracefully when user is authenticated', () => {
    render(
      <AuthProvider user={mockUser}>
        <AuthenticatedWrapper />
      </AuthProvider>,
    )

    // Should not crash and should render empty fragment
    expect(screen.queryByText(/./)).not.toBeInTheDocument()
  })

  it('should handle no children gracefully when user is not authenticated', () => {
    render(
      <AuthProvider user={null}>
        <AuthenticatedWrapper />
      </AuthProvider>,
    )

    // Should not crash and should render empty fragment
    expect(screen.queryByText(/./)).not.toBeInTheDocument()
  })

  it('should re-render when authentication state changes', () => {
    const { rerender } = render(
      <AuthProvider user={null}>
        <AuthenticatedWrapper>
          <div>Protected content</div>
        </AuthenticatedWrapper>
      </AuthProvider>,
    )

    // Initially not authenticated
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()

    // Re-render with authenticated user
    rerender(
      <AuthProvider user={mockUser}>
        <AuthenticatedWrapper>
          <div>Protected content</div>
        </AuthenticatedWrapper>
      </AuthProvider>,
    )

    expect(screen.getByText('Protected content')).toBeInTheDocument()

    // Re-render back to unauthenticated
    rerender(
      <AuthProvider user={null}>
        <AuthenticatedWrapper>
          <div>Protected content</div>
        </AuthenticatedWrapper>
      </AuthProvider>,
    )

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })
})
