/*
 * File: frontend/src/lib/schemas.test.ts
 * Last updated: 2026-05-02
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-02: Initial test coverage for Zod validation schemas
 */

import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  forgotPasswordSchema,
  passwordSchema,
  clubSchema,
  competitionSchema,
  newClubSchema,
  inviteUserSchema,
  RESERVED_SLUGS,
} from './schemas'

describe('loginSchema', () => {
  it('validates correct email and password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'secret123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find(i => i.path[0] === 'email')
      expect(emailError).toBeDefined()
    }
  })

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'secret123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find(i => i.path[0] === 'email')
      expect(emailError).toBeDefined()
    }
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const passwordError = result.error.issues.find(i => i.path[0] === 'password')
      expect(passwordError).toBeDefined()
    }
  })

  it('rejects missing fields', () => {
    const result = loginSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('forgotPasswordSchema', () => {
  it('validates a correct email', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'user@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'invalid-email',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty email', () => {
    const result = forgotPasswordSchema.safeParse({
      email: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('passwordSchema', () => {
  it('validates matching passwords with sufficient strength', () => {
    const result = passwordSchema.safeParse({
      password: 'secure123',
      confirmPassword: 'secure123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-matching passwords', () => {
    const result = passwordSchema.safeParse({
      password: 'secure123',
      confirmPassword: 'different456',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const matchError = result.error.issues.find(i => i.path[0] === 'confirmPassword')
      expect(matchError).toBeDefined()
      expect(matchError?.message).toBe('Wachtwoorden komen niet overeen')
    }
  })

  it('rejects password shorter than 8 characters', () => {
    const result = passwordSchema.safeParse({
      password: 'short1',
      confirmPassword: 'short1',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const passwordError = result.error.issues.find(i => i.path[0] === 'password')
      expect(passwordError).toBeDefined()
      expect(passwordError?.message).toBe('Wachtwoord moet minimaal 8 tekens zijn')
    }
  })

  it('rejects password without a digit', () => {
    const result = passwordSchema.safeParse({
      password: 'nodigitshere',
      confirmPassword: 'nodigitshere',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const passwordError = result.error.issues.find(i => i.path[0] === 'password')
      expect(passwordError).toBeDefined()
      expect(passwordError?.message).toBe('Wachtwoord moet minimaal 1 cijfer bevatten')
    }
  })

  it('rejects empty confirmPassword', () => {
    const result = passwordSchema.safeParse({
      password: 'secure123',
      confirmPassword: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const confirmError = result.error.issues.find(i => i.path[0] === 'confirmPassword')
      expect(confirmError).toBeDefined()
    }
  })
})

describe('clubSchema', () => {
  it('validates all club fields', () => {
    const result = clubSchema.safeParse({
      naam: 'Tennisclub ABC',
      adres: 'Hoofdstraat 1',
      postcode: '1234AB',
      stad: 'Amsterdam',
      telefoon: '0612345678',
      email: 'info@tennisclub.nl',
    })
    expect(result.success).toBe(true)
  })

  it('validates with only required field (naam)', () => {
    const result = clubSchema.safeParse({
      naam: 'Tennisclub XYZ',
    })
    expect(result.success).toBe(true)
  })

  it('rejects naam shorter than 2 characters', () => {
    const result = clubSchema.safeParse({
      naam: 'A',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const naamError = result.error.issues.find(i => i.path[0] === 'naam')
      expect(naamError).toBeDefined()
    }
  })

  it('rejects invalid postcode format', () => {
    const result = clubSchema.safeParse({
      naam: 'Tennisclub ABC',
      postcode: '1234ABC',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const postcodeError = result.error.issues.find(i => i.path[0] === 'postcode')
      expect(postcodeError).toBeDefined()
    }
  })

  it('accepts valid postcode format', () => {
    const result = clubSchema.safeParse({
      naam: 'Tennisclub ABC',
      postcode: '1234AB',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty postcode', () => {
    const result = clubSchema.safeParse({
      naam: 'Tennisclub ABC',
      postcode: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = clubSchema.safeParse({
      naam: 'Tennisclub ABC',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find(i => i.path[0] === 'email')
      expect(emailError).toBeDefined()
    }
  })

  it('accepts empty email', () => {
    const result = clubSchema.safeParse({
      naam: 'Tennisclub ABC',
      email: '',
    })
    expect(result.success).toBe(true)
  })
})

describe('competitionSchema', () => {
  const today = new Date()
  const futureDate = new Date(today)
  futureDate.setDate(today.getDate() + 7)

  const formatDate = (date: Date): string => date.toISOString().split('T')[0]

  it('validates a valid competition with date range >= 4 weeks', () => {
    const startDate = new Date(today)
    startDate.setDate(today.getDate() + 7)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 30)

    const result = competitionSchema.safeParse({
      naam: 'Zomercompetitie 2026',
      speeldag: 'zaterdag',
      start_datum: formatDate(startDate),
      eind_datum: formatDate(endDate),
    })
    expect(result.success).toBe(true)
  })

  it('rejects end date before start date', () => {
    const startDate = new Date(today)
    startDate.setDate(today.getDate() + 7)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() - 5)

    const result = competitionSchema.safeParse({
      naam: 'Zomercompetitie 2026',
      speeldag: 'zaterdag',
      start_datum: formatDate(startDate),
      eind_datum: formatDate(endDate),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const dateError = result.error.issues.find(i => i.path[0] === 'eind_datum')
      expect(dateError).toBeDefined()
      expect(dateError?.message).toBe('De einddatum moet na de startdatum liggen')
    }
  })

  it('rejects competition shorter than 4 weeks', () => {
    const startDate = new Date(today)
    startDate.setDate(today.getDate() + 7)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 14)

    const result = competitionSchema.safeParse({
      naam: 'Zomercompetitie 2026',
      speeldag: 'zaterdag',
      start_datum: formatDate(startDate),
      eind_datum: formatDate(endDate),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const dateError = result.error.issues.find(i => i.path[0] === 'eind_datum')
      expect(dateError).toBeDefined()
      expect(dateError?.message).toBe('De competitie moet minimaal 4 weken duren')
    }
  })

  it('accepts competition exactly 4 weeks', () => {
    const startDate = new Date(today)
    startDate.setDate(today.getDate() + 7)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 28)

    const result = competitionSchema.safeParse({
      naam: 'Zomercompetitie 2026',
      speeldag: 'zaterdag',
      start_datum: formatDate(startDate),
      eind_datum: formatDate(endDate),
    })
    expect(result.success).toBe(true)
  })

  it('rejects start date in the past', () => {
    const pastDate = new Date(today)
    pastDate.setDate(today.getDate() - 7)
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + 30)

    const result = competitionSchema.safeParse({
      naam: 'Zomercompetitie 2026',
      speeldag: 'zaterdag',
      start_datum: formatDate(pastDate),
      eind_datum: formatDate(endDate),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const startDateError = result.error.issues.find(i => i.path[0] === 'start_datum')
      expect(startDateError).toBeDefined()
    }
  })

  it('rejects empty naam', () => {
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + 35)

    const result = competitionSchema.safeParse({
      naam: '',
      speeldag: 'zaterdag',
      start_datum: formatDate(futureDate),
      eind_datum: formatDate(endDate),
    })
    expect(result.success).toBe(false)
  })
})

describe('newClubSchema', () => {
  it('validates a valid new club', () => {
    const result = newClubSchema.safeParse({
      naam: 'Nieuwe Tennisclub',
      slug: 'nieuwe-club',
      contactEmail: 'contact@nieuweclub.nl',
    })
    expect(result.success).toBe(true)
  })

  it('validates slug with lowercase letters, numbers, and hyphens', () => {
    const result = newClubSchema.safeParse({
      naam: 'Nieuwe Tennisclub',
      slug: 'club-2026-test',
    })
    expect(result.success).toBe(true)
  })

  it('rejects slug with uppercase letters', () => {
    const result = newClubSchema.safeParse({
      naam: 'Nieuwe Tennisclub',
      slug: 'Upper-Case',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const slugError = result.error.issues.find(i => i.path[0] === 'slug')
      expect(slugError).toBeDefined()
    }
  })

  it('rejects slug with special characters', () => {
    const result = newClubSchema.safeParse({
      naam: 'Nieuwe Tennisclub',
      slug: 'club@2026',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const slugError = result.error.issues.find(i => i.path[0] === 'slug')
      expect(slugError).toBeDefined()
    }
  })

  it('rejects slug shorter than 3 characters', () => {
    const result = newClubSchema.safeParse({
      naam: 'Nieuwe Tennisclub',
      slug: 'ab',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const slugError = result.error.issues.find(i => i.path[0] === 'slug')
      expect(slugError).toBeDefined()
    }
  })

  it('rejects slug longer than 30 characters', () => {
    const result = newClubSchema.safeParse({
      naam: 'Nieuwe Tennisclub',
      slug: 'this-is-a-very-long-slug-that-exceeds-limit',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const slugError = result.error.issues.find(i => i.path[0] === 'slug')
      expect(slugError).toBeDefined()
    }
  })

  it('rejects reserved slugs', () => {
    for (const reserved of RESERVED_SLUGS) {
      const result = newClubSchema.safeParse({
        naam: 'Nieuwe Tennisclub',
        slug: reserved,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const slugError = result.error.issues.find(i => i.path[0] === 'slug')
        expect(slugError).toBeDefined()
        expect(slugError?.message).toBe('Deze slug is gereserveerd')
      }
    }
  })

  it('accepts valid contactEmail', () => {
    const result = newClubSchema.safeParse({
      naam: 'Nieuwe Tennisclub',
      slug: 'nieuwe-club',
      contactEmail: 'valid@email.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid contactEmail', () => {
    const result = newClubSchema.safeParse({
      naam: 'Nieuwe Tennisclub',
      slug: 'nieuwe-club',
      contactEmail: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty contactEmail', () => {
    const result = newClubSchema.safeParse({
      naam: 'Nieuwe Tennisclub',
      slug: 'nieuwe-club',
      contactEmail: '',
    })
    expect(result.success).toBe(true)
  })
})

describe('inviteUserSchema', () => {
  it('validates a correct email', () => {
    const result = inviteUserSchema.safeParse({
      email: 'user@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = inviteUserSchema.safeParse({
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find(i => i.path[0] === 'email')
      expect(emailError).toBeDefined()
    }
  })

  it('rejects empty email', () => {
    const result = inviteUserSchema.safeParse({
      email: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find(i => i.path[0] === 'email')
      expect(emailError).toBeDefined()
    }
  })
})

describe('RESERVED_SLUGS', () => {
  it('contains expected reserved slugs', () => {
    expect(RESERVED_SLUGS).toContain('admin')
    expect(RESERVED_SLUGS).toContain('api')
    expect(RESERVED_SLUGS).toContain('display')
    expect(RESERVED_SLUGS).toContain('www')
    expect(RESERVED_SLUGS).toContain('mail')
    expect(RESERVED_SLUGS).toContain('app')
    expect(RESERVED_SLUGS).toContain('static')
  })

  it('has correct number of reserved slugs', () => {
    expect(RESERVED_SLUGS.length).toBe(7)
  })
})
