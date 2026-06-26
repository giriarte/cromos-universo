import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrderDetailActions from '@/app/admin/orders/[id]/OrderDetailActions'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }))

beforeEach(() => {
  mockRefresh.mockClear()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
})

const defaultProps = {
  orderId: 'order-1',
  currentStatus: 'pending',
  currentExpiresAt: '2025-12-31T23:59:59.000Z',
}

describe('OrderDetailActions', () => {
  it('renders status select, date input, and save button', () => {
    render(<OrderDetailActions {...defaultProps} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2025-12-31')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
  })

  it('initialises with the current status and date', () => {
    render(<OrderDetailActions {...defaultProps} />)
    expect(screen.getByRole('combobox')).toHaveValue('pending')
    expect(screen.getByDisplayValue('2025-12-31')).toHaveValue('2025-12-31')
  })

  it('calls PATCH /api/orders/:id with updated status and expires_at on save', async () => {
    const user = userEvent.setup()
    render(<OrderDetailActions {...defaultProps} />)
    await user.selectOptions(screen.getByRole('combobox'), 'confirmed')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(fetch).toHaveBeenCalledWith('/api/orders/order-1', expect.objectContaining({
      method: 'PATCH',
      body: expect.stringContaining('"status":"confirmed"'),
    }))
    expect(fetch).toHaveBeenCalledWith('/api/orders/order-1', expect.objectContaining({
      body: expect.stringContaining('"expires_at"'),
    }))
  })

  it('sends expires_at as the ISO representation of 23:59:59 on the selected date', async () => {
    const user = userEvent.setup()
    render(<OrderDetailActions {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    const expected = new Date('2025-12-31T23:59:59').toISOString()
    expect(body.expires_at).toBe(expected)
  })

  it('shows "Guardado ✓" after a successful save', async () => {
    const user = userEvent.setup()
    render(<OrderDetailActions {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Guardado ✓')).toBeInTheDocument()
    expect(mockRefresh).toHaveBeenCalledOnce()
  })
})
