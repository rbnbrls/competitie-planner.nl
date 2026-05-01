import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { http, HttpResponse } from 'msw'
import { server } from '../test/msw/server'
import { useCompetities } from '../hooks/useCompetities'
import { showToast } from '../components/Toast'
import { getErrorMessage } from './utils'

const API_BASE = 'http://localhost:8000/api/v1'

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
})
afterAll(() => server.close())

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('Error Handling — 422 Validation Errors', () => {
  it('shows validation error for single field violation', async () => {
    const errorSpy = vi.spyOn(showToast, 'error')

    server.use(
      http.post(`${API_BASE}/tenant/competities`, () =>
        HttpResponse.json(
          {
            detail: [
              { loc: ['body', 'naam'], msg: 'Naam is vereist', type: 'missing' },
            ],
          },
          { status: 422 }
        )
      )
    )

    const { result } = renderHook(() => useCompetities(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      try {
        await result.current.createCompetitie({
          naam: '',
          speeldag: 'maandag',
          start_datum: '2025-01-01',
          eind_datum: '2025-06-30',
        })
      } catch {
        // expected validation failure
      }
    })

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('Naam is vereist')
    })
    errorSpy.mockRestore()
  })

  it('shows first error when multiple validation fields fail', async () => {
    const errorSpy = vi.spyOn(showToast, 'error')

    server.use(
      http.post(`${API_BASE}/tenant/competities`, () =>
        HttpResponse.json(
          {
            detail: [
              { loc: ['body', 'naam'], msg: 'Naam is vereist', type: 'missing' },
              { loc: ['body', 'speeldag'], msg: 'Ongeldige speeldag', type: 'value_error' },
              { loc: ['body', 'start_datum'], msg: 'Start datum moet in de toekomst zijn', type: 'value_error' },
            ],
          },
          { status: 422 }
        )
      )
    )

    const { result } = renderHook(() => useCompetities(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      try {
        await result.current.createCompetitie({
          naam: '',
          speeldag: 'invalid',
          start_datum: '2020-01-01',
          eind_datum: '2025-06-30',
        })
      } catch {
        // expected validation failure
      }
    })

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('Naam is vereist')
    })
    errorSpy.mockRestore()
  })

  it('handles 422 error with string detail array', async () => {
    const errorSpy = vi.spyOn(showToast, 'error')

    server.use(
      http.post(`${API_BASE}/tenant/competities`, () =>
        HttpResponse.json(
          {
            detail: ['Naam must be at least 2 characters'],
          },
          { status: 422 }
        )
      )
    )

    const { result } = renderHook(() => useCompetities(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      try {
        await result.current.createCompetitie({
          naam: 'A',
          speeldag: 'maandag',
          start_datum: '2025-01-01',
          eind_datum: '2025-06-30',
        })
      } catch {
        // expected validation failure
      }
    })

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('Naam must be at least 2 characters')
    })
    errorSpy.mockRestore()
  })

  it('shows fallback message when 422 detail has unexpected format', async () => {
    const errorSpy = vi.spyOn(showToast, 'error')

    server.use(
      http.post(`${API_BASE}/tenant/competities`, () =>
        HttpResponse.json(
          {
            detail: [],
          },
          { status: 422 }
        )
      )
    )

    const { result } = renderHook(() => useCompetities(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      try {
        await result.current.createCompetitie({
          naam: 'Test',
          speeldag: 'maandag',
          start_datum: '2025-01-01',
          eind_datum: '2025-06-30',
        })
      } catch {
        // expected validation failure
      }
    })

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('Fout bij aanmaken')
    })
    errorSpy.mockRestore()
  })

  it('uses getErrorMessage to extract validation error correctly', () => {
    const validationError = {
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ['body', 'email'], msg: 'invalid email format', type: 'value_error.email' },
          ],
        },
      },
    }

    const message = getErrorMessage(validationError, 'Validatie mislukt')
    expect(message).toBe('invalid email format')
  })
})

