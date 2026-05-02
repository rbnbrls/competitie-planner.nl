/*
 * File: frontend/src/test/msw/handlers.test.ts
 * Last updated: 2026-05-02
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-02: Initial test file for verifying MSW response shapes match real API usage
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { server } from '../msw/server'
import { tenantApi, superadminApi, paymentApi, onboardingApi, authApi } from '../../lib/api'

const API_BASE = 'http://localhost:8000/api/v1'

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('MSW handler response shapes', () => {
  describe('Paginated endpoints return { items, total, pages }', () => {
    it('listCompetities returns paginated response shape', async () => {
      const response = await tenantApi.listCompetities()
      expect(response.data).toHaveProperty('items')
      expect(response.data).toHaveProperty('total')
      expect(response.data).toHaveProperty('pages')
      expect(Array.isArray(response.data.items)).toBe(true)
      expect(typeof response.data.total).toBe('number')
      expect(typeof response.data.pages).toBe('number')
    })

    it('listTeams returns paginated response shape', async () => {
      const response = await tenantApi.listTeams('comp-1')
      expect(response.data).toHaveProperty('items')
      expect(response.data).toHaveProperty('total')
      expect(response.data).toHaveProperty('pages')
      expect(Array.isArray(response.data.items)).toBe(true)
    })

    it('listSpeelrondes returns paginated response shape', async () => {
      const response = await tenantApi.listSpeelrondes('comp-1')
      expect(response.data).toHaveProperty('items')
      expect(response.data).toHaveProperty('total')
      expect(response.data).toHaveProperty('pages')
      expect(Array.isArray(response.data.items)).toBe(true)
    })
  })

  describe('Object endpoints return expected properties', () => {
    it('getCompetition returns { competitie } wrapper', async () => {
      const response = await tenantApi.getCompetition('comp-1')
      expect(response.data).toHaveProperty('competitie')
      expect(response.data.competitie).toHaveProperty('id')
      expect(response.data.competitie).toHaveProperty('naam')
    })

    it('getRondeDetail returns ronde object with toewijzingen', async () => {
      const response = await tenantApi.getRondeDetail('ronde-1')
      expect(response.data).toHaveProperty('toewijzingen')
      expect(Array.isArray(response.data.toewijzingen)).toBe(true)
    })

    it('getClub returns club object directly', async () => {
      const response = await tenantApi.getClub()
      expect(response.data).toHaveProperty('id')
      expect(response.data).toHaveProperty('naam')
      expect(response.data).toHaveProperty('slug')
    })

    it('getSettings returns settings object', async () => {
      const response = await tenantApi.getSettings()
      expect(response.data).toHaveProperty('naam')
    })

    it('getBranding returns branding object', async () => {
      const response = await tenantApi.getBranding()
      expect(response.data).toHaveProperty('primary_color')
    })
  })

  describe('Auth endpoints return expected shapes', () => {
    it('tenantApi.login returns tokens', async () => {
      const response = await tenantApi.login('admin@testclub.nl', 'password', 'testclub')
      expect(response.data).toHaveProperty('access_token')
      expect(response.data).toHaveProperty('refresh_token')
    })

    it('tenantApi.superadminLogin returns { user, club }', async () => {
      const response = await tenantApi.superadminLogin('testclub')
      expect(response.data).toHaveProperty('user')
      expect(response.data).toHaveProperty('club')
      expect(response.data.user).toHaveProperty('id')
      expect(response.data.user).toHaveProperty('email')
      expect(response.data.club).toHaveProperty('id')
      expect(response.data.club).toHaveProperty('naam')
      expect(response.data.club).toHaveProperty('slug')
    })

    it('tenantApi.me returns user object', async () => {
      const response = await tenantApi.me()
      expect(response.data).toHaveProperty('id')
      expect(response.data).toHaveProperty('email')
      expect(response.data).toHaveProperty('role')
    })

    it('authApi.me returns user object', async () => {
      const response = await authApi.me()
      expect(response.data).toHaveProperty('id')
      expect(response.data).toHaveProperty('email')
      expect(response.data).toHaveProperty('is_superadmin')
    })
  })

  describe('List endpoints return arrays directly', () => {
    it('listBanen returns array', async () => {
      const response = await tenantApi.listBanen()
      expect(Array.isArray(response.data)).toBe(true)
      if (Array.isArray(response.data) && response.data.length > 0) {
        expect(response.data[0]).toHaveProperty('id')
        expect(response.data[0]).toHaveProperty('nummer')
      }
    })

    it('listUsers returns array', async () => {
      const response = await tenantApi.listUsers()
      expect(Array.isArray(response.data)).toBe(true)
      if (Array.isArray(response.data) && response.data.length > 0) {
        expect(response.data[0]).toHaveProperty('id')
        expect(response.data[0]).toHaveProperty('email')
      }
    })

    it('getSnapshots returns array', async () => {
      const response = await tenantApi.getSnapshots('ronde-1')
      expect(Array.isArray(response.data)).toBe(true)
    })
  })

  describe('Mutation endpoints return expected shapes', () => {
    it('generateIndeling returns { toewijzingen }', async () => {
      const response = await tenantApi.generateIndeling('ronde-1')
      expect(response.data).toHaveProperty('toewijzingen')
      expect(Array.isArray(response.data.toewijzingen)).toBe(true)
    })

    it('publishSpeelronde returns ronde object', async () => {
      const response = await tenantApi.publishRonde('ronde-1')
      expect(response.data).toHaveProperty('id')
      expect(response.data).toHaveProperty('status')
    })

    it('depublishRonde returns ronde object', async () => {
      const response = await tenantApi.depublishRonde('ronde-1')
      expect(response.data).toHaveProperty('id')
      expect(response.data).toHaveProperty('status')
    })

    it('herstellSnapshot returns { data: { toewijzingen } }', async () => {
      const response = await tenantApi.herstellSnapshot('ronde-1', 'snap-1')
      expect(response.data).toHaveProperty('data')
      expect(response.data.data).toHaveProperty('toewijzingen')
      expect(Array.isArray(response.data.data.toewijzingen)).toBe(true)
    })

    it('createBaan returns created object with id', async () => {
      const response = await tenantApi.createBaan({
        nummer: 3,
        naam: 'Baan 3',
      })
      expect(response.data).toHaveProperty('id')
      expect(response.data).toHaveProperty('nummer')
    })

    it('updateToewijzing returns updated object', async () => {
      const response = await tenantApi.updateToewijzing('1', {
        team_id: 't1',
        baan_id: '1',
      })
      expect(response.data).toHaveProperty('id')
    })
  })

  describe('Superadmin endpoints return expected shapes', () => {
    it('listClubs returns { clubs, total }', async () => {
      const response = await superadminApi.listClubs()
      expect(response.data).toHaveProperty('clubs')
      expect(response.data).toHaveProperty('total')
      expect(Array.isArray(response.data.clubs)).toBe(true)
    })

    it('getClub returns club object', async () => {
      const response = await superadminApi.getClub('c1')
      expect(response.data).toHaveProperty('id')
      expect(response.data).toHaveProperty('naam')
    })

    it('createClub returns created object', async () => {
      const response = await superadminApi.createClub({
        naam: 'New Club',
        slug: 'new-club',
      })
      expect(response.data).toHaveProperty('id')
      expect(response.data).toHaveProperty('naam')
    })

    it('getDashboard returns dashboard data', async () => {
      const response = await superadminApi.getDashboard()
      expect(response.data).toHaveProperty('total_clubs')
    })

    it('listUsers returns paginated response', async () => {
      const response = await superadminApi.listUsers()
      expect(response.data).toHaveProperty('items')
      expect(response.data).toHaveProperty('total')
    })
  })

  describe('Payment endpoints return expected shapes', () => {
    it('getMollieConfig returns config', async () => {
      const response = await superadminApi.getMollieConfig()
      expect(response.data).toHaveProperty('configured')
    })

    it('listPrices returns array', async () => {
      const response = await superadminApi.listPrices()
      expect(Array.isArray(response.data)).toBe(true)
    })

    it('getCheckoutStatus returns status', async () => {
      const response = await paymentApi.getCheckoutStatus()
      expect(response.data).toHaveProperty('enabled')
    })

    it('getMandate returns mandate object', async () => {
      const response = await paymentApi.getMandate('club-1')
      expect(response.data).toHaveProperty('id')
      expect(response.data).toHaveProperty('iban')
    })
  })

  describe('Onboarding endpoints return expected shapes', () => {
    it('getStatus returns status object', async () => {
      const response = await onboardingApi.getStatus()
      expect(response.data).toHaveProperty('step')
      expect(response.data).toHaveProperty('completed')
    })

    it('complete returns success', async () => {
      const response = await onboardingApi.complete()
      expect(response.data).toHaveProperty('success')
    })

    it('skip returns skipped', async () => {
      const response = await onboardingApi.skip()
      expect(response.data).toHaveProperty('skipped')
    })

    it('reset returns reset', async () => {
      const response = await onboardingApi.reset()
      expect(response.data).toHaveProperty('reset')
    })
  })

  describe('Dashboard and utility endpoints', () => {
    it('getDashboard returns dashboard data', async () => {
      const response = await tenantApi.getDashboard()
      expect(response.data).toHaveProperty('upcoming_wedstrijden')
      expect(response.data).toHaveProperty('active_competities')
    })

    it('getWedstrijden returns { wedstrijden }', async () => {
      const response = await tenantApi.getWedstrijden('ronde-1')
      expect(response.data).toHaveProperty('wedstrijden')
      expect(Array.isArray(response.data.wedstrijden)).toBe(true)
    })

    it('getSeizoensoverzicht returns { rondes }', async () => {
      const response = await tenantApi.getSeizoensoverzicht('comp-1')
      expect(response.data).toHaveProperty('rondes')
      expect(Array.isArray(response.data.rondes)).toBe(true)
    })
  })
})
