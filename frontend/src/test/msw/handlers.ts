/*
 * File: frontend/src/test/msw/handlers.ts
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

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
  http.get(`${API_BASE}/display/:slug/actueel`, async () => {
    await delay(50)
    return HttpResponse.json({
      club_naam: 'Test Club',
      actief: true,
    })
  }),

  http.post(`${API_BASE}/tenant/login`, async ({ request }) => {
    await delay(100)
    
    let username = null
    try {
      const formData = await request.formData()
      username = formData.get('username')
    } catch {
      const url = new URL(request.url)
      username = url.searchParams.get('username')
    }
    
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

  http.post(`${API_BASE}/tenant/superadmin-login`, async () => {
    await delay(100)
    return HttpResponse.json({
      user: {
        id: 'test-user-id',
        email: 'admin@testclub.nl',
        full_name: 'Test Admin',
        role: 'admin',
        is_superadmin: true,
      },
      club: {
        id: 'test-club-id',
        naam: 'Test Club',
        slug: 'testclub',
        status: 'active',
        primary_color: '#1B5E20',
        secondary_color: '#FFFFFF',
        accent_color: '#FFC107',
        logo_url: null,
      },
    })
  }),

  http.post(`${API_BASE}/tenant/refresh`, async () => {
    await delay(50)
    return HttpResponse.json({
      access_token: 'new_access_token',
      refresh_token: 'new_refresh_token',
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

  http.post(`${API_BASE}/tenant/forgot-password`, async () => {
    await delay(100)
    return HttpResponse.json({ message: 'Password reset email sent' })
  }),

  http.post(`${API_BASE}/tenant/reset-password`, async () => {
    await delay(100)
    return HttpResponse.json({ message: 'Password reset successfully' })
  }),

  http.get(`${API_BASE}/tenant/dashboard`, async () => {
    await delay(50)
    return HttpResponse.json({
      upcoming_wedstrijden: 5,
      active_competities: 2,
      today_wedstrijden: 3,
    })
  }),

  http.get(`${API_BASE}/tenant/competities`, async () => {
    await delay(50)
    return HttpResponse.json({
      items: [
        {
          id: 'comp-1',
          naam: 'Wintercompetitie 2024',
          speeldag: 'vrijdag',
          start_datum: '2024-11-01',
          eind_datum: '2025-03-31',
          actief: true,
        },
      ],
      total: 1,
      pages: 1,
    })
  }),

  http.post(`${API_BASE}/tenant/competities`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 'new-comp-id',
      ...body,
    })
  }),

  http.get(`${API_BASE}/tenant/competities/:id`, async () => {
    await delay(50)
    return HttpResponse.json({
      competitie: {
        id: 'comp-1',
        naam: 'Wintercompetitie 2024',
        speeldag: 'vrijdag',
        start_datum: '2024-11-01',
        eind_datum: '2025-03-31',
        actief: true,
      },
    })
  }),

  http.patch(`${API_BASE}/tenant/competities/:id`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 'comp-1',
      ...body,
    })
  }),

  http.get(`${API_BASE}/tenant/competities/:id/rondes`, async () => {
    await delay(50)
    return HttpResponse.json({
      items: [
        { id: 'r1', datum: '2024-11-15', status: 'concept', week_nummer: 46 },
        { id: 'r2', datum: '2024-11-22', status: 'concept', week_nummer: 47 },
      ],
      total: 2,
      pages: 1,
    })
  }),

  http.post(`${API_BASE}/tenant/competities/:id/teams`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 'new-team-id',
      ...body,
    })
  }),

  http.get(`${API_BASE}/tenant/competities/:id/teams`, async ({ request }) => {
    await delay(50)
    const url = new URL(request.url)
    const hasPagination = url.searchParams.has('page') || url.searchParams.has('size')
    
    if (hasPagination) {
      return HttpResponse.json({
        items: [
          { id: 't1', naam: 'Team A', captain_naam: 'Jan', speelklasse: 'A', actief: true },
          { id: 't2', naam: 'Team B', captain_naam: 'Piet', speelklasse: 'B', actief: true },
        ],
        total: 2,
        pages: 1,
      })
    }
    
    return HttpResponse.json([
      { id: 't1', naam: 'Team A', captain_naam: 'Jan', speelklasse: 'A', actief: true },
      { id: 't2', naam: 'Team B', captain_naam: 'Piet', speelklasse: 'B', actief: true },
    ])
  }),

  http.patch(`${API_BASE}/tenant/teams/:id`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 't1',
      ...body,
    })
  }),

  http.delete(`${API_BASE}/tenant/teams/:id`, async () => {
    await delay(100)
    return HttpResponse.json({ message: 'Team verwijderd' })
  }),

  http.post(`${API_BASE}/tenant/competities/:id/teams/import`, async () => {
    await delay(200)
    return HttpResponse.json({ imported: 10 })
  }),

  http.get(`${API_BASE}/tenant/competities/templates`, async () => {
    await delay(50)
    return HttpResponse.json({
      items: [],
      total: 0,
      pages: 0,
    })
  }),

  http.get(`${API_BASE}/tenant/competities/:id/seizoensoverzicht`, async () => {
    await delay(50)
    return HttpResponse.json({
      rondes: [
        { id: 'r1', datum: '2024-11-15', status: 'concept' },
      ],
    })
  }),

  http.get(`${API_BASE}/tenant/competities/:id/seizoensoverzicht/pdf`, async () => {
    await delay(50)
    return new HttpResponse('pdf-content', {
      headers: { 'Content-Type': 'application/pdf' },
    })
  }),

  http.get(`${API_BASE}/tenant/competities/:id/seizoensoverzicht/csv`, async () => {
    await delay(50)
    return new HttpResponse('csv,data', {
      headers: { 'Content-Type': 'text/csv' },
    })
  }),

  http.post(`${API_BASE}/tenant/rondes/:id/genereer`, async () => {
    await delay(200)
    return HttpResponse.json({
      toewijzingen: [
        { id: '1', team_id: 't1', baan_id: '1', tijdslot_start: '19:00', tijdslot_eind: '20:00' },
        { id: '2', team_id: 't2', baan_id: '2', tijdslot_start: '19:00', tijdslot_eind: '20:00' },
      ],
    })
  }),

  http.get(`${API_BASE}/tenant/rondes/:id`, async () => {
    await delay(50)
    return HttpResponse.json({
      id: 'r1',
      datum: '2024-11-15',
      status: 'concept',
      toewijzingen: [
        { id: '1', team_id: 't1', baan_id: '1', tijdslot_start: '19:00', tijdslot_eind: '20:00' },
        { id: '2', team_id: 't2', baan_id: '2', tijdslot_start: '19:00', tijdslot_eind: '20:00' },
      ],
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

  http.post(`${API_BASE}/tenant/rondes/:id/depublish`, async () => {
    await delay(100)
    return HttpResponse.json({
      id: 'r1',
      status: 'concept',
      public_token: null,
    })
  }),

  http.get(`${API_BASE}/tenant/rondes/:id/snapshots`, async () => {
    await delay(50)
    return HttpResponse.json([
      { id: 'snap-1', aanleiding: 'Wijziging toewijzing', created_at: '2024-11-15T10:00:00Z', count: 8 },
      { id: 'snap-2', aanleiding: 'Genereren indeling', created_at: '2024-11-14T09:00:00Z', count: 8 },
    ])
  }),

  http.post(`${API_BASE}/tenant/rondes/:rondeId/snapshots/:snapshotId/herstel`, async () => {
    await delay(100)
    return HttpResponse.json({
      data: {
        toewijzingen: [
          { id: '1', team_id: 't1', baan_id: '1', tijdslot_start: '19:00', tijdslot_eind: '20:00' },
          { id: '2', team_id: 't2', baan_id: '2', tijdslot_start: '19:00', tijdslot_eind: '20:00' },
        ],
      },
    })
  }),

  http.get(`${API_BASE}/tenant/wedstrijden/:id`, async () => {
    await delay(50)
    return HttpResponse.json({
      wedstrijden: [
        { id: 'w1', thuisteam_id: 't1', uitteam_id: 't2', status: 'gepland' },
        { id: 'w2', thuisteam_id: 't3', uitteam_id: 't4', status: 'gepland' },
      ],
    })
  }),

  http.patch(`${API_BASE}/tenant/toewijzingen/:id`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: '1',
      ...body,
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
    return HttpResponse.json({
      clubs: [
        { id: 'c1', naam: 'Club A', slug: 'club-a', status: 'active' },
        { id: 'c2', naam: 'Club B', slug: 'club-b', status: 'trial' },
      ],
      total: 2,
    })
  }),

  http.get(`${API_BASE}/superadmin/clubs/:id`, async () => {
    await delay(50)
    return HttpResponse.json({
      id: 'c1',
      naam: 'Club A',
      slug: 'club-a',
      status: 'active',
      admin_email: 'admin@club-a.nl',
    })
  }),

  http.patch(`${API_BASE}/superadmin/clubs/:id`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 'c1',
      ...body,
    })
  }),

  http.patch(`${API_BASE}/superadmin/clubs/:id/sponsor`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 'c1',
      is_sponsored: body.is_sponsored,
    })
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
    return HttpResponse.json({
      items: [],
      total: 0,
      pages: 0,
    })
  }),

  http.get(`${API_BASE}/superadmin/users/:id`, async () => {
    await delay(50)
    return HttpResponse.json({
      id: 'user-1',
      email: 'user@example.com',
      full_name: 'Test User',
      role: 'admin',
    })
  }),

  http.patch(`${API_BASE}/superadmin/users/:id`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 'user-1',
      ...body,
    })
  }),

  // Baan CRUD handlers
  http.patch(`${API_BASE}/tenant/banen/:id`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: '1',
      nummer: 1,
      naam: 'Baan 1',
      ...body,
    })
  }),

  http.delete(`${API_BASE}/tenant/banen/:id`, async () => {
    await delay(100)
    return HttpResponse.json({ message: 'Baan verwijderd' })
  }),

  // User CRUD handlers
  http.get(`${API_BASE}/tenant/users/:id`, async () => {
    await delay(50)
    return HttpResponse.json({
      id: '1',
      email: 'admin@testclub.nl',
      full_name: 'Admin User',
      role: 'admin',
      is_active: true,
    })
  }),

  http.patch(`${API_BASE}/tenant/users/:id`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: '1',
      email: 'admin@testclub.nl',
      ...body,
    })
  }),

  http.delete(`${API_BASE}/tenant/users/:id`, async () => {
    await delay(100)
    return HttpResponse.json({ message: 'User gedeactiveerd' })
  }),

  // Wedstrijden handlers
  http.get(`${API_BASE}/tenant/wedstrijden`, async () => {
    await delay(50)
    return HttpResponse.json({
      items: [
        { id: 'w1', thuisteam_id: 't1', uitteam_id: 't2', status: 'gepland' },
      ],
      total: 1,
      pages: 1,
    })
  }),

  http.post(`${API_BASE}/tenant/wedstrijden`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 'new-wedstrijd-id',
      ...body,
    })
  }),

  http.patch(`${API_BASE}/tenant/wedstrijden/:id`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 'w1',
      ...body,
    })
  }),

  http.delete(`${API_BASE}/tenant/wedstrijden/:id`, async () => {
    await delay(100)
    return HttpResponse.json({ message: 'Wedstrijd verwijderd' })
  }),

  http.post(`${API_BASE}/tenant/wedstrijden/competitie/:id/import`, async () => {
    await delay(200)
    return HttpResponse.json({ imported: 5 })
  }),

  http.get(`${API_BASE}/tenant/wedstrijden/competitie/:id/thuis-per-ronde`, async () => {
    await delay(50)
    return HttpResponse.json({
      thuis_per_ronde: {},
    })
  }),

  http.get(`${API_BASE}/tenant/wedstrijden/competitie/:id/agenda-export`, async () => {
    await delay(50)
    return new HttpResponse('csv,data', {
      headers: { 'Content-Type': 'text/csv' },
    })
  }),

  http.get(`${API_BASE}/tenant/wedstrijden/competitie/:id/validatie`, async () => {
    await delay(50)
    return HttpResponse.json({
      valid: true,
      errors: [],
    })
  }),

  // Bulk operations
  http.post(`${API_BASE}/tenant/rondes/bulk-generate`, async () => {
    await delay(200)
    return HttpResponse.json({ generated: 2 })
  }),

  http.post(`${API_BASE}/tenant/rondes/bulk-publish`, async () => {
    await delay(200)
    return HttpResponse.json({ published: 2 })
  }),

  http.post(`${API_BASE}/tenant/teams/bulk-activate`, async () => {
    await delay(100)
    return HttpResponse.json({ activated: 2 })
  }),

  // Ronde additional handlers
  http.get(`${API_BASE}/tenant/rondes/:id/pdf`, async () => {
    await delay(50)
    return new HttpResponse('pdf-content', {
      headers: { 'Content-Type': 'application/pdf' },
    })
  }),

  http.post(`${API_BASE}/tenant/rondes/:id/afgelast`, async () => {
    await delay(100)
    return HttpResponse.json({ message: 'Ronde afgelast' })
  }),

  // Dashboard weather
  http.get(`${API_BASE}/tenant/dashboard/weather`, async () => {
    await delay(50)
    return HttpResponse.json({
      temperatuur: 15,
      neerslag: false,
      wind_snelheid: 10,
    })
  }),

  // Dagoverzicht handlers
  http.get(`${API_BASE}/dagoverzicht`, async () => {
    await delay(50)
    return HttpResponse.json({
      datum: '2024-11-15',
      wedstrijden: [],
      conflicten: [],
    })
  }),

  http.get(`${API_BASE}/dagoverzicht/conflicten`, async () => {
    await delay(50)
    return HttpResponse.json({
      conflicten: [],
    })
  }),

  http.post(`${API_BASE}/dagoverzicht/plan`, async () => {
    await delay(100)
    return HttpResponse.json({ gepland: 5 })
  }),

  http.get(`${API_BASE}/dagoverzicht/validate/max-thuisteams`, async () => {
    await delay(50)
    return HttpResponse.json({
      valid: true,
      conflicts: [],
    })
  }),

  // Onboarding handlers
  http.get(`${API_BASE}/tenant/onboarding/status`, async () => {
    await delay(50)
    return HttpResponse.json({
      step: 'club',
      completed: false,
    })
  }),

  http.post(`${API_BASE}/tenant/onboarding/club`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 'new-club-id',
      ...body,
    })
  }),

  http.post(`${API_BASE}/tenant/onboarding/courts`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      created: (body.banen as Array<unknown>)?.length || 0,
    })
  }),

  http.post(`${API_BASE}/tenant/onboarding/competition`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 'new-comp-id',
      ...body,
    })
  }),

  http.post(`${API_BASE}/tenant/onboarding/teams`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      created: (body.teams as Array<unknown>)?.length || 0,
    })
  }),

  http.post(`${API_BASE}/tenant/onboarding/complete`, async () => {
    await delay(100)
    return HttpResponse.json({ success: true })
  }),

  http.post(`${API_BASE}/tenant/onboarding/skip`, async () => {
    await delay(100)
    return HttpResponse.json({ skipped: true })
  }),

  http.post(`${API_BASE}/tenant/onboarding/reset`, async () => {
    await delay(100)
    return HttpResponse.json({ reset: true })
  }),

  // Branding logo upload
  http.post(`${API_BASE}/tenant/branding/logo`, async () => {
    await delay(100)
    return HttpResponse.json({
      logo_url: '/uploads/test-logo.png',
    })
  }),

  // Payment handlers (superadmin)
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

  http.post(`${API_BASE}/payments/prices`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 'new-price-id',
      ...body,
    })
  }),

  http.get(`${API_BASE}/payments/mandates`, async () => {
    await delay(50)
    return HttpResponse.json({
      items: [],
      total: 0,
    })
  }),

  http.post(`${API_BASE}/superadmin/reset-local-database`, async () => {
    await delay(100)
    return HttpResponse.json({ success: true })
  }),

  // Payment API handlers
  http.get(`${API_BASE}/payments/checkout-status`, async () => {
    await delay(50)
    return HttpResponse.json({ enabled: true })
  }),

  http.get(`${API_BASE}/payments/mandates/:id`, async () => {
    await delay(50)
    return HttpResponse.json({
      id: 'mandate-1',
      iban: 'NL12RABO0123456789',
      consumer_name: 'Test User',
    })
  }),

  http.post(`${API_BASE}/payments/mandates`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 'new-mandate-id',
      ...body,
    })
  }),

  http.post(`${API_BASE}/payments/mandates/:id/verify`, async () => {
    await delay(100)
    return HttpResponse.json({ verified: true })
  }),

  http.post(`${API_BASE}/payments/payments`, async () => {
    await delay(100)
    return HttpResponse.json({
      id: 'payment-1',
      amount: 100,
    })
  }),

  // Auth register admin
  http.post(`${API_BASE}/auth/register-admin`, async ({ request }) => {
    await delay(100)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: 'new-admin-id',
      email: body.email,
      full_name: body.full_name,
    }, { status: 201 })
  }),
]