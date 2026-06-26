import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CategoryFilter from '@/app/admin/articles/CategoryFilter'
import type { Category } from '@/types/database'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

const categories: Category[] = [
  { id: 'c1', name: 'Fútbol', slug: 'futbol', created_at: '2024-01-01' },
  { id: 'c2', name: 'Pokémon', slug: 'pokemon', created_at: '2024-01-02' },
]

beforeEach(() => mockPush.mockClear())

describe('CategoryFilter', () => {
  it('renders a "Todas las categorías" option plus all categories', () => {
    render(<CategoryFilter categories={categories} selected="" />)
    expect(screen.getByRole('option', { name: 'Todas las categorías' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Fútbol' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Pokémon' })).toBeInTheDocument()
  })

  it('reflects the selected category', () => {
    render(<CategoryFilter categories={categories} selected="c2" />)
    expect(screen.getByRole('combobox')).toHaveValue('c2')
  })

  it('navigates to /admin/articles?cat=<id> when a category is selected', async () => {
    const user = userEvent.setup()
    render(<CategoryFilter categories={categories} selected="" />)
    await user.selectOptions(screen.getByRole('combobox'), 'c1')
    expect(mockPush).toHaveBeenCalledWith('/admin/articles?cat=c1')
  })

  it('navigates to /admin/articles when "Todas" is selected', async () => {
    const user = userEvent.setup()
    render(<CategoryFilter categories={categories} selected="c1" />)
    await user.selectOptions(screen.getByRole('combobox'), '')
    expect(mockPush).toHaveBeenCalledWith('/admin/articles')
  })
})
