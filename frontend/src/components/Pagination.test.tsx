/*
 * File: frontend/src/components/Pagination.test.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination Component', () => {
  it('renders nothing when totalPages is 1', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when totalPages is 0', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={0} onPageChange={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders navigation with multiple pages', () => {
    render(<Pagination currentPage={1} totalPages={3} onPageChange={() => {}} />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('disables previous button on first page', () => {
    render(<Pagination currentPage={1} totalPages={3} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: /vorige pagina/i })).toBeDisabled()
  })

  it('disables next button on last page', () => {
    render(<Pagination currentPage={3} totalPages={3} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: /volgende pagina/i })).toBeDisabled()
  })

  it('calls onPageChange with previous page when clicking previous', () => {
    const onPageChange = vi.fn()
    render(<Pagination currentPage={2} totalPages={3} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByRole('button', { name: /vorige pagina/i }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('calls onPageChange with next page when clicking next', () => {
    const onPageChange = vi.fn()
    render(<Pagination currentPage={2} totalPages={3} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByRole('button', { name: /volgende pagina/i }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageChange when clicking a page number', () => {
    const onPageChange = vi.fn()
    render(<Pagination currentPage={1} totalPages={3} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByRole('button', { name: /ga naar pagina 2/i }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('marks current page with aria-current', () => {
    render(<Pagination currentPage={2} totalPages={3} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: /ga naar pagina 2/i })).toHaveAttribute('aria-current', 'page')
  })

  it('applies active styling to current page', () => {
    render(<Pagination currentPage={2} totalPages={3} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: /ga naar pagina 2/i })).toHaveClass('bg-blue-600')
  })

  it('disables all page buttons when isDisabled is true', () => {
    render(<Pagination currentPage={2} totalPages={3} onPageChange={() => {}} isDisabled />)
    const pageButtons = screen.getAllByRole('button', { name: /ga naar pagina/i })
    pageButtons.forEach(button => expect(button).toBeDisabled())
  })

  it('shows ellipsis for large page counts', () => {
    render(<Pagination currentPage={5} totalPages={10} onPageChange={() => {}} />)
    const ellipses = document.querySelectorAll('span[aria-hidden="true"]')
    expect(ellipses.length).toBeGreaterThan(0)
  })

  it('shows first and last page buttons when not in visible range', () => {
    render(<Pagination currentPage={5} totalPages={10} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Ga naar pagina 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ga naar pagina 10' })).toBeInTheDocument()
  })
})
