import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import { WornItemsSelector } from './WornItemsSelector'
import type { WardrobeItem } from '../../types/wardrobe'

function makeItem(overrides: Partial<WardrobeItem> & { id: string; name: string; category: WardrobeItem['category'] }): WardrobeItem {
  return {
    color: '',
    material: '',
    brand: '',
    warmthLevel: 3,
    waterproof: 'no',
    windproof: false,
    temperatureRange: { min: -10, max: 10 },
    photoUrl: '',
    sourceUrl: '',
    notes: '',
    extractedByAI: false,
    createdAt: {} as WardrobeItem['createdAt'],
    updatedAt: {} as WardrobeItem['updatedAt'],
    ...overrides,
  }
}

const JACKET = makeItem({ id: 'jacket-1', name: 'Gore-Tex Shell', category: 'jacket' })
const FLEECE = makeItem({ id: 'fleece-1', name: 'Bergans Fleece', category: 'fleece', brand: 'Bergans' })
const HAT = makeItem({ id: 'hat-1', name: 'Wool Beanie', category: 'hat' })

describe('WornItemsSelector', () => {
  it('renders each item by name', () => {
    render(<WornItemsSelector items={[JACKET, FLEECE, HAT]} value={[]} onChange={vi.fn()} />)
    expect(screen.getByText('Gore-Tex Shell')).toBeInTheDocument()
    expect(screen.getByText('Bergans Fleece')).toBeInTheDocument()
    expect(screen.getByText('Wool Beanie')).toBeInTheDocument()
  })

  it('shows category group labels', () => {
    render(<WornItemsSelector items={[JACKET, HAT]} value={[]} onChange={vi.fn()} />)
    expect(screen.getByText('Jackets')).toBeInTheDocument()
    expect(screen.getByText('Hats')).toBeInTheDocument()
  })

  it('does not render a category group when no items belong to it', () => {
    render(<WornItemsSelector items={[JACKET]} value={[]} onChange={vi.fn()} />)
    expect(screen.queryByText('Hats')).not.toBeInTheDocument()
    expect(screen.queryByText('Fleece')).not.toBeInTheDocument()
  })

  it('renders the brand when provided', () => {
    render(<WornItemsSelector items={[FLEECE]} value={[]} onChange={vi.fn()} />)
    expect(screen.getByText('Bergans')).toBeInTheDocument()
  })

  it('shows a message when no items are provided', () => {
    render(<WornItemsSelector items={[]} value={[]} onChange={vi.fn()} />)
    expect(screen.getByText(/no wardrobe items found/i)).toBeInTheDocument()
  })

  it('calls onChange when an item is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<WornItemsSelector items={[JACKET]} value={[]} onChange={onChange} />)
    await user.click(screen.getByText('Gore-Tex Shell'))
    expect(onChange).toHaveBeenCalledWith(['jacket-1'])
  })

  it('calls onChange with deselected ID when a checked item is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<WornItemsSelector items={[JACKET, HAT]} value={['jacket-1', 'hat-1']} onChange={onChange} />)
    await user.click(screen.getByText('Gore-Tex Shell'))
    expect(onChange).toHaveBeenCalledWith(['hat-1'])
  })

  it('can select multiple items', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <WornItemsSelector items={[JACKET, HAT]} value={[]} onChange={onChange} />
    )
    await user.click(screen.getByText('Gore-Tex Shell'))
    rerender(
      <WornItemsSelector items={[JACKET, HAT]} value={['jacket-1']} onChange={onChange} />
    )
    await user.click(screen.getByText('Wool Beanie'))
    expect(onChange).toHaveBeenLastCalledWith(['jacket-1', 'hat-1'])
  })

  it('groups items in the correct category order (jackets before hats)', () => {
    render(<WornItemsSelector items={[HAT, JACKET]} value={[]} onChange={vi.fn()} />)
    const headings = screen.getAllByText(/jackets|hats/i)
    // Jackets should appear before Hats in the DOM
    expect(headings[0].textContent?.toLowerCase()).toBe('jackets')
    expect(headings[1].textContent?.toLowerCase()).toBe('hats')
  })
})
