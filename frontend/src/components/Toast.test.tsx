/*
 * File: frontend/src/components/Toast.test.tsx
 * Last updated: 2026-05-02
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-02: Initial test implementation for Toast component
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ToastContainer, showToast } from './Toast'

const mocks = vi.hoisted(() => ({
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
  mockToast: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  Toaster: () => null,
  toast: {
    success: mocks.mockSuccess,
    error: mocks.mockError,
    default: mocks.mockToast,
  },
}))

describe('Toast Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('ToastContainer', () => {
    it('renders without crashing', () => {
      const { container } = render(<ToastContainer />)
      expect(container).toBeTruthy()
    })
  })

  describe('showToast', () => {
    it('showToast.success() displays a success toast', () => {
      const message = 'Success message'
      showToast.success(message)
      expect(mocks.mockSuccess).toHaveBeenCalledWith(message, { id: message })
    })

    it('showToast.error() displays an error toast', () => {
      const message = 'Error message'
      showToast.error(message)
      expect(mocks.mockError).toHaveBeenCalledWith(message, { id: message })
    })

    it('showToast.info() displays an info toast', () => {
      const message = 'Info message'
      showToast.info(message)
      expect(mocks.mockToast).toHaveBeenCalledWith(message, { id: message })
    })

    it('toast messages appear with correct content', () => {
      const message = 'Test notification'
      showToast.success(message)
      expect(mocks.mockSuccess).toHaveBeenCalledWith(message, { id: message })
    })

    it('each toast type uses unique id for deduplication', () => {
      const msg1 = 'First message'
      const msg2 = 'Second message'

      showToast.success(msg1)
      showToast.success(msg1)
      showToast.error(msg2)

      expect(mocks.mockSuccess).toHaveBeenCalledWith(msg1, { id: msg1 })
      expect(mocks.mockError).toHaveBeenCalledWith(msg2, { id: msg2 })
    })
  })
})
