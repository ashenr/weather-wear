import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import { ComfortRatingSelector } from './ComfortRatingSelector'
import type { ComfortRating } from '../../types/feedback'

describe('ComfortRatingSelector', () => {
  it('renders all five rating options', () => {
    render(<ComfortRatingSelector value={null} onChange={vi.fn()} />)
    expect(screen.getByText('Too cold')).toBeInTheDocument()
    expect(screen.getByText('Slightly cold')).toBeInTheDocument()
    expect(screen.getByText('Just right')).toBeInTheDocument()
    expect(screen.getByText('Slightly warm')).toBeInTheDocument()
    expect(screen.getByText('Too warm')).toBeInTheDocument()
  })

  it('calls onChange with the selected rating when clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ComfortRatingSelector value={null} onChange={onChange} />)
    await user.click(screen.getByText('Just right'))
    expect(onChange).toHaveBeenCalledWith('just-right' satisfies ComfortRating)
  })

  it('calls onChange with too-cold when Too cold is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ComfortRatingSelector value={null} onChange={onChange} />)
    await user.click(screen.getByText('Too cold'))
    expect(onChange).toHaveBeenCalledWith('too-cold' satisfies ComfortRating)
  })

  it('calls onChange with too-warm when Too warm is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ComfortRatingSelector value={null} onChange={onChange} />)
    await user.click(screen.getByText('Too warm'))
    expect(onChange).toHaveBeenCalledWith('too-warm' satisfies ComfortRating)
  })

  it('does not call onChange again when already-selected option is re-clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ComfortRatingSelector value={'just-right'} onChange={onChange} />)
    await user.click(screen.getByText('Just right'))
    // RadioCard does not deselect an already-selected value — onChange should not fire again
    expect(onChange).not.toHaveBeenCalled()
  })
})
