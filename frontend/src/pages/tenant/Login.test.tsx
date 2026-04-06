import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
      <BrowserRouter>{ui}</BrowserRouter>
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

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Login />)
    
    await user.click(screen.getByRole('button', { name: /inloggen/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/email is verplicht/i)).toBeInTheDocument()
    })
  })

  it('shows error on invalid credentials', async () => {
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
    renderWithProviders(<Login />)
    
    await user.type(screen.getByLabelText(/email/i), 'admin@testclub.nl')
    await user.type(screen.getByLabelText(/wachtwoord/i), 'password123')
    await user.click(screen.getByRole('button', { name: /inloggen/i }))
    
    await waitFor(() => {
      expect(window.location.href).toContain('/tenant/dashboard')
    }, { timeout: 3000 })
  })
})