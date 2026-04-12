import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '../test/msw/server'
import { AuthProvider, useAuth } from './AuthContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
})
afterAll(() => server.close())

function TestComponent() {
  const { user, club, isLoading, isSuperadmin } = useAuth()
  if (isLoading) return <div>Loading...</div>
  return (
    <div>
      <div data-testid="user">{user ? user.email : 'geen gebruiker'}</div>
      <div data-testid="club">{club ? club.naam : 'geen club'}</div>
      <div data-testid="superadmin">{isSuperadmin ? 'superadmin' : 'niet superadmin'}</div>
    </div>
  )
}

function LoginTestComponent() {
  const { login, user, isLoading } = useAuth()
  if (isLoading) return <div>Loading...</div>
  return (
    <div>
      <div data-testid="user">{user ? user.email : 'geen gebruiker'}</div>
      <button onClick={() => login('admin@testclub.nl', 'password123', 'testclub')}>
        Login als tenant
      </button>
      <button onClick={() => login('superadmin@example.com', 'password123')}>
        Login als superadmin
      </button>
    </div>
  )
}

function LogoutTestComponent() {
  const { login, logout, user, isLoading } = useAuth()
  if (isLoading) return <div>Loading...</div>
  return (
    <div>
      <div data-testid="user">{user ? user.email : 'geen gebruiker'}</div>
      <button onClick={() => login('admin@testclub.nl', 'password123', 'testclub')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  it('throws error when useAuth is used outside of AuthProvider', () => {
    const original = console.error
    console.error = () => {}
    expect(() => {
      function BadComponent() {
        useAuth()
        return null
      }
      render(<BadComponent />)
    }).toThrow('useAuth must be used within an AuthProvider')
    console.error = original
  })

  it('starts with no user when no token in localStorage', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    )
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('geen gebruiker')
    })
  })

  it('initializes as loading then resolves', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    )
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
  })

  it('restores tenant session from localStorage', async () => {
    localStorage.setItem('access_token', 'test_token')
    localStorage.setItem('club_slug', 'testclub')

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('admin@testclub.nl')
    })
    expect(screen.getByTestId('club')).toHaveTextContent('Test Club')
    expect(screen.getByTestId('superadmin')).toHaveTextContent('niet superadmin')
  })

  it('restores superadmin session from localStorage', async () => {
    localStorage.setItem('access_token', 'test_token')

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('admin@testclub.nl')
    })
    expect(screen.getByTestId('superadmin')).toHaveTextContent('superadmin')
  })

  it('falls back to superadmin tenant session when tenant restore is unauthorized', async () => {
    const { http, HttpResponse } = await import('msw')
    server.use(
      http.get('http://localhost:8000/api/v1/tenant/club', () =>
        HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
      )
    )

    localStorage.setItem('access_token', 'invalid_token')
    localStorage.setItem('club_slug', 'testclub')

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('admin@testclub.nl')
    })
    expect(screen.getByTestId('club')).toHaveTextContent('Test Club')
    expect(localStorage.getItem('club_slug')).toBe('testclub')
  })

  it('logs in as tenant user and sets user + club', async () => {
    const { fireEvent: fe } = await import('@testing-library/react')

    render(
      <TestWrapper>
        <LoginTestComponent />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    await act(async () => {
      fe.click(screen.getByText('Login als tenant'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('admin@testclub.nl')
    })
    expect(localStorage.getItem('access_token')).toBe('test_access_token')
    expect(localStorage.getItem('club_slug')).toBe('testclub')
  })

  it('logs out and clears state', async () => {
    const { fireEvent: fe } = await import('@testing-library/react')
    localStorage.setItem('access_token', 'test_token')
    localStorage.setItem('club_slug', 'testclub')

    render(
      <TestWrapper>
        <LogoutTestComponent />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('admin@testclub.nl')
    })

    await act(async () => {
      fe.click(screen.getByText('Logout'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('geen gebruiker')
    })
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(localStorage.getItem('club_slug')).toBeNull()
  })
})
