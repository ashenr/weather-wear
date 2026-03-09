import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/test-utils'
import { SuggestionCard } from './SuggestionCard'
import type { DailySuggestion } from '../types/suggestion'

function makeSuggestion(overrides: Partial<DailySuggestion['suggestion']> = {}): DailySuggestion {
  return {
    date: '2026-03-09',
    conditionType: 'dry-cold',
    forecast: {
      periods: [],
      summary: {
        minTemp: -3,
        maxTemp: 2,
        totalPrecipitation: 0,
        maxWind: 5,
        avgCloudCover: 40,
      },
    },
    suggestion: {
      baseLayer: {
        itemId: 'base-1',
        name: 'Merino Base Layer',
        reasoning: 'Wool keeps you warm when dry.',
      },
      midLayer: {
        itemId: 'mid-1',
        name: 'Fleece Jacket',
        reasoning: 'Extra warmth for the cold morning.',
      },
      outerLayer: {
        itemId: 'outer-1',
        name: 'Gore-Tex Shell',
        reasoning: 'Wind protection for the evening.',
      },
      accessories: [
        { itemId: 'acc-1', name: 'Wool Beanie', reasoning: 'Essential below 0°C.' },
      ],
      overallAdvice: 'Layer up for the cold. The evening will be breezy.',
      ...overrides,
    },
  }
}

describe('SuggestionCard', () => {
  it('renders the overall advice text', () => {
    render(<SuggestionCard suggestion={makeSuggestion()} />)
    expect(screen.getByText('Layer up for the cold. The evening will be breezy.')).toBeInTheDocument()
  })

  it('renders all three layer names', () => {
    render(<SuggestionCard suggestion={makeSuggestion()} />)
    expect(screen.getByText('Merino Base Layer')).toBeInTheDocument()
    expect(screen.getByText('Fleece Jacket')).toBeInTheDocument()
    expect(screen.getByText('Gore-Tex Shell')).toBeInTheDocument()
  })

  it('renders layer reasoning text', () => {
    render(<SuggestionCard suggestion={makeSuggestion()} />)
    expect(screen.getByText('Wool keeps you warm when dry.')).toBeInTheDocument()
  })

  it('renders accessories', () => {
    render(<SuggestionCard suggestion={makeSuggestion()} />)
    expect(screen.getByText('Wool Beanie')).toBeInTheDocument()
    expect(screen.getByText('Essential below 0°C.')).toBeInTheDocument()
  })

  it('does not render a layer section when that layer is null', () => {
    const suggestion = makeSuggestion({ baseLayer: null, midLayer: null })
    render(<SuggestionCard suggestion={suggestion} />)
    expect(screen.queryByText('Merino Base Layer')).not.toBeInTheDocument()
    expect(screen.queryByText('Fleece Jacket')).not.toBeInTheDocument()
    // outerLayer still renders
    expect(screen.getByText('Gore-Tex Shell')).toBeInTheDocument()
  })

  it('does not render Accessories section when accessories is empty', () => {
    render(<SuggestionCard suggestion={makeSuggestion({ accessories: [] })} />)
    expect(screen.queryByText('Accessories')).not.toBeInTheDocument()
  })

  it('shows "General Advice" badge when isFallback is true', () => {
    const suggestion = { ...makeSuggestion(), isFallback: true } as DailySuggestion
    render(<SuggestionCard suggestion={suggestion} />)
    expect(screen.getByText('General Advice')).toBeInTheDocument()
  })

  it('does not show "General Advice" badge when isFallback is false', () => {
    render(<SuggestionCard suggestion={makeSuggestion()} />)
    expect(screen.queryByText('General Advice')).not.toBeInTheDocument()
  })

  it('falls back to itemId when name is not provided', () => {
    const suggestion = makeSuggestion({
      baseLayer: { itemId: 'base-1', reasoning: 'Good layer.' },
    })
    render(<SuggestionCard suggestion={suggestion} />)
    expect(screen.getByText('base-1')).toBeInTheDocument()
  })
})
