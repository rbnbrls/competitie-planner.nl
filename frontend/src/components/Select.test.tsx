/*
 * File: frontend/src/components/Select.test.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Select } from './Select'

describe('Select Component', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
    { value: 'c', label: 'Option C' },
  ]

  it('renders select element', () => {
    render(<Select />)
    expect(document.querySelector('select')).toBeInTheDocument()
  })

  it('renders with label', () => {
    render(<Select label="Speeldag" options={options} />)
    expect(screen.getByLabelText(/speeldag/i)).toBeInTheDocument()
  })

  it('renders options from options prop', () => {
    render(<Select options={options} />)
    expect(screen.getByRole('option', { name: 'Option A' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Option B' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Option C' })).toBeInTheDocument()
  })

  it('renders children when options prop is not provided', () => {
    render(
      <Select>
        <option value="x">Custom X</option>
        <option value="y">Custom Y</option>
      </Select>
    )
    expect(screen.getByRole('option', { name: 'Custom X' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Custom Y' })).toBeInTheDocument()
  })

  it('renders error message', () => {
    render(<Select options={options} error="Verplicht veld" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/verplicht veld/i)
  })

  it('renders helper text when no error', () => {
    render(<Select options={options} helperText="Kies een dag" />)
    expect(screen.getByText(/kies een dag/i)).toBeInTheDocument()
  })

  it('does not render helper text when error is shown', () => {
    render(<Select options={options} error="Fout" helperText="Help tekst" />)
    expect(screen.queryByText(/help tekst/i)).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows required indicator', () => {
    render(<Select label="Speeldag" required options={options} />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('applies error styling', () => {
    render(<Select options={options} error="Fout" />)
    expect(document.querySelector('select')).toHaveClass('border-red-500')
  })

  it('applies custom className', () => {
    render(<Select className="custom-select" options={options} />)
    expect(document.querySelector('select')).toHaveClass('custom-select')
  })

  it('handles disabled state', () => {
    render(<Select options={options} disabled />)
    expect(document.querySelector('select')).toBeDisabled()
  })

  it('handles change events', () => {
    render(<Select options={options} />)
    const select = document.querySelector('select')!
    fireEvent.change(select, { target: { value: 'b' } })
    expect(select.value).toBe('b')
  })
})
