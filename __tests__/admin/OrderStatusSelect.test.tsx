import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrderStatusSelect from '@/app/admin/orders/OrderStatusSelect'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }))

beforeEach(() => {
  mockRefresh.mockClear()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})

describe('OrderStatusSelect', () => {
  it('renders all three status options', () => {
    render(<OrderStatusSelect orderId="o1" current="pending" />)
    expect(screen.getByRole('option', { name: 'Pendiente' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Confirmado' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Cancelado' })).toBeInTheDocument()
  })

  it('defaults to the current status', () => {
    render(<OrderStatusSelect orderId="o1" current="confirmed" />)
    expect(screen.getByRole('combobox')).toHaveValue('confirmed')
  })

  it('calls PATCH with the new status on change', async () => {
    const user = userEvent.setup()
    render(<OrderStatusSelect orderId="order-123" current="pending" />)
    await user.selectOptions(screen.getByRole('combobox'), 'cancelled')
    expect(fetch).toHaveBeenCalledWith('/api/orders/order-123', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' }),
    }))
  })

  it('calls router.refresh() after a successful update', async () => {
    const user = userEvent.setup()
    render(<OrderStatusSelect orderId="o1" current="pending" />)
    await user.selectOptions(screen.getByRole('combobox'), 'confirmed')
    expect(mockRefresh).toHaveBeenCalledOnce()
  })

  it('disables the select while the request is in flight', async () => {
    let resolve!: () => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r) => { resolve = () => r({ ok: true } as Response) })))
    const user = userEvent.setup()
    render(<OrderStatusSelect orderId="o1" current="pending" />)
    const select = screen.getByRole('combobox')
    user.selectOptions(select, 'confirmed')
    await vi.waitFor(() => expect(select).toBeDisabled())
    resolve()
    await vi.waitFor(() => expect(select).not.toBeDisabled())
  })
})
