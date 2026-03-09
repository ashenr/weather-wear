import {describe, it, expect} from 'vitest'
import {deriveComfortTendency, buildSuggestionPrompt} from '../../../src/suggestion/buildPrompt.js'
import {makeSummary, makePeriod} from '../../helpers/factories.js'
import type {FeedbackDoc, WardrobeItemDoc} from '../../../src/suggestion/types.js'

function makeFeedback(rating: string, overrides: Partial<FeedbackDoc> = {}): FeedbackDoc {
  return {
    date: '2026-03-01',
    itemsWorn: ['jacket-1'],
    comfortRating: rating,
    conditionType: 'dry-cold',
    ...overrides,
  }
}

function makeWardrobeItem(overrides: Partial<WardrobeItemDoc> = {}): WardrobeItemDoc {
  return {
    id: 'jacket-1',
    name: 'Gore-Tex Jacket',
    category: 'jacket',
    warmthLevel: 4,
    waterproof: 'yes',
    windproof: true,
    temperatureRange: {min: -10, max: 5},
    material: 'Gore-Tex',
    ...overrides,
  }
}

function makeWeather(overrides = {}) {
  return {
    periods: [
      makePeriod({name: 'morning', temp: -2, feelsLike: -6, precipitation: 0, wind: 5}),
      makePeriod({name: 'daytime', temp: 1, feelsLike: -2, precipitation: 0.5, wind: 4}),
    ],
    summary: makeSummary({minTemp: -2, maxTemp: 1, totalPrecipitation: 0.5, maxWind: 5}),
    conditionType: 'dry-cold' as const,
    windWarning: false,
    ...overrides,
  }
}

// ── deriveComfortTendency ──────────────────────────────────────────────────────

describe('deriveComfortTendency', () => {
  it('returns adapting phrase when no feedback exists', () => {
    expect(deriveComfortTendency([])).toBe('are still adapting to Nordic weather')
  })

  it('returns cold tendency when mostly too-cold and slightly-cold', () => {
    const feedback = [
      makeFeedback('too-cold'),
      makeFeedback('slightly-cold'),
      makeFeedback('slightly-cold'),
      makeFeedback('just-right'),
    ]
    expect(deriveComfortTendency(feedback)).toBe('feel the cold more than average')
  })

  it('returns warm tendency when mostly too-warm and slightly-warm', () => {
    const feedback = [
      makeFeedback('too-warm'),
      makeFeedback('slightly-warm'),
      makeFeedback('slightly-warm'),
    ]
    expect(deriveComfortTendency(feedback)).toBe('tend to run warm')
  })

  it('returns balanced when mostly just-right', () => {
    const feedback = [
      makeFeedback('just-right'),
      makeFeedback('just-right'),
      makeFeedback('just-right'),
      makeFeedback('slightly-cold'),
    ]
    expect(deriveComfortTendency(feedback)).toBe('have well-calibrated cold tolerance')
  })

  it('returns balanced when cold and warm counts tie', () => {
    const feedback = [makeFeedback('too-cold'), makeFeedback('too-warm')]
    expect(deriveComfortTendency(feedback)).toBe('have well-calibrated cold tolerance')
  })

  it('works with a single feedback entry', () => {
    expect(deriveComfortTendency([makeFeedback('too-cold')])).toBe('feel the cold more than average')
    expect(deriveComfortTendency([makeFeedback('too-warm')])).toBe('tend to run warm')
  })
})

// ── buildSuggestionPrompt ─────────────────────────────────────────────────────

describe('buildSuggestionPrompt', () => {
  const wardrobe = [makeWardrobeItem()]
  const weather = makeWeather()

  it('includes the condition type display name', () => {
    const prompt = buildSuggestionPrompt(weather, wardrobe, [])
    expect(prompt).toContain('Dry Cold')
  })

  it('includes wind warning note when windWarning is true', () => {
    const prompt = buildSuggestionPrompt({...weather, windWarning: true}, wardrobe, [])
    expect(prompt).toContain('WIND WARNING')
  })

  it('does not include wind warning when windWarning is false', () => {
    const prompt = buildSuggestionPrompt(weather, wardrobe, [])
    expect(prompt).not.toContain('WIND WARNING')
  })

  it('includes wardrobe item id in the prompt', () => {
    const prompt = buildSuggestionPrompt(weather, wardrobe, [])
    expect(prompt).toContain('"id":"jacket-1"')
  })

  it('shows no-feedback message when feedback is empty', () => {
    const prompt = buildSuggestionPrompt(weather, wardrobe, [])
    expect(prompt).toContain('No feedback history yet.')
  })

  it('includes feedback entries when feedback exists', () => {
    const feedback = [
      makeFeedback('too-cold', {date: '2026-03-01', conditionType: 'dry-cold'}),
    ]
    const prompt = buildSuggestionPrompt(weather, wardrobe, feedback)
    expect(prompt).toContain('2026-03-01')
    expect(prompt).toContain('too-cold')
  })

  it('includes feedback note when present', () => {
    const feedback = [makeFeedback('slightly-cold', {note: 'wind picked up'})]
    const prompt = buildSuggestionPrompt(weather, wardrobe, feedback)
    expect(prompt).toContain('wind picked up')
  })

  it('shows No data for missing periods', () => {
    const weatherNoPeriods = {...weather, periods: []}
    const prompt = buildSuggestionPrompt(weatherNoPeriods, wardrobe, [])
    expect(prompt).toContain('No data')
  })

  it('includes summary temperature range', () => {
    const prompt = buildSuggestionPrompt(weather, wardrobe, [])
    expect(prompt).toContain('-2°C to 1°C')
  })

  it('sets comfort tendency from feedback in the prompt preamble', () => {
    const coldFeedback = [
      makeFeedback('too-cold'),
      makeFeedback('too-cold'),
      makeFeedback('slightly-cold'),
    ]
    const prompt = buildSuggestionPrompt(weather, wardrobe, coldFeedback)
    expect(prompt).toContain('feel the cold more than average')
  })
})
