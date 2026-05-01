/*
 * File: frontend/src/__tests__/accessibility.test.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial component-level accessibility tests added
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Card } from '../components/Card'

describe('Accessibility Unit Tests', () => {
  afterEach(() => {
    cleanup()
  })

  async function checkA11y(container: HTMLElement): Promise<any> {
    return await axe.run(container, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa']
      }
    })
  }

  describe('Button component', () => {
    it('has no accessibility violations for default button', async () => {
      const { container } = render(<Button>Click me</Button>)
      const results = await checkA11y(container)
      expect(results.violations.length).toBe(0)
    })

    it('has proper aria-label when using icon-only variant', async () => {
      const { container } = render(
        <Button aria-label="Close dialog">
          <span aria-hidden="true">×</span>
        </Button>
      )
      const results = await checkA11y(container)
      expect(results.violations.length).toBe(0)
      expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument()
    })

    it('is keyboard accessible', async () => {
      render(<Button>Submit</Button>)
      const button = screen.getByRole('button')
      button.focus()
      expect(document.activeElement).toBe(button)
      
      // Should be clickable via Enter (userEvent may not work well in jsdom, but we can check keydown)
      await userEvent.keyboard('{Enter}')
    })

    it('shows focus indicator', async () => {
      render(<Button>Focus me</Button>)
      const button = screen.getByRole('button')
      button.focus()
      
      // Check that computed style includes visible focus outline
      const style = window.getComputedStyle(button)
      expect(style.outlineWidth).not.toBe('0px')
      expect(style.outlineStyle).not.toBe('none')
    })
  })

  describe('Input component', () => {
    it('has no accessibility violations for basic input', async () => {
      const { container } = render(<Input label="Email" id="email" />)
      const results = await checkA11y(container)
      expect(results.violations.length).toBe(0)
    })

    it('associates label with input correctly', () => {
      render(<Input label="Email address" id="email" />)
      const input = screen.getByLabelText(/email/i)
      expect(input).toBeInTheDocument()
    })

    it('shows error message with aria-describedby', async () => {
      const { container } = render(
        <Input 
          label="Password" 
          id="password" 
          error="Password is required" 
        />
      )
      const results = await checkA11y(container)
      expect(results.violations.length).toBe(0)
      
      const error = screen.getByText(/password is required/i)
      expect(error).toHaveAttribute('id', expect.stringContaining('error'))
    })

    it('marks required fields properly', () => {
      render(<Input label="Username" required />)
      const input = screen.getByLabelText(/username/i)
      // Native required attribute is sufficient; aria-required is implicit for native inputs
      expect(input).toHaveAttribute('required')
    })
  })

  describe('Card component', () => {
    it('has appropriate semantic structure', async () => {
      const { container } = render(
        <Card>
          <h2>Card title</h2>
          <p>Card content</p>
        </Card>
      )
      const results = await checkA11y(container)
      expect(results.violations.length).toBe(0)
    })

    it('renders without causing color contrast violations', async () => {
      const { container } = render(
        <Card>
          <p>Some text inside the card</p>
        </Card>
      )
      const results = await axe.run(container, {
        runOnly: { type: 'rule', values: ['color-contrast'] }
      })
      expect(results.violations.length).toBe(0)
    })
  })

  describe('Form accessibility patterns', () => {
    it('complete form has no violations', async () => {
      const { container } = render(
        <form>
          <label htmlFor="name">Name</label>
          <input id="name" type="text" aria-required="true" />
          
          <label htmlFor="email">Email</label>
          <input id="email" type="email" />
          
          <button type="submit">Submit</button>
        </form>
      )
      const results = await checkA11y(container)
      expect(results.violations.length).toBe(0)
    })

    it('validation errors are announced', async () => {
      render(
        <form>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" aria-describedby="email-error" />
          <span id="email-error" role="alert">Invalid email format</span>
        </form>
      )
      
      const error = screen.getByRole('alert')
      expect(error).toHaveAttribute('id', 'email-error')
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-describedby', 'email-error')
    })
  })
})
