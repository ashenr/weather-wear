import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '../../test/test-utils'
import { ItemForm } from './ItemForm'

const noop = vi.fn()

describe('ItemForm', () => {
  it('renders name input and submit button', () => {
    render(<ItemForm onSubmit={noop} isLoading={false} />)
    expect(screen.getByPlaceholderText(/Norrøna Gore-Tex/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('shows name error when submitting with empty name', async () => {
    const user = userEvent.setup()
    render(<ItemForm onSubmit={noop} isLoading={false} />)
    await user.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(screen.getByText('Name is required')).toBeInTheDocument())
  })

  it('does not call onSubmit when name is empty', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ItemForm onSubmit={onSubmit} isLoading={false} />)
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('clears name error after typing in the name field', async () => {
    const user = userEvent.setup()
    render(<ItemForm onSubmit={noop} isLoading={false} />)
    await user.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(screen.getByText('Name is required')).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText(/Norrøna Gore-Tex/), 'a')
    await waitFor(() => expect(screen.queryByText('Name is required')).not.toBeInTheDocument())
  })

  it('calls onSubmit with correct values when form is valid', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<ItemForm onSubmit={onSubmit} isLoading={false} />)
    await user.type(screen.getByPlaceholderText(/Norrøna Gore-Tex/), 'My Jacket')
    await user.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Jacket', category: 'jacket' })
      )
    })
  })

  it('pre-populates name from defaultValues', () => {
    render(
      <ItemForm
        onSubmit={noop}
        isLoading={false}
        defaultValues={{ name: 'Gore-Tex Shell' }}
      />
    )
    expect(screen.getByDisplayValue('Gore-Tex Shell')).toBeInTheDocument()
  })

  it('pre-populates optional fields from defaultValues', () => {
    render(
      <ItemForm
        onSubmit={noop}
        isLoading={false}
        defaultValues={{
          name: 'Test Jacket',
          brand: 'Norrona',
          color: 'Black',
          material: 'Gore-Tex',
          notes: 'Great jacket',
        }}
      />
    )
    expect(screen.getByDisplayValue('Norrona')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Black')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Gore-Tex')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Great jacket')).toBeInTheDocument()
  })

  it('renders custom submitLabel', () => {
    render(<ItemForm onSubmit={noop} isLoading={false} submitLabel="Update Item" />)
    expect(screen.getByRole('button', { name: /update item/i })).toBeInTheDocument()
  })
})
