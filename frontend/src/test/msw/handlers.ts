import { http, HttpResponse, delay } from 'msw'

// Axios uses http://localhost:8000/api/v1 as base URL in tests
const API_BASE = 'http://localhost:8000/api/v1'

export const handlers = [
  // Auth handlers
  http.post(`${API_BASE}/auth/login`, async () => {
    await delay(100)
    return HttpResponse.json({
      access_token: 'test_access_token',
      refresh_token: 'test_refresh_token',
      token_type: 'bearer',
    })
  }),

  http.post(`${API_BASE}/auth/logout`, async () => {
    await delay(50)
    return HttpResponse.json({ message: 'Logged out' })
  }),

  http.get(`${API_BASE}/auth/me`, async () => {
    await delay(50)
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'admin@testclub.nl',
      full_name: 'Test Admin',
      role: 'admin',
      is_superadmin: false,
    })
  }),

  http.get(`${API_BASE}/auth/admin-exists`, async () => {
    await delay(50)
    return HttpResponse.json({ exists: true })
  }),

  // Tenant handlers
  http.post(`${API_BASE}/tenant/login`, async ({ request }) => {
    await delay(100)
    
    let username = null
    try {
      // Try to extract username from formData
      const formData = await request.formData()
      username = formData.get('username')
    } catch {
      // Fallback to URL search params if body reading fails
      const url = new URL(request.url)
      username = url.searchParams.get('username')
    }
    
    // Return 401 for any email that isn't our test admin
    if (username !== 'admin@testclub.nl') {
      return HttpResponse.json(
        { detail: 'ongeldige inloggegevens' },
        { status: 401 }
      )
    }
    return HttpResponse.json({
      access_token: 'test_access_token',
      refresh_token: 'test_refresh_token',
      token_type: 'bearer',
    })
  }),

  http.get(`${API_BASE}/tenant/me`, async () => {
    await delay(50)
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'admin@testclub.nl',
      full_name: 'Test Admin',
      role: 'admin',
      is_superadmin: false,
    })
  }),

  http.get(`${API_BASE}/tenant/club`, async () => {
    await delay(50)
    return HttpResponse.json({
      id: 'test-club-id',
      naam: 'Test Club',
      slug: 'testclub',
      status: 'trial',
      primary_color: '#1B5E20',
      secondary_color: '#FFFFFF',
      accent_color: '#FFC107',
      logo_url: null,
    })
  }),

  http.get(`${API_BASE}/tenant/settings`, async () => {
    await delay(50)
    return HttpResponse.json({
      naam: 'Test Club',
      adres: 'Testweg 1',
      stad: 'Amsterdam',
      telefoon: '06-12345678',
    })
  }),

  http.patch(`${API_BASE}/tenant/settings`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      ...body,
      id: 'test-club-id',
    })
  }),

  http.get(`${API_BASE}/tenant/branding`, async () => {
    await delay(50)
    return HttpResponse.json({
      primary_color: '#1B5E20',
      secondary_color: '#FFFFFF',
      accent_color: '#FFC107',
      font_choice: 'default',
    })
  }),

  http.patch(`${API_BASE}/tenant/branding`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(body)
  }),

  http.get(`${API_BASE}/tenant/banen`, async () => {
    await delay(50)
    return HttpResponse.json([
      { id: '1', nummer: 1, naam: 'Baan 1', verlichting_type: 'led', overdekt: true },
      { id: '2', nummer: 2, naam: 'Baan 2', verlichting_type: 'halogeen', overdekt: false },
    ])
  }),

  http.post(`${API_BASE}/tenant/banen`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 'new-baan-id',
      ...body,
    })
  }),

  http.get(`${API_BASE}/tenant/users`, async () => {
    await delay(50)
    return HttpResponse.json([
      { id: '1', email: 'admin@testclub.nl', full_name: 'Admin User', role: 'admin', is_active: true },
      { id: '2', email: 'user@testclub.nl', full_name: 'Regular User', role: 'user', is_active: true },
    ])
  }),

  http.post(`${API_BASE}/tenant/invite`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      token: 'test-invite-token',
      email: body.email,
    })
  }),

  http.post(`${API_BASE}/tenant/accept-invite`, async () => {
    await delay(100)
    return HttpResponse.json({
      access_token: 'test_access_token',
    })
  }),

  http.get(`${API_BASE}/tenant/competities`, async () => {
    await delay(50)
    return HttpResponse.json([
      {
        id: 'comp-1',
        naam: 'Wintercompetitie 2024',
        speeldag: 'vrijdag',
        start_datum: '2024-11-01',
        eind_datum: '2025-03-31',
        actief: true,
      },
    ])
  }),

  http.post(`${API_BASE}/tenant/competities`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 'new-comp-id',
      ...body,
    })
  }),

  http.get(`${API_BASE}/tenant/competities/:id/rondes`, async () => {
    await delay(50)
    return HttpResponse.json([
      { id: 'r1', datum: '2024-11-15', status: 'concept', week_nummer: 46 },
      { id: 'r2', datum: '2024-11-22', status: 'concept', week_nummer: 47 },
    ])
  }),

  http.post(`${API_BASE}/tenant/competities/:id/teams`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 'new-team-id',
      ...body,
    })
  }),

  http.get(`${API_BASE}/tenant/competities/:id/teams`, async () => {
    await delay(50)
    return HttpResponse.json([
      { id: 't1', naam: 'Team A', captain_naam: 'Jan', speelklasse: 'A' },
      { id: 't2', naam: 'Team B', captain_naam: 'Piet', speelklasse: 'B' },
    ])
  }),

  http.post(`${API_BASE}/tenant/rondes/:id/genereer`, async () => {
    await delay(200)
    return HttpResponse.json({
      message: 'Indeling gegenereerd',
      toewijzingen_count: 8,
    })
  }),

  http.get(`${API_BASE}/tenant/rondes/:id`, async () => {
    await delay(50)
    return HttpResponse.json({
      id: 'r1',
      datum: '2024-11-15',
      status: 'concept',
      baantoewijzingen: [],
    })
  }),

  http.post(`${API_BASE}/tenant/rondes/:id/publish`, async () => {
    await delay(100)
    return HttpResponse.json({
      id: 'r1',
      status: 'gepubliceerd',
      public_token: 'test-public-token',
    })
  }),

  // Superadmin handlers
  http.get(`${API_BASE}/superadmin/dashboard`, async () => {
    await delay(50)
    return HttpResponse.json({
      total_clubs: 10,
      total_users: 50,
      active_competitions: 5,
    })
  }),

  http.get(`${API_BASE}/superadmin/clubs`, async () => {
    await delay(50)
    return HttpResponse.json([
      { id: 'c1', naam: 'Club A', slug: 'club-a', status: 'active' },
      { id: 'c2', naam: 'Club B', slug: 'club-b', status: 'trial' },
    ])
  }),

  http.post(`${API_BASE}/superadmin/clubs`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 'new-club-id',
      ...body,
    })
  }),

  http.get(`${API_BASE}/superadmin/users`, async () => {
    await delay(50)
    return HttpResponse.json([])
  }),

  // Payment handlers
  http.get(`${API_BASE}/payments/config`, async () => {
    await delay(50)
    return HttpResponse.json({ configured: true })
  }),

  http.post(`${API_BASE}/payments/config`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(body)
  }),

  http.get(`${API_BASE}/payments/prices`, async () => {
    await delay(50)
    return HttpResponse.json([
      { id: 'p1', competitie_naam: 'Winter', price_small_club: 15000, price_large_club: 25000 },
    ])
  }),
]