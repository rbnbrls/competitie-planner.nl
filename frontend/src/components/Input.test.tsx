/*
 * File: frontend/src/components/Input.test.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Input } from './Input'

describe('Input Component', () => {
  it('renders input element', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders with label', () => {
    render(<Input label="Email" />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('renders with error message', () => {
    render(<Input error="Invalid email" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid email/i)
  })

  it('renders with helper text', () => {
    render(<Input helperText="Enter your email" />)
    expect(screen.getByText(/enter your email/i)).toBeInTheDocument()
  })

  it('shows required indicator', () => {
    render(<Input label="Email" required />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('applies error styling', () => {
    render(<Input error="Error" />)
    expect(screen.getByRole('textbox')).toHaveClass('border-red-500')
  })

  it('applies custom className', () => {
    render(<Input className="custom-input" />)
    expect(screen.getByRole('textbox')).toHaveClass('custom-input')
  })

  it('handles different input types', () => {
    const { rerender } = render(<Input type="email" />)
    expect(document.querySelector('input')).toHaveAttribute('type', 'email')

    rerender(<Input type="number" />)
    expect(document.querySelector('input')).toHaveAttribute('type', 'number')
  })
})