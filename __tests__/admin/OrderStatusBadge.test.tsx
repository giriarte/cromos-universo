import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OrderStatusBadge from '@/app/admin/orders/OrderStatusBadge'

describe('OrderStatusBadge', () => {
  it('renders Pendiente for pending status', () => {
    render(<OrderStatusBadge status="pending" />)
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })

  it('renders Confirmado for confirmed status', () => {
    render(<OrderStatusBadge status="confirmed" />)
    expect(screen.getByText('Confirmado')).toBeInTheDocument()
  })

  it('renders Cancelado for cancelled status', () => {
    render(<OrderStatusBadge status="cancelled" />)
    expect(screen.getByText('Cancelado')).toBeInTheDocument()
  })

  it('falls back to raw status string for unknown status', () => {
    render(<OrderStatusBadge status="unknown_state" />)
    expect(screen.getByText('unknown_state')).toBeInTheDocument()
  })

  it('applies yellow classes for pending', () => {
    render(<OrderStatusBadge status="pending" />)
    expect(screen.getByText('Pendiente')).toHaveClass('bg-yellow-100', 'text-yellow-700')
  })

  it('applies green classes for confirmed', () => {
    render(<OrderStatusBadge status="confirmed" />)
    expect(screen.getByText('Confirmado')).toHaveClass('bg-green-100', 'text-green-700')
  })

  it('applies red classes for cancelled', () => {
    render(<OrderStatusBadge status="cancelled" />)
    expect(screen.getByText('Cancelado')).toHaveClass('bg-red-100', 'text-red-600')
  })

  it('applies gray fallback classes for unknown status', () => {
    render(<OrderStatusBadge status="mystery" />)
    expect(screen.getByText('mystery')).toHaveClass('bg-gray-100', 'text-gray-500')
  })
})
