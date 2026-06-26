import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditCategoryRow from '@/app/admin/categories/EditCategoryRow'
import type { Category } from '@/types/database'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }))

const cat: Category = { id: 'cat-1', name: 'Fútbol', slug: 'futbol', created_at: '2024-01-01' }

function renderRow(c = cat) {
  return render(
    <table><tbody><tr>
      <EditCategoryRow cat={c} />
    </tr></tbody></table>
  )
}

beforeEach(() => {
  mockRefresh.mockClear()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
  vi.stubGlobal('confirm', vi.fn().mockReturnValue(false))
})

describe('EditCategoryRow — view mode', () => {
  it('shows the category name and slug', () => {
    renderRow()
    expect(screen.getByText('Fútbol')).toBeInTheDocument()
    expect(screen.getByText('futbol')).toBeInTheDocument()
  })

  it('shows Editar and Eliminar buttons', () => {
    renderRow()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })

  it('switches to edit mode when Editar is clicked', async () => {
    const user = userEvent.setup()
    renderRow()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })
})

describe('EditCategoryRow — edit mode', () => {
  it('pre-fills the input with the current name', async () => {
    const user = userEvent.setup()
    renderRow()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    expect(screen.getByRole('textbox')).toHaveValue('Fútbol')
  })

  it('cancels editing and restores the original name on Cancelar', async () => {
    const user = userEvent.setup()
    renderRow()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'Basketball')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('Fútbol')).toBeInTheDocument()
  })

  it('cancels editing on Escape key', async () => {
    const user = userEvent.setup()
    renderRow()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('calls PATCH with the new name and refreshes on Enter key', async () => {
    const user = userEvent.setup()
    renderRow()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'Baloncesto')
    await user.keyboard('{Enter}')
    expect(fetch).toHaveBeenCalledWith('/api/categories/cat-1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ name: 'Baloncesto' }),
    }))
    expect(mockRefresh).toHaveBeenCalledOnce()
  })

  it('does not call fetch when the name is unchanged', async () => {
    const user = userEvent.setup()
    renderRow()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('calls PATCH with the new name and refreshes on Guardar click', async () => {
    const user = userEvent.setup()
    renderRow()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'Rugby')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(fetch).toHaveBeenCalledWith('/api/categories/cat-1', expect.objectContaining({
      method: 'PATCH',
    }))
    expect(mockRefresh).toHaveBeenCalledOnce()
  })

  it('shows an error message when the API returns a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Nombre duplicado' }),
    }))
    const user = userEvent.setup()
    renderRow()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'Rugby')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Nombre duplicado')).toBeInTheDocument()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('Guardar is disabled when the input is empty', async () => {
    const user = userEvent.setup()
    renderRow()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await user.clear(screen.getByRole('textbox'))
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })
})