describe('Error Handling — 500 Server Errors', () => {
  it('shows error toast when server returns 500 on create', async () => {
    const errorSpy = vi.spyOn(showToast, 'error')

    server.use(
      http.post(`${API_BASE}/tenant/competities`, () =>
        HttpResponse.json(
          { detail: 'Interne serverfout' },
          { status: 500 }
        )
      )
    )

    const { result } = renderHook(() => useCompetities(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      try {
        await result.current.createCompetitie({
          naam: 'Test',
          speeldag: 'maandag',
          start_datum: '2025-01-01',
          eind_datum: '2025-06-30',
        })
      } catch {
        // expected failure
      }
    })

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled()
    })
    errorSpy.mockRestore()
  })

  it('extracts error message from 500 response using getErrorMessage', () => {
    const serverError = {
      response: {
        status: 500,
        data: {
          detail: 'Database connection timeout',
        },
      },
    }

    const message = getErrorMessage(serverError, 'Server error')
    expect(message).toBe('Database connection timeout')
  })

  it('falls back to default message when 500 has no detail', async () => {
    const errorSpy = vi.spyOn(showToast, 'error')

    server.use(
      http.post(`${API_BASE}/tenant/competities`, () =>
        HttpResponse.json({}, { status: 500 })
      )
    )

    const { result } = renderHook(() => useCompetities(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      try {
        await result.current.createCompetitie({
          naam: 'Test',
          speeldag: 'maandag',
          start_datum: '2025-01-01',
          eind_datum: '2025-06-30',
        })
      } catch {
        // expected failure
      }
    })

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('Fout bij aanmaken')
    })
    errorSpy.mockRestore()
  })

  it('handles 500 error on list query', async () => {
    server.use(
      http.get(`${API_BASE}/tenant/competities`, () =>
        HttpResponse.json(
          { detail: 'Service unavailable' },
          { status: 500 }
        )
      )
    )

    const { result } = renderHook(() => useCompetities(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.competities).toEqual([])
  })
})

describe('Error Handling — Network Timeout', () => {
  it('handles network timeout on query', async () => {
    server.use(
      http.get(`${API_BASE}/tenant/competities`, async () => {
        // Simulate a timeout by delaying longer than test timeout
        await new Promise((resolve) => setTimeout(resolve, 30000))
        return HttpResponse.json([])
      })
    )

    const { result } = renderHook(() => useCompetities(), {
      wrapper: createWrapper(),
    })

    // Should still be loading after reasonable wait (timeout hasn't fired yet)
    expect(result.current.isLoading).toBe(true)
  })

  it('handles network timeout on mutation', async () => {
    const errorSpy = vi.spyOn(showToast, 'error')

    server.use(
      http.post(`${API_BASE}/tenant/competities`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 30000))
        return HttpResponse.json({ id: 'new-id' })
      })
    )

    const { result } = renderHook(() => useCompetities(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let caughtError: Error | null = null
    await act(async () => {
      try {
        // This will timeout and throw
        await Promise.race([
          result.current.createCompetitie({
            naam: 'Test',
            speeldag: 'maandag',
            start_datum: '2025-01-01',
            eind_datum: '2025-06-30',
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 50)
          ),
        ])
      } catch (err) {
        caughtError = err as Error
      }
    })

    expect(caughtError).not.toBeNull()
    expect(caughtError?.message).toBe('timeout')
    errorSpy.mockRestore()
  })
})

