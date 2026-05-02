import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest'
import axios from 'axios'
import { server } from '../test/msw/server'
import { api, ApiError, authApi, tenantApi, superadminApi, paymentApi, onboardingApi } from './api'

const API_BASE = 'http://localhost:8000/api/v1'

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
})
afterAll(() => server.close())

describe('ApiError class', () => {
  it('creates error with message only', () => {
    const error = new ApiError('Something went wrong')
    expect(error.message).toBe('Something went wrong')
    expect(error.name).toBe('ApiError')
    expect(error.status).toBeUndefined()
    expect(error.isNetworkError).toBeUndefined()
    expect(error.isRetryable).toBe(false)
    expect(error.data).toBeUndefined()
  })

  it('creates error with status code', () => {
    const error = new ApiError('Not found', { status: 404 })
    expect(error.status).toBe(404)
    expect(error.isRetryable).toBe(false)
  })

  it('sets isRetryable automatically for 502', () => {
    const error = new ApiError('Bad gateway', { status: 502 })
    expect(error.isRetryable).toBe(true)
  })

  it('sets isRetryable automatically for 503', () => {
    const error = new ApiError('Service unavailable', { status: 503 })
    expect(error.isRetryable).toBe(true)
  })

  it('sets isRetryable automatically for 504', () => {
    const error = new ApiError('Gateway timeout', { status: 504 })
    expect(error.isRetryable).toBe(true)
  })

  it('does not set isRetryable for non-retryable status codes', () => {
    const error400 = new ApiError('Bad request', { status: 400 })
    expect(error400.isRetryable).toBe(false)

    const error500 = new ApiError('Internal error', { status: 500 })
    expect(error500.isRetryable).toBe(false)
  })

  it('allows overriding isRetryable explicitly', () => {
    const error = new ApiError('Custom retryable', { status: 400, isRetryable: true })
    expect(error.isRetryable).toBe(true)
  })

  it('creates error with network error flag', () => {
    const error = new ApiError('Network error', { isNetworkError: true })
    expect(error.isNetworkError).toBe(true)
  })

  it('creates error with data payload', () => {
    const data = { detail: 'Validation failed' }
    const error = new ApiError('Validation error', { data })
    expect(error.data).toEqual(data)
  })

  it('is instance of Error', () => {
    const error = new ApiError('Test')
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ApiError)
  })
})

