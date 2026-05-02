/*
 * File: frontend/src/hooks/useRondeDetail.test.ts
 * Last updated: 2026-05-02
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-02: Initial test file for useRondeDetail hook
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { server } from '../test/msw/server'
import { useRondeDetail } from './useRondeDetail'

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => server.resetHandlers())
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

describe('useRondeDetail hook', () => {
  it('returns loading state on initial render', () => {
    const { result } = renderHook(
      () => useRondeDetail('r1', 'comp-1'),
      { wrapper: createWrapper() }
    )
    expect(result.current.isLoadingRonde).toBe(true)
  })

  it('fetches round data correctly', async () => {
    const { result } = renderHook(
      () => useRondeDetail('r1', 'comp-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoadingRonde).toBe(false))

    expect(result.current.ronde).toBeDefined()
    expect(result.current.ronde?.id).toBe('r1')
    expect(result.current.ronde?.status).toBe('concept')
  })

  it('fetches teams data', async () => {
    const { result } = renderHook(
      () => useRondeDetail('r1', 'comp-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoadingTeams).toBe(false))

    expect(result.current.teams).toBeDefined()
    expect(Array.isArray(result.current.teams)).toBe(true)
  })

  it('fetches courts (banen) data', async () => {
    const { result } = renderHook(
      () => useRondeDetail('r1', 'comp-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoadingBanen).toBe(false))

    expect(result.current.banen).toBeDefined()
    expect(Array.isArray(result.current.banen)).toBe(true)
    expect(result.current.banen.length).toBeGreaterThan(0)
  })

  it('fetches matches (wedstrijden) data', async () => {
    const { result } = renderHook(
      () => useRondeDetail('r1', 'comp-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoadingWedstrijden).toBe(false))

    expect(result.current.wedstrijden).toBeDefined()
    expect(Array.isArray(result.current.wedstrijden)).toBe(true)
  })

  it('fetches snapshots data', async () => {
    const { result } = renderHook(
      () => useRondeDetail('r1', 'comp-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoadingSnapshots).toBe(false))

    expect(result.current.snapshots).toBeDefined()
    expect(Array.isArray(result.current.snapshots)).toBe(true)
    expect(result.current.snapshots.length).toBe(2)
  })

  it('updateToewijzing mutation updates cache', async () => {
    const { result } = renderHook(
      () => useRondeDetail('r1', 'comp-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoadingRonde).toBe(false))

    await act(async () => {
      await result.current.updateToewijzing({
        id: '1',
        data: { baan_id: '3' }
      })
    })

    await waitFor(() => {
      expect(result.current.ronde?.toewijzingen?.some(
        (t: { id: string; baan_id?: string }) => t.id === '1' && t.baan_id === '3'
      )).toBe(true)
    })
  })

  it('swapToewijzingen mutation swaps assignments', async () => {
    const { result } = renderHook(
      () => useRondeDetail('r1', 'comp-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoadingRonde).toBe(false))

    await act(async () => {
      await result.current.swapToewijzingen({
        activeId: '1',
        activeTeamId: 't1',
        overId: '2',
        overTeamId: 't2',
      })
    })

    await waitFor(() => {
      expect(result.current.ronde?.toewijzingen?.some(
        (t: { id: string; team_id: string }) => t.id === '1' && t.team_id === 't2'
      )).toBe(true)
      expect(result.current.ronde?.toewijzingen?.some(
        (t: { id: string; team_id: string }) => t.id === '2' && t.team_id === 't1'
      )).toBe(true)
    })
  })

  it('generateIndeling mutation triggers schedule generation', async () => {
    const { result } = renderHook(
      () => useRondeDetail('r1', 'comp-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoadingRonde).toBe(false))

    await act(async () => {
      await result.current.generateIndeling.mutateAsync()
    })

    await waitFor(() => {
      expect(result.current.generateIndeling.isSuccess).toBe(true)
    })
  })

  it('publishRonde mutation publishes round', async () => {
    const { result } = renderHook(
      () => useRondeDetail('r1', 'comp-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoadingRonde).toBe(false))

    await act(async () => {
      await result.current.publishRonde.mutateAsync()
    })

    await waitFor(() => {
      expect(result.current.publishRonde.isSuccess).toBe(true)
    })
  })

  it('depublishRonde mutation depublishes round', async () => {
    const { result } = renderHook(
      () => useRondeDetail('r1', 'comp-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoadingRonde).toBe(false))

    await act(async () => {
      await result.current.depublishRonde.mutateAsync()
    })

    await waitFor(() => {
      expect(result.current.depublishRonde.isSuccess).toBe(true)
    })
  })

  it('restoreSnapshot mutation restores planning', async () => {
    const { result } = renderHook(
      () => useRondeDetail('r1', 'comp-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoadingRonde).toBe(false))

    await act(async () => {
      await result.current.herstellSnapshot.mutateAsync('snap-1')
    })

    await waitFor(() => {
      expect(result.current.herstellSnapshot.isSuccess).toBe(true)
    })
  })

  it('optimistic updates rollback on error', async () => {
    const { http, HttpResponse } = await import('msw')
    const { showToast } = await import('../components/Toast')
    const errorSpy = vi.spyOn(showToast, 'error')

    server.use(
      http.patch('http://localhost:8000/api/v1/tenant/toewijzingen/:id', () =>
        HttpResponse.json({ detail: 'Server error' }, { status: 500 })
      )
    )

    const { result } = renderHook(
      () => useRondeDetail('r1', 'comp-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoadingRonde).toBe(false))

    try {
      await act(async () => {
        await result.current.updateToewijzing({
          id: '1',
          data: { baan_id: '99' }
        })
      })
    } catch {
      // Expected to throw on error
    }

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('Fout bij bijwerken toewijzing')
    })

    errorSpy.mockRestore()
  })

  it('disabled queries when rondeId is falsy', () => {
    const { result } = renderHook(
      () => useRondeDetail(undefined, 'comp-1'),
      { wrapper: createWrapper() }
    )

    // When rondeId is undefined, the query is disabled so isLoading is false
    // (it never started fetching)
    expect(result.current.isLoadingRonde).toBe(false)
    expect(result.current.ronde).toBeUndefined()
    expect(result.current.wedstrijden).toEqual([])
    expect(result.current.snapshots).toEqual([])
  })

  it('disabled queries when competitieId is falsy', () => {
    const { result } = renderHook(
      () => useRondeDetail('r1', undefined),
      { wrapper: createWrapper() }
    )

    expect(result.current.teams).toEqual([])
  })
})