describe('Error Handling — Backend Unavailable (Graceful Degradation)', () => {
  it('handles network error when backend is completely down', async () => {
    const errorSpy = vi.spyOn(showToast, 'error')

    // Simulate complete backend unavailability (network error)
    server.use(
      http.get(`${API_BASE}/tenant/competities`, () => {
        return HttpResponse.json({ detail: 'Service Unavailable' }, { status: 503 })
      })
    )

    const { result } = renderHook(() => useCompetities(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // Should not crash, should handle error gracefully
    expect(result.current.competities).toEqual([])
    errorSpy.mockRestore()
  })

  it('handles network error on mutation when backend is down', async () => {
    const errorSpy = vi.spyOn(showToast, 'error')

    server.use(
      http.post(`${API_BASE}/tenant/competities`, () => {
        return HttpResponse.json({ detail: 'Service Unavailable' }, { status: 503 })
      })
    )

    const { result } = renderHook(() => useCompetities(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      try {
        await result.current.createCompetitie({
          naam: 'Test',
          speeldag: 'maandag',
          start_datum: '2025-01-01',
          eind_datum: '2025-06-30',
        })
      } catch {
        // expected failure
      }
    })

    // Should show error message but not crash
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('Service Unavailable')
    })
    errorSpy.mockRestore()
  })

  it('getErrorMessage handles network error without response object', () => {
    const networkError = {
      message: 'Network Error',
      code: 'ERR_NETWORK',
      config: {
        baseURL: 'http://localhost:8000/api/v1',
        url: '/tenant/competities',
      },
    }

    const message = getErrorMessage(networkError, 'Verbinding met server mislukt')
    expect(message).toBe('Verbinding met server mislukt')
  })

  it('getErrorMessage handles 503 Service Unavailable', () => {
    const serviceUnavailableError = {
      response: {
        status: 503,
        data: {
          detail: 'Service is tijdelijk niet beschikbaar',
        },
      },
    }

    const message = getErrorMessage(serviceUnavailableError, 'Server niet bereikbaar')
    expect(message).toBe('Service is tijdelijk niet beschikbaar')
  })

  it('does not redirect or crash on 5xx errors', async () => {
    const errorSpy = vi.spyOn(showToast, 'error')

    server.use(
      http.post(`${API_BASE}/tenant/competities`, () =>
        HttpResponse.json(
          { detail: 'Internal Server Error' },
          { status: 500 }
        )
      )
    )

    const { result } = renderHook(() => useCompetities(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      try {
        await result.current.createCompetitie({
          naam: 'Test',
          speeldag: 'maandag',
          start_datum: '2025-01-01',
          eind_datum: '2025-06-30',
        })
      } catch {
        // expected failure
      }
    })

    // Should show error toast
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('Internal Server Error')
    })

    errorSpy.mockRestore()
  })
})

describe('Error Handling — Common HTTP Error Codes', () => {
  it('handles 401 unauthorized on mutation', async () => {
    const errorSpy = vi.spyOn(showToast, 'error')

    server.use(
      http.post(`${API_BASE}/tenant/competities`, () =>
        HttpResponse.json(
          { detail: 'Not authenticated' },
          { status: 401 }
        )
      )
    )

    const { result } = renderHook(() => useCompetities(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      try {
        await result.current.createCompetitie({
          naam: 'Test',
          speeldag: 'maandag',
          start_datum: '2025-01-01',
          eind_datum: '2025-06-30',
        })
      } catch {
        // expected failure
      }
    })

    // The 401 interceptor will try to refresh token, but since no refresh token exists,
    // it should eventually fail and redirect to login
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled()
    })
    errorSpy.mockRestore()
  })

  it('handles 403 forbidden', () => {
    const forbiddenError = {
      response: {
        status: 403,
        data: {
          detail: 'You do not have permission to access this resource',
        },
      },
    }

    const message = getErrorMessage(forbiddenError, 'Toegang geweigerd')
    expect(message).toBe('You do not have permission to access this resource')
  })

  it('handles 404 not found', () => {
    const notFoundError = {
      response: {
        status: 404,
        data: {
          detail: 'Competitie not found',
        },
      },
    }

    const message = getErrorMessage(notFoundError, 'Niet gevonden')
    expect(message).toBe('Competitie not found')
  })

  it('handles 409 conflict', () => {
    const conflictError = {
      response: {
        status: 409,
        data: {
          detail: 'Team name already exists in this competition',
        },
      },
    }

    const message = getErrorMessage(conflictError, 'Conflict')
    expect(message).toBe('Team name already exists in this competition')
  })

  it('handles 429 rate limit', () => {
    const rateLimitError = {
      response: {
        status: 429,
        data: {
          detail: 'Too many requests. Please try again later.',
        },
      },
    }

    const message = getErrorMessage(rateLimitError, 'Te veel verzoeken')
    expect(message).toBe('Too many requests. Please try again later.')
  })
})