describe('createApiError helper via response interceptor', () => {
  it('transforms 400 response with user-friendly Dutch message', async () => {
    const { http, HttpResponse } = await import('msw')
    server.use(
      http.get(`${API_BASE}/test`, () =>
        HttpResponse.json({ detail: 'Bad request' }, { status: 400 })
      )
    )

    try {
      await api.get('/test')
      expect.fail('Should have thrown')
    } catch (error: any) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(400)
      expect(error.message).toBe('Ongeldige aanvraag. Controleer uw invoer en probeer opnieuw.')
      expect(error.data).toEqual({ detail: 'Bad request' })
    }
  })

  it('transforms 403 response with user-friendly Dutch message', async () => {
    const { http, HttpResponse } = await import('msw')
    server.use(
      http.get(`${API_BASE}/test`, () =>
        HttpResponse.json({ detail: 'Forbidden' }, { status: 403 })
      )
    )

    try {
      await api.get('/test')
      expect.fail('Should have thrown')
    } catch (error: any) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(403)
      expect(error.message).toBe('U heeft geen toestemming voor deze actie.')
    }
  })

  it('transforms 404 response with user-friendly Dutch message', async () => {
    const { http, HttpResponse } = await import('msw')
    server.use(
      http.get(`${API_BASE}/test`, () =>
        HttpResponse.json({ detail: 'Not found' }, { status: 404 })
      )
    )

    try {
      await api.get('/test')
      expect.fail('Should have thrown')
    } catch (error: any) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(404)
      expect(error.message).toBe('De opgevraagde resource is niet gevonden.')
    }
  })

  it('transforms 409 response with user-friendly Dutch message', async () => {
    const { http, HttpResponse } = await import('msw')
    server.use(
      http.get(`${API_BASE}/test`, () =>
        HttpResponse.json({ detail: 'Conflict' }, { status: 409 })
      )
    )

    try {
      await api.get('/test')
      expect.fail('Should have thrown')
    } catch (error: any) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(409)
      expect(error.message).toBe('Er is een conflict met de huidige status van de resource.')
    }
  })

  it('transforms 422 response with user-friendly Dutch message', async () => {
    const { http, HttpResponse } = await import('msw')
    server.use(
      http.get(`${API_BASE}/test`, () =>
        HttpResponse.json({ detail: 'Unprocessable' }, { status: 422 })
      )
    )

    try {
      await api.get('/test')
      expect.fail('Should have thrown')
    } catch (error: any) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(422)
      expect(error.message).toBe('Ongeldige gegevens. Controleer uw invoer.')
    }
  })

  it('transforms 429 response with user-friendly Dutch message', async () => {
    const { http, HttpResponse } = await import('msw')
    server.use(
      http.get(`${API_BASE}/test`, () =>
        HttpResponse.json({ detail: 'Rate limited' }, { status: 429 })
      )
    )

    try {
      await api.get('/test')
      expect.fail('Should have thrown')
    } catch (error: any) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(429)
      expect(error.message).toBe('Te veel aanvragen. Wacht even en probeer opnieuw.')
    }
  })

  it('transforms 500 response with user-friendly Dutch message', async () => {
    const { http, HttpResponse } = await import('msw')
    server.use(
      http.get(`${API_BASE}/test`, () =>
        HttpResponse.json({ detail: 'Internal error' }, { status: 500 })
      )
    )

    try {
      await api.get('/test')
      expect.fail('Should have thrown')
    } catch (error: any) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(500)
      expect(error.message).toBe('Er is een interne serverfout opgetreden. Probeer het later opnieuw.')
    }
  })

  it('transforms 502 response with user-friendly Dutch message', async () => {
    const { http, HttpResponse } = await import('msw')
    server.use(
      http.get(`${API_BASE}/test`, () =>
        HttpResponse.json({ detail: 'Bad gateway' }, { status: 502 })
      )
    )

    try {
      await api.get('/test')
      expect.fail('Should have thrown')
    } catch (error: any) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(502)
      expect(error.message).toBe('De server is tijdelijk niet bereikbaar. Probeer het over een moment opnieuw.')
    }
  })

  it('transforms 503 response with user-friendly Dutch message', async () => {
    const { http, HttpResponse } = await import('msw')
    server.use(
      http.get(`${API_BASE}/test`, () =>
        HttpResponse.json({ detail: 'Maintenance' }, { status: 503 })
      )
    )

    try {
      await api.get('/test')
      expect.fail('Should have thrown')
    } catch (error: any) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(503)
      expect(error.message).toBe('De dienst is tijdelijk niet beschikbaar door onderhoud. Probeer het later opnieuw.')
    }
  })

  it('transforms 504 response with user-friendly Dutch message', async () => {
    const { http, HttpResponse } = await import('msw')
    server.use(
      http.get(`${API_BASE}/test`, () =>
        HttpResponse.json({ detail: 'Gateway timeout' }, { status: 504 })
      )
    )

    try {
      await api.get('/test')
      expect.fail('Should have thrown')
    } catch (error: any) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(504)
      expect(error.message).toBe('De server reageert niet op tijd. Controleer uw verbinding en probeer opnieuw.')
    }
  })
})

describe('Request interceptor — Auth token', () => {
  it('attaches access_token to outgoing requests when present', async () => {
    const { http, HttpResponse } = await import('msw')

    let capturedHeaders: Record<string, string> = {}
    server.use(
      http.get(`${API_BASE}/test`, ({ request }) => {
        capturedHeaders = {}
        request.headers.forEach((value, key) => {
          capturedHeaders[key] = value
        })
        return HttpResponse.json({ ok: true })
      })
    )

    localStorage.setItem('access_token', 'test-token-123')
    await api.get('/test')

    expect(capturedHeaders['authorization']).toBe('Bearer test-token-123')
  })

  it('does not attach Authorization header when no token present', async () => {
    const { http, HttpResponse } = await import('msw')

    let capturedHeaders: Record<string, string> = {}
    server.use(
      http.get(`${API_BASE}/test`, ({ request }) => {
        capturedHeaders = {}
        request.headers.forEach((value, key) => {
          capturedHeaders[key] = value
        })
        return HttpResponse.json({ ok: true })
      })
    )

    await api.get('/test')

    expect(capturedHeaders['authorization']).toBeUndefined()
  })

  it('attaches Content-Type header by default', async () => {
    const { http, HttpResponse } = await import('msw')

    let capturedHeaders: Record<string, string> = {}
    server.use(
      http.get(`${API_BASE}/test`, ({ request }) => {
        capturedHeaders = {}
        request.headers.forEach((value, key) => {
          capturedHeaders[key] = value
        })
        return HttpResponse.json({ ok: true })
      })
    )

    await api.get('/test')

    expect(capturedHeaders['content-type']).toBe('application/json')
  })
})

