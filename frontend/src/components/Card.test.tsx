/*
 * File: frontend/src/components/Card.test.tsx
 * Last updated: 2026-05-02
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-02: Initial unit tests for Card components
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card'

describe('Card Component', () => {
  it('renders with correct structure (header, content, footer)', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Card Content</CardContent>
        <CardFooter>Card Footer</CardFooter>
      </Card>
    )

    expect(screen.getByText('Card Title')).toBeInTheDocument()
    expect(screen.getByText('Card Description')).toBeInTheDocument()
    expect(screen.getByText('Card Content')).toBeInTheDocument()
    expect(screen.getByText('Card Footer')).toBeInTheDocument()
  })

  it('applies custom className to Card', () => {
    render(<Card className="custom-card-class">Card Content</Card>)
    expect(screen.getByText('Card Content')).toHaveClass('custom-card-class')
  })

  it('applies theming CSS variables to the Card wrapper', () => {
    render(<Card>Card Content</Card>)
    const card = screen.getByText('Card Content')

    expect(card).toHaveClass('bg-[var(--theme-card-bg)]')
    expect(card).toHaveClass('shadow-[var(--theme-card-shadow)]')
  })
})

describe('CardHeader Component', () => {
  it('renders with children', () => {
    render(
      <Card>
        <CardHeader><span>Header Content</span></CardHeader>
      </Card>
    )
    expect(screen.getByText('Header Content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <Card>
        <CardHeader className="custom-header-class"><span>Header Content</span></CardHeader>
      </Card>
    )
    expect(screen.getByText('Header Content').parentElement).toHaveClass('custom-header-class')
  })

  it('has flex column layout styling', () => {
    render(
      <Card>
        <CardHeader><span>Header Content</span></CardHeader>
      </Card>
    )
    expect(screen.getByText('Header Content').parentElement).toHaveClass('flex')
    expect(screen.getByText('Header Content').parentElement).toHaveClass('flex-col')
  })
})

describe('CardTitle Component', () => {
  it('renders as heading element (h3)', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
        </CardHeader>
      </Card>
    )
    const title = screen.getByRole('heading', { level: 3 })
    expect(title).toBeInTheDocument()
    expect(title).toHaveTextContent('Card Title')
  })

  it('has correct typography styling', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
        </CardHeader>
      </Card>
    )
    const title = screen.getByText('Card Title')
    expect(title).toHaveClass('font-bold')
    expect(title).toHaveClass('text-xl')
  })

  it('applies custom className', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle className="custom-title-class">Card Title</CardTitle>
        </CardHeader>
      </Card>
    )
    expect(screen.getByText('Card Title')).toHaveClass('custom-title-class')
  })
})

describe('CardDescription Component', () => {
  it('renders as paragraph element', () => {
    render(
      <Card>
        <CardHeader>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
      </Card>
    )
    expect(screen.getByText('Card Description')).toBeInTheDocument()
  })

  it('renders with muted text styling', () => {
    render(
      <Card>
        <CardHeader>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
      </Card>
    )
    const description = screen.getByText('Card Description')
    expect(description).toHaveClass('text-gray-500')
    expect(description).toHaveClass('text-sm')
  })

  it('applies custom className', () => {
    render(
      <Card>
        <CardHeader>
          <CardDescription className="custom-description-class">Card Description</CardDescription>
        </CardHeader>
      </Card>
    )
    expect(screen.getByText('Card Description')).toHaveClass('custom-description-class')
  })
})

describe('CardContent Component', () => {
  it('renders with children', () => {
    render(
      <Card>
        <CardContent>Content here</CardContent>
      </Card>
    )
    expect(screen.getByText('Content here')).toBeInTheDocument()
  })

  it('has correct padding styling', () => {
    render(
      <Card>
        <CardContent>Content here</CardContent>
      </Card>
    )
    const content = screen.getByText('Content here')
    expect(content).toHaveClass('p-6')
    expect(content).toHaveClass('pt-6')
  })

  it('applies custom className', () => {
    render(
      <Card>
        <CardContent className="custom-content-class">Content here</CardContent>
      </Card>
    )
    expect(screen.getByText('Content here')).toHaveClass('custom-content-class')
  })
})

describe('CardFooter Component', () => {
  it('renders with children', () => {
    render(
      <Card>
        <CardFooter>Footer Content</CardFooter>
      </Card>
    )
    expect(screen.getByText('Footer Content')).toBeInTheDocument()
  })

  it('has flex layout and border styling', () => {
    render(
      <Card>
        <CardFooter>Footer Content</CardFooter>
      </Card>
    )
    const footer = screen.getByText('Footer Content')
    expect(footer).toHaveClass('flex')
    expect(footer).toHaveClass('items-center')
    expect(footer).toHaveClass('border-t')
  })

  it('applies custom className', () => {
    render(
      <Card>
        <CardFooter className="custom-footer-class">Footer Content</CardFooter>
      </Card>
    )
    expect(screen.getByText('Footer Content')).toHaveClass('custom-footer-class')
  })
})
