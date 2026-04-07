import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../../contexts/AuthContext'
import { server } from '../../test/msw/server'
import Login from './Login'

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {ui}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('Login Component', () => {
  it('renders login form', () => {
    renderWithProviders(<Login />)
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/wachtwoord/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /inloggen/i })).toBeInTheDocument()
  })

  it('shows error message when login fails with invalid credentials', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Login />)
    
    await user.type(screen.getByLabelText(/email/i), 'wrong@test.nl')
    await user.type(screen.getByLabelText(/wachtwoord/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /inloggen/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/ongeldige inloggegevens/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('redirects to dashboard on successful login', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/tenant/dashboard" element={<div data-testid="dashboard">Dashboard Page</div>} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    )
    
    await user.type(screen.getByLabelText(/email/i), 'admin@testclub.nl')
    await user.type(screen.getByLabelText(/wachtwoord/i), 'password123')
    await user.click(screen.getByRole('button', { name: /inloggen/i }))
    
    // Verify we have navigated to the dashboard page
    await waitFor(() => {
      expect(screen.queryByTestId('dashboard')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})