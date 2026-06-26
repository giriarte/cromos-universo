import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminHeader from '@/components/admin/AdminHeader'

const mockSignOut = vi.fn()
let mockPathname = '/admin'

vi.mock('next/navigation', () => ({ usePathname: () => mockPathname }))
vi.mock('next-auth/react', () => ({ signOut: (...args: unknown[]) => mockSignOut(...args) }))

beforeEach(() => {
  mockSignOut.mockClear()
  mockPathname = '/admin'
})

describe('AdminHeader', () => {
  it('renders the brand name', () => {
    render(<AdminHeader />)
    expect(screen.getByText('Cromos Universo')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('shows the active section label in the nav button (Dashboard for /admin)', () => {
    render(<AdminHeader />)
    expect(screen.getByRole('button', { name: /Dashboard/i })).toBeInTheDocument()
  })

  it('shows Artículos as active on /admin/articles', () => {
    mockPathname = '/admin/articles'
    render(<AdminHeader />)
    expect(screen.getByRole('button', { name: /Artículos/i })).toBeInTheDocument()
  })

  it('shows the dropdown with all nav links when the nav button is clicked', async () => {
    const user = userEvent.setup()
    render(<AdminHeader />)
    await user.click(screen.getByRole('button', { name: /Dashboard/i }))
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Artículos/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Categorías/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pedidos/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Usuarios/i })).toBeInTheDocument()
  })

  it('closes the dropdown when a link is clicked', async () => {
    const user = userEvent.setup()
    render(<AdminHeader />)
    await user.click(screen.getByRole('button', { name: /Dashboard/i }))
    await user.click(screen.getByRole('link', { name: /Artículos/i }))
    expect(screen.queryByRole('link', { name: /Pedidos/i })).not.toBeInTheDocument()
  })

  it('closes the dropdown when clicking outside', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <AdminHeader />
        <div data-testid="outside">outside</div>
      </div>
    )
    await user.click(screen.getByRole('button', { name: /Dashboard/i }))
    expect(screen.getByRole('link', { name: /Artículos/i })).toBeInTheDocument()
    await user.click(screen.getByTestId('outside'))
    expect(screen.queryByRole('link', { name: /Artículos/i })).not.toBeInTheDocument()
  })

  it('calls signOut with the login callbackUrl when Salir is clicked', async () => {
    const user = userEvent.setup()
    render(<AdminHeader />)
    await user.click(screen.getByRole('button', { name: /Salir/i }))
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/admin/login' })
  })
})
