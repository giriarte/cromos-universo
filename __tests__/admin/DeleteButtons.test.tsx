import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DeleteUserButton from '@/app/admin/users/DeleteUserButton'
import DeleteCategoryButton from '@/app/admin/categories/DeleteCategoryButton'
import DeleteArticleButton from '@/app/admin/articles/DeleteArticleButton'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }))

beforeEach(() => {
  mockRefresh.mockClear()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
  vi.stubGlobal('confirm', vi.fn())
})

// ── DeleteUserButton ────────────────────────────────────────────────────────

describe('DeleteUserButton', () => {
  it('renders an Eliminar button', () => {
    render(<DeleteUserButton id="u1" name="Alice" />)
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })

  it('shows confirmation dialog with the user name', async () => {
    vi.mocked(confirm).mockReturnValue(false)
    const user = userEvent.setup()
    render(<DeleteUserButton id="u1" name="Alice" />)
    await user.click(screen.getByRole('button'))
    expect(confirm).toHaveBeenCalledWith('¿Eliminar al usuario "Alice"?')
  })

  it('does nothing when the user cancels the confirmation', async () => {
    vi.mocked(confirm).mockReturnValue(false)
    const user = userEvent.setup()
    render(<DeleteUserButton id="u1" name="Alice" />)
    await user.click(screen.getByRole('button'))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('calls DELETE /api/admin-users/:id and refreshes on confirm', async () => {
    vi.mocked(confirm).mockReturnValue(true)
    const user = userEvent.setup()
    render(<DeleteUserButton id="u42" name="Bob" />)
    await user.click(screen.getByRole('button'))
    expect(fetch).toHaveBeenCalledWith('/api/admin-users/u42', { method: 'DELETE' })
    expect(mockRefresh).toHaveBeenCalledOnce()
  })
})

// ── DeleteCategoryButton ────────────────────────────────────────────────────

describe('DeleteCategoryButton', () => {
  it('renders an Eliminar button', () => {
    render(<DeleteCategoryButton id="c1" name="Fútbol" />)
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })

  it('shows confirmation dialog warning about orphaned articles', async () => {
    vi.mocked(confirm).mockReturnValue(false)
    const user = userEvent.setup()
    render(<DeleteCategoryButton id="c1" name="Fútbol" />)
    await user.click(screen.getByRole('button'))
    expect(confirm).toHaveBeenCalledWith(
      '¿Eliminar la categoría "Fútbol"? Los artículos asociados quedarán sin categoría.'
    )
  })

  it('calls DELETE /api/categories/:id and refreshes on confirm', async () => {
    vi.mocked(confirm).mockReturnValue(true)
    const user = userEvent.setup()
    render(<DeleteCategoryButton id="cat-99" name="Fútbol" />)
    await user.click(screen.getByRole('button'))
    expect(fetch).toHaveBeenCalledWith('/api/categories/cat-99', { method: 'DELETE' })
    expect(mockRefresh).toHaveBeenCalledOnce()
  })

  it('does not call fetch when cancelled', async () => {
    vi.mocked(confirm).mockReturnValue(false)
    const user = userEvent.setup()
    render(<DeleteCategoryButton id="c1" name="Fútbol" />)
    await user.click(screen.getByRole('button'))
    expect(fetch).not.toHaveBeenCalled()
  })
})

// ── DeleteArticleButton ─────────────────────────────────────────────────────

describe('DeleteArticleButton', () => {
  it('renders an Eliminar button', () => {
    render(<DeleteArticleButton id="a1" title="Messi #10" />)
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })

  it('shows confirmation dialog with the article title', async () => {
    vi.mocked(confirm).mockReturnValue(false)
    const user = userEvent.setup()
    render(<DeleteArticleButton id="a1" title="Messi #10" />)
    await user.click(screen.getByRole('button'))
    expect(confirm).toHaveBeenCalledWith('¿Eliminar "Messi #10"? Esta acción no se puede deshacer.')
  })

  it('calls DELETE /api/articles/:id and refreshes on success', async () => {
    vi.mocked(confirm).mockReturnValue(true)
    const user = userEvent.setup()
    render(<DeleteArticleButton id="art-7" title="Ronaldo" />)
    await user.click(screen.getByRole('button'))
    expect(fetch).toHaveBeenCalledWith('/api/articles/art-7', { method: 'DELETE' })
    expect(mockRefresh).toHaveBeenCalledOnce()
  })

  it('shows an error message when the API returns a non-ok response', async () => {
    vi.mocked(confirm).mockReturnValue(true)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Artículo en uso' }),
    }))
    const user = userEvent.setup()
    render(<DeleteArticleButton id="a1" title="Card" />)
    await user.click(screen.getByRole('button'))
    expect(await screen.findByText('Artículo en uso')).toBeInTheDocument()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('shows a fallback error message when response JSON has no error field', async () => {
    vi.mocked(confirm).mockReturnValue(true)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    const user = userEvent.setup()
    render(<DeleteArticleButton id="a1" title="Card" />)
    await user.click(screen.getByRole('button'))
    expect(await screen.findByText('No se pudo eliminar el artículo.')).toBeInTheDocument()
  })
})
