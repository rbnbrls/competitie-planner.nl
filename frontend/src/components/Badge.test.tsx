/*
 * File: frontend/src/components/Badge.test.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from './Badge'

describe('Badge Component', () => {
  it('renders with text content', () => {
    render(<Badge>Actief</Badge>)
    expect(screen.getByText('Actief')).toBeInTheDocument()
  })

  it('renders default variant', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default')).toHaveClass('bg-gray-100', 'text-gray-800')
  })

  it('renders primary variant', () => {
    render(<Badge variant="primary">Primary</Badge>)
    expect(screen.getByText('Primary')).toHaveClass('bg-blue-100', 'text-blue-800')
  })

  it('renders success variant', () => {
    render(<Badge variant="success">Gepubliceerd</Badge>)
    expect(screen.getByText('Gepubliceerd')).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('renders warning variant', () => {
    render(<Badge variant="warning">Concept</Badge>)
    expect(screen.getByText('Concept')).toHaveClass('bg-yellow-100', 'text-yellow-800')
  })

  it('renders danger variant', () => {
    render(<Badge variant="danger">Fout</Badge>)
    expect(screen.getByText('Fout')).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('renders secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>)
    expect(screen.getByText('Secondary')).toHaveClass('bg-indigo-100', 'text-indigo-800')
  })

  it('renders outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>)
    expect(screen.getByText('Outline')).toHaveClass('text-gray-700', 'bg-white', 'border-gray-300')
  })

  it('applies custom className', () => {
    render(<Badge className="custom-badge">Badge</Badge>)
    expect(screen.getByText('Badge')).toHaveClass('custom-badge')
  })

  it('renders as a span element', () => {
    render(<Badge>Tag</Badge>)
    expect(screen.getByText('Tag').tagName).toBe('SPAN')
  })
})
