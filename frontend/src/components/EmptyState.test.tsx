import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CircleAlert } from 'lucide-react'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders the action button only when both label and handler are provided', () => {
    const onAction = vi.fn()

    const { rerender } = render(
      <EmptyState
        icon={CircleAlert}
        title="Geen data"
        description="Voeg eerst gegevens toe."
        actionLabel="Opnieuw laden"
        onAction={onAction}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Opnieuw laden' }))
    expect(onAction).toHaveBeenCalledTimes(1)

    rerender(
      <EmptyState
        icon={CircleAlert}
        title="Geen data"
        actionLabel="Opnieuw laden"
      />
    )

    expect(screen.queryByRole('button', { name: 'Opnieuw laden' })).not.toBeInTheDocument()
  })

  it('renders the table variant inside a table cell with the requested colspan', () => {
    render(
      <table>
        <tbody>
          <tr>
            <EmptyState
              icon={CircleAlert}
              title="Geen teams"
              variant="table"
              colSpan={4}
            />
          </tr>
        </tbody>
      </table>
    )

    const tableCell = screen.getByText('Geen teams').closest('td')
    expect(tableCell).toHaveAttribute('colspan', '4')
    expect(tableCell).toHaveClass('h-48')
  })

  it('renders the page variant with the larger layout wrapper', () => {
    render(
      <EmptyState
        icon={CircleAlert}
        title="Nog niets gevonden"
        variant="page"
      />
    )

    const heading = screen.getByRole('heading', { name: 'Nog niets gevonden', level: 3 })
    const wrapper = heading.closest('div[class*="text-center"]')
    expect(wrapper).toHaveClass('space-y-6')
  })
})