describe('Response interceptor — Token refresh', () => {
  it('refreshes token on 401 and retries original request', async () => {
    const { http, HttpResponse } = await import('msw')

    let protectedCallCount = 0
    server.use(
      http.get(`${API_BASE}/protected`, () => {
        protectedCallCount++
        if (protectedCallCount === 1) {
          return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
        }
        return HttpResponse.json({ data: 'success' })
      }),
      http.post(`${API_BASE}/auth/refresh`, () => {
        return HttpResponse.json({ access_token: 'new-token' })
      })
    )

    localStorage.setItem('access_token', 'old-token')
    localStorage.setItem('refresh_token', 'valid-refresh-token')

    const response = await api.get('/protected')

    expect(response.data).toEqual({ data: 'success' })
    expect(localStorage.getItem('access_token')).toBe('new-token')
  })

  it('clears tokens when token refresh fails (redirect happens in browser)', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/protected`, () =>
        HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
      ),
      http.post(`${API_BASE}/auth/refresh`, () =>
        HttpResponse.json({ detail: 'Invalid refresh token' }, { status: 401 })
      )
    )

    localStorage.setItem('access_token', 'expired-token')
    localStorage.setItem('refresh_token', 'invalid-refresh-token')

    try {
      await api.get('/protected')
    } catch (error: any) {
      // Expected - should reject with 401 ApiError
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(401)
    }

    // Verify tokens are cleared (redirect to /login happens in real browser)
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('does not attempt refresh on /login endpoint 401', async () => {
    const { http, HttpResponse } = await import('msw')

    let refreshCalled = false
    server.use(
      http.post(`${API_BASE}/auth/login`, () =>
        HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 })
      ),
      http.post(`${API_BASE}/auth/refresh`, () => {
        refreshCalled = true
        return HttpResponse.json({ access_token: 'new-token' })
      })
    )

    localStorage.setItem('access_token', 'some-token')

    try {
      await api.post('/auth/login', new URLSearchParams())
    } catch {
      // Expected
    }

    expect(refreshCalled).toBe(false)
  })

  it('rejects with ApiError when 401 received without refresh token', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/protected`, () =>
        HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
      )
    )

    localStorage.setItem('access_token', 'expired-token')
    // No refresh_token set

    try {
      await api.get('/protected')
      expect.fail('Should have thrown')
    } catch (error: any) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(401)
      expect(error.message).toBe('Uw sessie is verlopen. Log opnieuw in.')
    }
  })
})

describe('Response interceptor — Retry logic', () => {
  it('retries on 503 and succeeds on second attempt', async () => {
    const { http, HttpResponse } = await import('msw')

    let requestCount = 0
    server.use(
      http.get(`${API_BASE}/test`, () => {
        requestCount++
        if (requestCount === 1) {
          return HttpResponse.json({ detail: 'Service unavailable' }, { status: 503 })
        }
        return HttpResponse.json({ data: 'success' })
      })
    )

    const response = await api.get('/test')

    expect(response.data).toEqual({ data: 'success' })
    expect(requestCount).toBe(2)
  }, 10000)

  it('retries on 502 and succeeds on second attempt', async () => {
    const { http, HttpResponse } = await import('msw')

    let requestCount = 0
    server.use(
      http.get(`${API_BASE}/test`, () => {
        requestCount++
        if (requestCount === 1) {
          return HttpResponse.json({ detail: 'Bad gateway' }, { status: 502 })
        }
        return HttpResponse.json({ data: 'success' })
      })
    )

    const response = await api.get('/test')

    expect(response.data).toEqual({ data: 'success' })
    expect(requestCount).toBe(2)
  }, 10000)

  it('retries on 504 and succeeds on second attempt', async () => {
    const { http, HttpResponse } = await import('msw')

    let requestCount = 0
    server.use(
      http.get(`${API_BASE}/test`, () => {
        requestCount++
        if (requestCount === 1) {
          return HttpResponse.json({ detail: 'Gateway timeout' }, { status: 504 })
        }
        return HttpResponse.json({ data: 'success' })
      })
    )

    const response = await api.get('/test')

    expect(response.data).toEqual({ data: 'success' })
    expect(requestCount).toBe(2)
  }, 10000)
})

