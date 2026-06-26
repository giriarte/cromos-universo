import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateCategoryForm from '@/app/admin/categories/CreateCategoryForm'
import CreateUserForm from '@/app/admin/users/CreateUserForm'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }))

beforeEach(() => {
  mockRefresh.mockClear()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
})

// ── CreateCategoryForm ──────────────────────────────────────────────────────

describe('CreateCategoryForm', () => {
  it('renders a text input and an Agregar button', () => {
    render(<CreateCategoryForm />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeInTheDocument()
  })

  it('calls POST /api/categories with the category name on submit', async () => {
    const user = userEvent.setup()
    render(<CreateCategoryForm />)
    await user.type(screen.getByRole('textbox'), 'Pokémon')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(fetch).toHaveBeenCalledWith('/api/categories', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Pokémon' }),
    }))
  })

  it('clears the input and refreshes the page on success', async () => {
    const user = userEvent.setup()
    render(<CreateCategoryForm />)
    await user.type(screen.getByRole('textbox'), 'Pokémon')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    await vi.waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''))
    expect(mockRefresh).toHaveBeenCalledOnce()
  })

  it('shows an error message when the API returns a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Categoría ya existe' }),
    }))
    const user = userEvent.setup()
    render(<CreateCategoryForm />)
    await user.type(screen.getByRole('textbox'), 'Fútbol')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(await screen.findByText('Categoría ya existe')).toBeInTheDocument()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('shows a fallback error when API gives no error field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    const user = userEvent.setup()
    render(<CreateCategoryForm />)
    await user.type(screen.getByRole('textbox'), 'X')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(await screen.findByText('Error al crear categoría')).toBeInTheDocument()
  })
})

// ── CreateUserForm ──────────────────────────────────────────────────────────

describe('CreateUserForm', () => {
  it('renders all form fields', () => {
    render(<CreateUserForm />)
    expect(screen.getByPlaceholderText('Ana García')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('ana@ejemplo.com')).toBeInTheDocument()
    expect(document.querySelector('input[name="password"]')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear usuario' })).toBeInTheDocument()
  })

  it('defaults role to Editor', () => {
    render(<CreateUserForm />)
    expect(screen.getByRole('combobox')).toHaveValue('editor')
  })

  it('calls POST /api/admin-users with all field values', async () => {
    const user = userEvent.setup()
    render(<CreateUserForm />)
    await user.type(screen.getByPlaceholderText('Ana García'), 'Juan')
    await user.type(screen.getByPlaceholderText('ana@ejemplo.com'), 'juan@test.com')
    await user.type(document.querySelector('input[name="password"]')!, 'secret123')
    await user.selectOptions(screen.getByRole('combobox'), 'superadmin')
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }))
    expect(fetch).toHaveBeenCalledWith('/api/admin-users', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Juan', email: 'juan@test.com', password: 'secret123', role: 'superadmin' }),
    }))
  })

  it('shows success message and refreshes on success', async () => {
    const user = userEvent.setup()
    render(<CreateUserForm />)
    await user.type(screen.getByPlaceholderText('Ana García'), 'Juan')
    await user.type(screen.getByPlaceholderText('ana@ejemplo.com'), 'juan@test.com')
    await user.type(document.querySelector('input[name="password"]')!, 'secret123')
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }))
    expect(await screen.findByText('Usuario creado exitosamente.')).toBeInTheDocument()
    expect(mockRefresh).toHaveBeenCalledOnce()
  })

  it('shows an error message when the API returns a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Email ya registrado' }),
    }))
    const user = userEvent.setup()
    render(<CreateUserForm />)
    await user.type(screen.getByPlaceholderText('Ana García'), 'Juan')
    await user.type(screen.getByPlaceholderText('ana@ejemplo.com'), 'juan@test.com')
    await user.type(document.querySelector('input[name="password"]')!, 'secret123')
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }))
    expect(await screen.findByText('Email ya registrado')).toBeInTheDocument()
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
