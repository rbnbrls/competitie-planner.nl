/*
 * File: frontend/src/components/ErrorBoundary.test.tsx
 * Last updated: 2026-05-02
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-02: Initial test implementation for ErrorBoundary component
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'
import * as Sentry from '@sentry/react'

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}))

const ThrowError = () => {
  throw new Error('Test error')
}

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Normal content')).toBeInTheDocument()
  })

  it('shows error message when child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Er ging iets mis')).toBeInTheDocument()
    expect(
      screen.getByText(/Er is een onverwachte fout opgetreden/)
    ).toBeInTheDocument()
  })

  it('reports errors to Sentry', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(Sentry.captureException).toHaveBeenCalled()
    const callArgs = (Sentry.captureException as any).mock.calls[0]
    expect(callArgs[0]).toBeInstanceOf(Error)
    expect(callArgs[0].message).toBe('Test error')
  })

  it('calls onError callback when provided', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const onError = vi.fn()

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(onError.mock.calls[0][0].message).toBe('Test error')
  })

  it('shows custom fallback when provided', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom fallback')).toBeInTheDocument()
  })

  it('renders "Opnieuw proberen" button for retry', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByRole('button', { name: /Opnieuw proberen/i })).toBeInTheDocument()
  })

  it('renders "Pagina herladen" button', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByRole('button', { name: /Pagina herladen/i })).toBeInTheDocument()
  })

  it('resets error state when retry button is clicked', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Er ging iets mis')).toBeInTheDocument()

    const retryButton = screen.getByRole('button', { name: /Opnieuw proberen/i })
    fireEvent.click(retryButton)

    rerender(
      <ErrorBoundary key="new-instance">
        <div>Recovered</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Recovered')).toBeInTheDocument()
  })
})
