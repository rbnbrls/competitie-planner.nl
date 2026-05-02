/*
 * File: frontend/src/components/Modal.test.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal Component', () => {
  it('renders nothing when closed', () => {
    render(<Modal isOpen={false} title="Test" onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders modal when open', () => {
    render(<Modal isOpen={true} title="Test Modal" onClose={() => {}} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<Modal isOpen={true} title="Test" onClose={onClose} />)
    
    fireEvent.click(screen.getByRole('button', { name: /sluiten/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn()
    render(<Modal isOpen={true} title="Test" onClose={onClose} />)
    
    fireEvent.click(screen.getByRole('presentation').firstChild as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders description', () => {
    render(<Modal isOpen={true} title="Test" description="This is a description" onClose={() => {}} />)
    expect(screen.getByText('This is a description')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(
      <Modal isOpen={true} title="Test" onClose={() => {}}>
        <div data-testid="content">Modal Content</div>
      </Modal>
    )
    expect(screen.getByTestId('content')).toHaveTextContent('Modal Content')
  })

  it('renders footer', () => {
    render(
      <Modal isOpen={true} title="Test" footer={<button>Action</button>} onClose={() => {}} />
    )
    expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument()
  })

  it('hides close button when showCloseButton is false', () => {
    render(<Modal isOpen={true} title="Test" showCloseButton={false} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /sluiten/i })).not.toBeInTheDocument()
  })

  it('applies different max widths', () => {
    const { rerender } = render(<Modal isOpen={true} maxWidth="sm" onClose={() => {}} />)
    expect(document.querySelector('.max-w-sm')).toBeInTheDocument()

    rerender(<Modal isOpen={true} maxWidth="lg" onClose={() => {}} />)
    expect(document.querySelector('.max-w-lg')).toBeInTheDocument()
  })

  it('has stable ARIA IDs across re-renders', () => {
    const { rerender } = render(
      <Modal isOpen={true} title="Test Modal" description="Test description" onClose={() => {}} />
    )
    
    const dialog = screen.getByRole('dialog')
    const firstTitleId = dialog.getAttribute('aria-labelledby')
    const firstDescId = dialog.getAttribute('aria-describedby')
    const firstTitleEl = document.getElementById(firstTitleId!)
    const firstDescEl = document.getElementById(firstDescId!)
    
    rerender(
      <Modal isOpen={true} title="Test Modal" description="Test description" onClose={() => {}} />
    )
    
    const dialog2 = screen.getByRole('dialog')
    const secondTitleId = dialog2.getAttribute('aria-labelledby')
    const secondDescId = dialog2.getAttribute('aria-describedby')
    
    expect(secondTitleId).toBe(firstTitleId)
    expect(secondDescId).toBe(firstDescId)
    
    expect(firstTitleEl).toBeInTheDocument()
    expect(firstDescEl).toBeInTheDocument()
  })

  it('ARIA attributes are not present when title or description is missing', () => {
    const { rerender } = render(<Modal isOpen={true} onClose={() => {}} />)
    
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-labelledby')).toBeNull()
    expect(dialog.getAttribute('aria-describedby')).toBeNull()
    
    rerender(<Modal isOpen={true} title="Only title" onClose={() => {}} />)
    expect(dialog.getAttribute('aria-labelledby')).not.toBeNull()
    expect(dialog.getAttribute('aria-describedby')).toBeNull()
    
    rerender(<Modal isOpen={true} description="Only desc" onClose={() => {}} />)
    expect(dialog.getAttribute('aria-labelledby')).toBeNull()
    expect(dialog.getAttribute('aria-describedby')).not.toBeNull()
  })

  it('focuses first focusable element on open', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <button>First</button>
        <button>Second</button>
      </Modal>
    )
    
    const closeButton = screen.getByRole('button', { name: /sluiten/i })
    expect(closeButton).toHaveFocus()
  })

  it('traps Tab focus cycles from last to first element', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <button>First</button>
        <button>Last</button>
      </Modal>
    )
    
    const lastButton = screen.getByRole('button', { name: 'Last' })
    lastButton.focus()
    expect(lastButton).toHaveFocus()
    
    fireEvent.keyDown(document, { key: 'Tab' })
    const closeButton = screen.getByRole('button', { name: /sluiten/i })
    expect(closeButton).toHaveFocus()
  })

  it('traps Shift+Tab focus cycles from first to last element', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <button>First</button>
        <button>Last</button>
      </Modal>
    )
    
    const closeButton = screen.getByRole('button', { name: /sluiten/i })
    const lastButton = screen.getByRole('button', { name: 'Last' })
    expect(closeButton).toHaveFocus()
    
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(lastButton).toHaveFocus()
  })

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn()
    render(<Modal isOpen={true} onClose={onClose}><button>Action</button></Modal>)
    
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('returns focus to previously focused element on close', async () => {
    const trigger = document.createElement('button')
    trigger.id = 'trigger'
    document.body.appendChild(trigger)
    trigger.focus()
    
    const { rerender } = render(
      <Modal isOpen={true} title="Test" onClose={() => {}}>
        <button>Modal Button</button>
      </Modal>
    )
    
    const closeButton = screen.getByRole('button', { name: /sluiten/i })
    expect(closeButton).toHaveFocus()
    
    rerender(<Modal isOpen={false} title="Test" onClose={() => {}}><button>Modal Button</button></Modal>)
    
    expect(trigger).toHaveFocus()
    document.body.removeChild(trigger)
  })

  it('locks body overflow when modal opens', () => {
    render(<Modal isOpen={true} title="Test" onClose={() => {}} />)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores body overflow when modal closes', () => {
    const { rerender } = render(<Modal isOpen={true} title="Test" onClose={() => {}} />)
    expect(document.body.style.overflow).toBe('hidden')
    
    rerender(<Modal isOpen={false} title="Test" onClose={() => {}} />)
    expect(document.body.style.overflow).toBe('unset')
  })

  it('modal content is not clickable to close when showCloseButton is false', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} title="Test" showCloseButton={false} onClose={onClose}>
        <div data-testid="modal-content">Content</div>
      </Modal>
    )
    
    fireEvent.click(screen.getByTestId('modal-content'))
    expect(onClose).not.toHaveBeenCalled()
  })
})