describe('API endpoints — authApi', () => {
  it('login returns correct response shape', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.post(`${API_BASE}/auth/login`, async ({ request }) => {
        const body = await request.text()
        const params = new URLSearchParams(body)
        expect(params.get('username')).toBe('test@example.com')
        expect(params.get('password')).toBe('password123')
        return HttpResponse.json({ access_token: 'token', refresh_token: 'refresh' })
      })
    )

    const response = await authApi.login('test@example.com', 'password123')
    expect(response.data.access_token).toBe('token')
    expect(response.data.refresh_token).toBe('refresh')
  })

  it('logout returns correct response shape', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.post(`${API_BASE}/auth/logout`, () =>
        HttpResponse.json({ success: true })
      )
    )

    const response = await authApi.logout()
    expect(response.data.success).toBe(true)
  })

  it('me returns correct response shape', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        HttpResponse.json({ id: '1', email: 'test@example.com', full_name: 'Test User' })
      )
    )

    const response = await authApi.me()
    expect(response.data.email).toBe('test@example.com')
    expect(response.data.full_name).toBe('Test User')
  })

  it('adminExists returns correct response shape', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/auth/admin-exists`, () =>
        HttpResponse.json({ exists: true })
      )
    )

    const response = await authApi.adminExists()
    expect(response.data.exists).toBe(true)
  })

  it('registerAdmin returns correct response shape', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.post(`${API_BASE}/auth/register-admin`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>
        expect(body.email).toBe('admin@example.com')
        expect(body.full_name).toBe('Admin User')
        return HttpResponse.json({ id: '1', email: 'admin@example.com' }, { status: 201 })
      })
    )

    const response = await authApi.registerAdmin('admin@example.com', 'password123', 'Admin User')
    expect(response.status).toBe(201)
    expect(response.data.email).toBe('admin@example.com')
  })
})

describe('API endpoints — tenantApi URL encoding', () => {
  it('encodes slug parameter in tenant login URL', async () => {
    const { http, HttpResponse } = await import('msw')

    let capturedUrl = ''
    server.use(
      http.post(`${API_BASE}/tenant/login`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ success: true })
      })
    )

    await tenantApi.login('test@example.com', 'password', 'my-club')

    expect(capturedUrl).toContain('slug=my-club')
  })

  it('encodes slug parameter with special characters', async () => {
    const { http, HttpResponse } = await import('msw')

    let capturedUrl = ''
    server.use(
      http.post(`${API_BASE}/tenant/login`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ success: true })
      })
    )

    await tenantApi.login('test@example.com', 'password', 'my+club/slug')

    expect(capturedUrl).toContain('slug=')
    expect(capturedUrl).not.toContain('my+club/slug')
    expect(decodeURIComponent(capturedUrl.split('slug=')[1]?.split('&')[0] ?? '')).toBe('my+club/slug')
  })

  it('encodes slug parameter in superadmin-login URL', async () => {
    const { http, HttpResponse } = await import('msw')

    let capturedUrl = ''
    server.use(
      http.post(`${API_BASE}/tenant/superadmin-login`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ success: true })
      })
    )

    await tenantApi.superadminLogin('test-club')

    expect(capturedUrl).toContain('slug=test-club')
  })

  it('encodes IDs in tenant user endpoints', async () => {
    const { http, HttpResponse } = await import('msw')

    let capturedUrl = ''
    server.use(
      http.get(`${API_BASE}/tenant/users/*`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ id: 'user-123', email: 'user@example.com' })
      })
    )

    await tenantApi.getUser('user-123')

    expect(capturedUrl).toContain('user-123')
  })

  it('encodes IDs in tenant baan endpoints', async () => {
    const { http, HttpResponse } = await import('msw')

    let capturedUrl = ''
    server.use(
      http.patch(`${API_BASE}/tenant/banen/*`, async ({ request }) => {
        capturedUrl = request.url
        const body = await request.json() as Record<string, unknown>
        return HttpResponse.json({ ...body, id: 'baan-456' })
      })
    )

    const response = await tenantApi.updateBaan('baan-456', { nummer: 1 })
    expect(capturedUrl).toContain('baan-456')
    expect(response.data.nummer).toBe(1)
  })
})

describe('API endpoints — tenantApi shapes', () => {
  it('listCompetities returns paginated response', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/tenant/competities`, () =>
        HttpResponse.json({
          items: [
            { id: '1', naam: 'Competitie 1' },
            { id: '2', naam: 'Competitie 2' },
          ],
          total: 2,
          pages: 1,
        })
      )
    )

    const response = await tenantApi.listCompetities()
    expect(response.data.items).toHaveLength(2)
    expect(response.data.total).toBe(2)
    expect(response.data.pages).toBe(1)
  })

  it('getCompetition returns single object', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/tenant/competities/*`, () =>
        HttpResponse.json({ id: 'comp-1', naam: 'Test Competitie', actief: true })
      )
    )

    const response = await tenantApi.getCompetition('comp-1')
    expect(response.data.id).toBe('comp-1')
    expect(response.data.naam).toBe('Test Competitie')
  })

  it('createCompetition returns created object', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.post(`${API_BASE}/tenant/competities`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>
        return HttpResponse.json({ id: 'new-comp', ...body }, { status: 201 })
      })
    )

    const response = await tenantApi.createCompetition({
      naam: 'New Competitie',
      speeldag: 'maandag',
      start_datum: '2025-01-01',
      eind_datum: '2025-06-30',
    })
    expect(response.status).toBe(201)
    expect(response.data.naam).toBe('New Competitie')
  })

  it('listTeams returns paginated response', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/tenant/competities/*/teams`, () =>
        HttpResponse.json({
          items: [
            { id: 'team-1', naam: 'Team A' },
            { id: 'team-2', naam: 'Team B' },
          ],
          total: 2,
          pages: 1,
        })
      )
    )

    const response = await tenantApi.listTeams('comp-1')
    expect(response.data.items).toHaveLength(2)
    expect(response.data.total).toBe(2)
  })

  it('getRondeDetail returns ronde object', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/tenant/rondes/*`, () =>
        HttpResponse.json({ id: 'ronde-1', datum: '2025-03-15', status: 'gepland' })
      )
    )

    const response = await tenantApi.getRondeDetail('ronde-1')
    expect(response.data.id).toBe('ronde-1')
    expect(response.data.status).toBe('gepland')
  })

  it('getDashboard returns dashboard data', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/tenant/dashboard`, () =>
        HttpResponse.json({ upcoming_wedstrijden: 5, active_competities: 2 })
      )
    )

    const response = await tenantApi.getDashboard()
    expect(response.data.upcoming_wedstrijden).toBe(5)
    expect(response.data.active_competities).toBe(2)
  })

  it('getClub returns club data', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/tenant/club`, () =>
        HttpResponse.json({ id: 'club-1', naam: 'Test Club', slug: 'test-club' })
      )
    )

    const response = await tenantApi.getClub()
    expect(response.data.naam).toBe('Test Club')
    expect(response.data.slug).toBe('test-club')
  })

  it('listBanen returns array', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/tenant/banen`, () =>
        HttpResponse.json([
          { id: 'baan-1', nummer: 1, naam: 'Baan 1' },
          { id: 'baan-2', nummer: 2, naam: 'Baan 2' },
        ])
      )
    )

    const response = await tenantApi.listBanen()
    expect(Array.isArray(response.data)).toBe(true)
    expect(response.data[0].nummer).toBe(1)
  })

  it('listUsers returns array', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/tenant/users`, () =>
        HttpResponse.json([
          { id: 'user-1', email: 'user1@example.com' },
          { id: 'user-2', email: 'user2@example.com' },
        ])
      )
    )

    const response = await tenantApi.listUsers()
    expect(Array.isArray(response.data)).toBe(true)
    expect(response.data).toHaveLength(2)
  })
})

