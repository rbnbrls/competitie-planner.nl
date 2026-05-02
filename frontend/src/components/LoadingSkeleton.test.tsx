/*
 * File: frontend/src/components/LoadingSkeleton.test.tsx
 * Last updated: 2026-05-02
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-02: Initial implementation for US-COMP-05
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LoadingSkeleton, Skeleton } from './LoadingSkeleton'

describe('Skeleton Component', () => {
  it('renders as a div element', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild?.nodeName).toBe('DIV')
  })

  it('has correct animation classes', () => {
    const { container } = render(<Skeleton />)
    const skeleton = container.firstChild
    expect(skeleton).toHaveClass('animate-pulse')
    expect(skeleton).toHaveClass('rounded-md')
    expect(skeleton).toHaveClass('bg-gray-200')
  })

  it('merges custom className with default classes', () => {
    const { container } = render(<Skeleton className="h-10 w-full" />)
    const skeleton = container.firstChild
    expect(skeleton).toHaveClass('h-10')
    expect(skeleton).toHaveClass('w-full')
    expect(skeleton).toHaveClass('animate-pulse')
  })
})

describe('LoadingSkeleton Component', () => {
  it('renders as a container div with correct spacing', () => {
    render(<LoadingSkeleton />)
    const container = document.querySelector('div.space-y-4')
    expect(container).toBeInTheDocument()
    expect(container).toHaveClass('w-full')
  })

  it('renders correct number of skeleton rows', () => {
    render(<LoadingSkeleton rows={3} />)
    const rows = document.querySelectorAll('.h-12')
    expect(rows).toHaveLength(3)
  })

  it('applies correct classes to skeleton rows', () => {
    render(<LoadingSkeleton rows={2} />)
    const rows = document.querySelectorAll('.h-12')
    rows.forEach(row => {
      expect(row).toHaveClass('animate-pulse')
      expect(row).toHaveClass('rounded-md')
      expect(row).toHaveClass('bg-gray-200')
      expect(row).toHaveClass('w-full')
    })
  })

  it('renders header skeleton row', () => {
    render(<LoadingSkeleton />)
    const headerRow = document.querySelector('div.h-10')
    expect(headerRow).toBeInTheDocument()
    expect(headerRow).toHaveClass('animate-pulse')
  })

  it('applies default row count when not specified', () => {
    render(<LoadingSkeleton />)
    const rows = document.querySelectorAll('.h-12')
    expect(rows).toHaveLength(5)
  })

  it('renders single row when rows prop is 1', () => {
    render(<LoadingSkeleton rows={1} />)
    const rows = document.querySelectorAll('.h-12')
    expect(rows).toHaveLength(1)
  })

  it('renders zero rows when rows prop is 0', () => {
    render(<LoadingSkeleton rows={0} />)
    const rows = document.querySelectorAll('.h-12')
    expect(rows).toHaveLength(0)
  })
})
