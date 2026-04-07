import { describe, it, expect } from 'vitest'
import { cn } from './utils'

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