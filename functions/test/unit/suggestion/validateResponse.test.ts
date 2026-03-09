import {describe, it, expect} from 'vitest'
import {parseAndValidate, validateLayer} from '../../../src/suggestion/validateResponse.js'

const IDS = new Set(['jacket-1', 'fleece-2', 'hat-3'])

function validResponse(overrides = {}) {
  return {
    baseLayer: {itemId: 'jacket-1', name: 'Gore-Tex Jacket', reasoning: 'Waterproof for the rain'},
    midLayer: {itemId: 'fleece-2', name: 'Fleece', reasoning: 'Extra warmth in the morning'},
    outerLayer: null,
    accessories: [{itemId: 'hat-3', name: 'Wool Hat', reasoning: 'Cold morning'}],
    overallAdvice: 'Wear the jacket and fleece. Take the hat for the cold morning.',
    ...overrides,
  }
}

// ── validateLayer ─────────────────────────────────────────────────────────────

describe('validateLayer', () => {
  it('returns null for null input', () => {
    expect(validateLayer(null, IDS)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(validateLayer(undefined, IDS)).toBeNull()
  })

  it('returns null for non-object input', () => {
    expect(validateLayer('jacket-1', IDS)).toBeNull()
    expect(validateLayer(42, IDS)).toBeNull()
  })

  it('returns null when itemId is not in wardrobeIds', () => {
    expect(validateLayer({itemId: 'not-in-wardrobe', reasoning: 'x'}, IDS)).toBeNull()
  })

  it('returns null when itemId is missing', () => {
    expect(validateLayer({name: 'Jacket', reasoning: 'x'}, IDS)).toBeNull()
  })

  it('returns a valid SuggestionLayer when itemId exists', () => {
    const result = validateLayer({itemId: 'jacket-1', name: 'Gore-Tex', reasoning: 'Waterproof'}, IDS)
    expect(result).toEqual({itemId: 'jacket-1', name: 'Gore-Tex', reasoning: 'Waterproof'})
  })

  it('omits name when it is not a string', () => {
    const result = validateLayer({itemId: 'jacket-1', name: 42, reasoning: 'Good'}, IDS)
    expect(result?.name).toBeUndefined()
  })

  it('defaults reasoning to empty string when missing', () => {
    const result = validateLayer({itemId: 'jacket-1'}, IDS)
    expect(result?.reasoning).toBe('')
  })
})

// ── parseAndValidate ──────────────────────────────────────────────────────────

describe('parseAndValidate', () => {
  it('accepts a fully valid response', () => {
    const result = parseAndValidate(validResponse(), IDS)
    expect(result.overallAdvice).toBe('Wear the jacket and fleece. Take the hat for the cold morning.')
    expect(result.baseLayer?.itemId).toBe('jacket-1')
    expect(result.midLayer?.itemId).toBe('fleece-2')
    expect(result.accessories).toHaveLength(1)
    expect(result.accessories[0].itemId).toBe('hat-3')
  })

  it('throws when input is not an object', () => {
    expect(() => parseAndValidate('not an object', IDS)).toThrow('Response is not an object')
    expect(() => parseAndValidate(null, IDS)).toThrow('Response is not an object')
    expect(() => parseAndValidate(42, IDS)).toThrow('Response is not an object')
  })

  it('throws when overallAdvice is missing', () => {
    const {overallAdvice: _, ...noAdvice} = validResponse()
    expect(() => parseAndValidate(noAdvice, IDS)).toThrow('Missing overallAdvice')
  })

  it('throws when overallAdvice is empty string', () => {
    expect(() => parseAndValidate(validResponse({overallAdvice: ''}), IDS)).toThrow('Missing overallAdvice')
  })

  it('sets layer to null when itemId is not in wardrobe', () => {
    const result = parseAndValidate(
      validResponse({baseLayer: {itemId: 'unknown-id', name: 'Ghost Jacket', reasoning: 'x'}}),
      IDS
    )
    expect(result.baseLayer).toBeNull()
  })

  it('accepts null layers', () => {
    const result = parseAndValidate(
      validResponse({baseLayer: null, midLayer: null, outerLayer: null}),
      IDS
    )
    expect(result.baseLayer).toBeNull()
    expect(result.midLayer).toBeNull()
    expect(result.outerLayer).toBeNull()
  })

  it('filters out accessories with invalid itemIds', () => {
    const result = parseAndValidate(
      validResponse({
        accessories: [
          {itemId: 'hat-3', name: 'Hat', reasoning: 'Cold'},
          {itemId: 'bad-id', name: 'Unknown', reasoning: 'x'},
        ],
      }),
      IDS
    )
    expect(result.accessories).toHaveLength(1)
    expect(result.accessories[0].itemId).toBe('hat-3')
  })

  it('returns empty accessories when field is not an array', () => {
    const result = parseAndValidate(validResponse({accessories: null}), IDS)
    expect(result.accessories).toEqual([])
  })

  it('returns empty accessories when field is missing', () => {
    const r = validResponse()
    delete (r as Record<string, unknown>)['accessories']
    const result = parseAndValidate(r, IDS)
    expect(result.accessories).toEqual([])
  })

  it('ignores unknown extra fields in the response', () => {
    const result = parseAndValidate(validResponse({unexpectedField: 'ignored'}), IDS)
    expect(result.overallAdvice).toBeTruthy()
  })
})