describe('API endpoints — superadminApi shapes', () => {
  it('listClubs returns array', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/superadmin/clubs`, () =>
        HttpResponse.json({
          clubs: [{ id: '1', naam: 'Club A' }],
          total: 1,
        })
      )
    )

    const response = await superadminApi.listClubs()
    expect(response.data.clubs).toHaveLength(1)
  })

  it('getClub returns club object', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/superadmin/clubs/*`, () =>
        HttpResponse.json({ id: 'club-1', naam: 'Super Club' })
      )
    )

    const response = await superadminApi.getClub('club-1')
    expect(response.data.naam).toBe('Super Club')
  })

  it('createClub returns created club', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.post(`${API_BASE}/superadmin/clubs`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>
        return HttpResponse.json({ id: 'new-club', ...body }, { status: 201 })
      })
    )

    const response = await superadminApi.createClub({
      naam: 'New Club',
      slug: 'new-club',
    })
    expect(response.status).toBe(201)
    expect(response.data.naam).toBe('New Club')
  })

  it('getDashboard returns dashboard data', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/superadmin/dashboard`, () =>
        HttpResponse.json({ total_clubs: 10, active_users: 50 })
      )
    )

    const response = await superadminApi.getDashboard()
    expect(response.data.total_clubs).toBe(10)
  })

  it('listUsers returns paginated response', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/superadmin/users`, () =>
        HttpResponse.json({
          items: [{ id: '1', email: 'user@example.com' }],
          total: 1,
          pages: 1,
        })
      )
    )

    const response = await superadminApi.listUsers()
    expect(response.data.items).toHaveLength(1)
  })

  it('getMollieConfig returns config', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/payments/config`, () =>
        HttpResponse.json({ configured: true })
      )
    )

    const response = await superadminApi.getMollieConfig()
    expect(response.data.configured).toBe(true)
  })

  it('listPrices returns array', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/payments/prices`, () =>
        HttpResponse.json([{ id: '1', competitie_naam: 'Test' }])
      )
    )

    const response = await superadminApi.listPrices()
    expect(Array.isArray(response.data)).toBe(true)
  })
})

