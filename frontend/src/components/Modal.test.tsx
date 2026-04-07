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
})