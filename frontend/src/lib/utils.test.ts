/*
 * File: frontend/src/lib/utils.test.ts
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { describe, it, expect } from 'vitest'
import { cn, getErrorMessage } from './utils'

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    const isActive = true
    expect(cn('base', isActive && 'active')).toBe('base active')
    const isInactive = false
    expect(cn('base', isInactive && 'active')).toBe('base')
  })

  it('handles array inputs', () => {
    expect(cn(['a', 'b'])).toBe('a b')
  })

  it('handles object inputs', () => {
    expect(cn({ active: true, disabled: false })).toBe('active')
  })

  it('merges tailwind classes with conflicts', () => {
    expect(cn('px-2 px-4')).toBe('px-4')
  })
})

describe('getErrorMessage', () => {
  it('returns fallback for null/undefined errors', () => {
    expect(getErrorMessage(null)).toBe('Er is iets misgegaan')
    expect(getErrorMessage(undefined)).toBe('Er is iets misgegaan')
    expect(getErrorMessage(null, 'Custom fallback')).toBe('Custom fallback')
  })

  it('returns fallback for non-Axios errors', () => {
    expect(getErrorMessage(new Error('JS error'))).toBe('Er is iets misgegaan')
    expect(getErrorMessage('string error')).toBe('Er is iets misgegaan')
    expect(getErrorMessage({})).toBe('Er is iets misgegaan')
  })

  it('extracts string detail from Axios error response', () => {
    const axiosError = {
      response: {
        data: {
          detail: 'Club not found',
        },
      },
    }
    expect(getErrorMessage(axiosError)).toBe('Club not found')
  })

  it('extracts first string from array of string details (422 validation)', () => {
    const axiosError = {
      response: {
        data: {
          detail: ['Naam is required', 'Start date must be in the future'],
        },
      },
    }
    expect(getErrorMessage(axiosError)).toBe('Naam is required')
  })

  it('extracts msg field from array of object details (Pydantic 422)', () => {
    const axiosError = {
      response: {
        data: {
          detail: [
            { loc: ['body', 'naam'], msg: 'Naam is required', type: 'missing' },
            { loc: ['body', 'speeldag'], msg: 'Invalid speeldag', type: 'value_error' },
          ],
        },
      },
    }
    expect(getErrorMessage(axiosError)).toBe('Naam is required')
  })

  it('returns fallback for empty array details', () => {
    const axiosError = {
      response: {
        data: {
          detail: [],
        },
      },
    }
    expect(getErrorMessage(axiosError)).toBe('Er is iets misgegaan')
  })

  it('returns fallback for detail object without msg field', () => {
    const axiosError = {
      response: {
        data: {
          detail: [{ loc: ['body'], type: 'missing' }],
        },
      },
    }
    expect(getErrorMessage(axiosError)).toBe('Er is iets misgegaan')
  })

  it('returns fallback when response is missing', () => {
    const networkError = {
      message: 'Network Error',
      code: 'ERR_NETWORK',
    }
    expect(getErrorMessage(networkError)).toBe('Er is iets misgegaan')
  })

  it('returns fallback when data is missing', () => {
    const axiosError = {
      response: {
        status: 500,
      },
    }
    expect(getErrorMessage(axiosError)).toBe('Er is iets misgegaan')
  })

  it('returns fallback when detail is null/undefined', () => {
    const axiosError = {
      response: {
        data: {},
      },
    }
    expect(getErrorMessage(axiosError)).toBe('Er is iets misgegaan')
  })

  it('handles 500 server error response', () => {
    const axiosError = {
      response: {
        status: 500,
        data: {
          detail: 'Internal server error',
        },
      },
    }
    expect(getErrorMessage(axiosError)).toBe('Internal server error')
  })

  it('handles 401 unauthorized response', () => {
    const axiosError = {
      response: {
        status: 401,
        data: {
          detail: 'Unauthorized',
        },
      },
    }
    expect(getErrorMessage(axiosError)).toBe('Unauthorized')
  })

  it('handles 403 forbidden response', () => {
    const axiosError = {
      response: {
        status: 403,
        data: {
          detail: 'Forbidden',
        },
      },
    }
    expect(getErrorMessage(axiosError)).toBe('Forbidden')
  })

  it('handles 404 not found response', () => {
    const axiosError = {
      response: {
        status: 404,
        data: {
          detail: 'Competition not found',
        },
      },
    }
    expect(getErrorMessage(axiosError)).toBe('Competition not found')
  })

  it('handles 409 conflict response', () => {
    const axiosError = {
      response: {
        status: 409,
        data: {
          detail: 'Team name already exists',
        },
      },
    }
    expect(getErrorMessage(axiosError)).toBe('Team name already exists')
  })

  it('handles 429 rate limit response', () => {
    const axiosError = {
      response: {
        status: 429,
        data: {
          detail: 'Too many requests',
        },
      },
    }
    expect(getErrorMessage(axiosError)).toBe('Too many requests')
  })

  it('uses custom fallback when provided', () => {
    const axiosError = {
      response: {
        status: 500,
        data: {},
      },
    }
    expect(getErrorMessage(axiosError, 'Verbinding mislukt')).toBe('Verbinding mislukt')
  })

  it('handles detail as object with msg at root level', () => {
    const axiosError = {
      response: {
        data: {
          detail: {
            msg: 'Validation failed',
          },
        },
      },
    }
    // Object detail at root (not array) falls through to default
    expect(getErrorMessage(axiosError)).toBe('Er is iets misgegaan')
  })
})