describe('API endpoints — paymentApi shapes', () => {
  it('getCheckoutStatus returns status', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/payments/checkout-status`, () =>
        HttpResponse.json({ enabled: true })
      )
    )

    const response = await paymentApi.getCheckoutStatus()
    expect(response.data.enabled).toBe(true)
  })

  it('getMandate returns mandate object', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/payments/mandates/*`, () =>
        HttpResponse.json({ id: 'mandate-1', iban: 'NL12RABO0123456789' })
      )
    )

    const response = await paymentApi.getMandate('club-1')
    expect(response.data.id).toBe('mandate-1')
  })

  it('createMandate returns created mandate', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.post(`${API_BASE}/payments/mandates`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>
        return HttpResponse.json({ id: 'new-mandate', ...body }, { status: 201 })
      })
    )

    const response = await paymentApi.createMandate({
      iban: 'NL12RABO0123456789',
      consumer_name: 'Test User',
    })
    expect(response.status).toBe(201)
    expect(response.data.iban).toBe('NL12RABO0123456789')
  })

  it('verifyMandate returns verification result', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.post(`${API_BASE}/payments/mandates/*/verify`, () =>
        HttpResponse.json({ verified: true })
      )
    )

    const response = await paymentApi.verifyMandate('mandate-1')
    expect(response.data.verified).toBe(true)
  })

  it('createPayment returns payment object', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.post(`${API_BASE}/payments/payments`, () =>
        HttpResponse.json({ id: 'payment-1', amount: 100 }, { status: 201 })
      )
    )

    const response = await paymentApi.createPayment('Test Competitie', 'https://example.com/webhook')
    expect(response.status).toBe(201)
    expect(response.data.amount).toBe(100)
  })
})

describe('API endpoints — onboardingApi shapes', () => {
  it('getStatus returns status object', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.get(`${API_BASE}/tenant/onboarding/status`, () =>
        HttpResponse.json({ step: 'club', completed: false })
      )
    )

    const response = await onboardingApi.getStatus()
    expect(response.data.step).toBe('club')
  })

  it('saveClub returns saved club', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.post(`${API_BASE}/tenant/onboarding/club`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>
        return HttpResponse.json({ id: 'club-1', ...body }, { status: 201 })
      })
    )

    const response = await onboardingApi.saveClub({ naam: 'Test Club' })
    expect(response.status).toBe(201)
    expect(response.data.naam).toBe('Test Club')
  })

  it('complete returns completion result', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.post(`${API_BASE}/tenant/onboarding/complete`, () =>
        HttpResponse.json({ success: true })
      )
    )

    const response = await onboardingApi.complete()
    expect(response.data.success).toBe(true)
  })

  it('skip returns skip result', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.post(`${API_BASE}/tenant/onboarding/skip`, () =>
        HttpResponse.json({ skipped: true })
      )
    )

    const response = await onboardingApi.skip()
    expect(response.data.skipped).toBe(true)
  })

  it('reset returns reset result', async () => {
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.post(`${API_BASE}/tenant/onboarding/reset`, () =>
        HttpResponse.json({ reset: true })
      )
    )

    const response = await onboardingApi.reset()
    expect(response.data.reset).toBe(true)
  })
})
