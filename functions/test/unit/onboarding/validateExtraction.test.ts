import {describe, it, expect} from 'vitest'
import {validateAndCoerce} from '../../../src/onboarding/extractionPrompt.js'

const SOURCE_URL = 'https://example.com/product'

function validRaw(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Norrøna Falketind Gore-Tex Jacket',
    category: 'jacket',
    color: 'blue',
    material: 'Gore-Tex 3-layer',
    brand: 'Norrøna',
    warmthLevel: 3,
    waterproof: 'yes',
    windproof: true,
    temperatureRange: {min: -10, max: 10},
    photoUrl: 'https://example.com/jacket.jpg',
    ...overrides,
  }
}

// ── valid input passes through ─────────────────────────────────────────────────

describe('validateAndCoerce — valid input', () => {
  it('passes all valid fields through unchanged', () => {
    const result = validateAndCoerce(validRaw(), SOURCE_URL)
    expect(result.name).toBe('Norrøna Falketind Gore-Tex Jacket')
    expect(result.category).toBe('jacket')
    expect(result.color).toBe('blue')
    expect(result.material).toBe('Gore-Tex 3-layer')
    expect(result.brand).toBe('Norrøna')
    expect(result.warmthLevel).toBe(3)
    expect(result.waterproof).toBe('yes')
    expect(result.windproof).toBe(true)
    expect(result.temperatureRange).toEqual({min: -10, max: 10})
    expect(result.photoUrl).toBe('https://example.com/jacket.jpg')
  })

  it('always sets sourceUrl from the argument', () => {
    const result = validateAndCoerce(validRaw(), SOURCE_URL)
    expect(result.sourceUrl).toBe(SOURCE_URL)
  })

  it('always sets extractedByAI to true', () => {
    const result = validateAndCoerce(validRaw(), SOURCE_URL)
    expect(result.extractedByAI).toBe(true)
  })

  it('accepts all valid category values', () => {
    const categories = ['jacket', 'sweater', 'fleece', 'base-layer', 'trousers', 'hat', 'gloves', 'scarf', 'other']
    for (const cat of categories) {
      const result = validateAndCoerce(validRaw({category: cat}), SOURCE_URL)
      expect(result.category).toBe(cat)
    }
  })

  it('accepts all valid waterproof values', () => {
    for (const level of ['yes', 'no', 'water-resistant']) {
      const result = validateAndCoerce(validRaw({waterproof: level}), SOURCE_URL)
      expect(result.waterproof).toBe(level)
    }
  })
})

// ── category coercion ─────────────────────────────────────────────────────────

describe('validateAndCoerce — category coercion', () => {
  it('coerces unknown category string to "other"', () => {
    const result = validateAndCoerce(validRaw({category: 'raincoat'}), SOURCE_URL)
    expect(result.category).toBe('other')
  })

  it('coerces null category to "other"', () => {
    const result = validateAndCoerce(validRaw({category: null}), SOURCE_URL)
    expect(result.category).toBe('other')
  })

  it('coerces missing category to "other"', () => {
    const {category: _, ...noCategory} = validRaw()
    const result = validateAndCoerce(noCategory, SOURCE_URL)
    expect(result.category).toBe('other')
  })
})

// ── warmthLevel validation ────────────────────────────────────────────────────

describe('validateAndCoerce — warmthLevel', () => {
  it('rounds a float warmthLevel to the nearest integer', () => {
    expect(validateAndCoerce(validRaw({warmthLevel: 2.7}), SOURCE_URL).warmthLevel).toBe(3)
    expect(validateAndCoerce(validRaw({warmthLevel: 1.2}), SOURCE_URL).warmthLevel).toBe(1)
  })

  it('sets warmthLevel to null when below 1', () => {
    expect(validateAndCoerce(validRaw({warmthLevel: 0}), SOURCE_URL).warmthLevel).toBeNull()
  })

  it('sets warmthLevel to null when above 5', () => {
    expect(validateAndCoerce(validRaw({warmthLevel: 6}), SOURCE_URL).warmthLevel).toBeNull()
  })

  it('sets warmthLevel to null when it is not a number', () => {
    expect(validateAndCoerce(validRaw({warmthLevel: 'warm'}), SOURCE_URL).warmthLevel).toBeNull()
    expect(validateAndCoerce(validRaw({warmthLevel: null}), SOURCE_URL).warmthLevel).toBeNull()
  })
})

// ── waterproof validation ─────────────────────────────────────────────────────

describe('validateAndCoerce — waterproof', () => {
  it('sets waterproof to null for unknown values', () => {
    expect(validateAndCoerce(validRaw({waterproof: 'splash-resistant'}), SOURCE_URL).waterproof).toBeNull()
    expect(validateAndCoerce(validRaw({waterproof: null}), SOURCE_URL).waterproof).toBeNull()
  })
})

// ── temperatureRange validation ───────────────────────────────────────────────

describe('validateAndCoerce — temperatureRange', () => {
  it('sets temperatureRange to null when min or max is missing', () => {
    expect(validateAndCoerce(validRaw({temperatureRange: {min: -5}}), SOURCE_URL).temperatureRange).toBeNull()
    expect(validateAndCoerce(validRaw({temperatureRange: {max: 10}}), SOURCE_URL).temperatureRange).toBeNull()
  })

  it('sets temperatureRange to null for non-object values', () => {
    expect(validateAndCoerce(validRaw({temperatureRange: '-10 to 10'}), SOURCE_URL).temperatureRange).toBeNull()
    expect(validateAndCoerce(validRaw({temperatureRange: null}), SOURCE_URL).temperatureRange).toBeNull()
  })
})

// ── photoUrl validation ───────────────────────────────────────────────────────

describe('validateAndCoerce — photoUrl', () => {
  it('sets photoUrl to null for empty string', () => {
    expect(validateAndCoerce(validRaw({photoUrl: ''}), SOURCE_URL).photoUrl).toBeNull()
  })

  it('sets photoUrl to null for non-string values', () => {
    expect(validateAndCoerce(validRaw({photoUrl: null}), SOURCE_URL).photoUrl).toBeNull()
    expect(validateAndCoerce(validRaw({photoUrl: 42}), SOURCE_URL).photoUrl).toBeNull()
  })

  it('passes through a relative photoUrl unchanged (resolution happens in crawlProductUrl)', () => {
    const result = validateAndCoerce(validRaw({photoUrl: '/images/jacket.jpg'}), SOURCE_URL)
    expect(result.photoUrl).toBe('/images/jacket.jpg')
  })
})

// ── null passthrough ──────────────────────────────────────────────────────────

describe('validateAndCoerce — null fields', () => {
  it('returns null for name when not a string', () => {
    expect(validateAndCoerce(validRaw({name: null}), SOURCE_URL).name).toBeNull()
    expect(validateAndCoerce(validRaw({name: 42}), SOURCE_URL).name).toBeNull()
  })

  it('returns null for windproof when not a boolean', () => {
    expect(validateAndCoerce(validRaw({windproof: 'yes'}), SOURCE_URL).windproof).toBeNull()
    expect(validateAndCoerce(validRaw({windproof: 1}), SOURCE_URL).windproof).toBeNull()
  })

  it('ignores unknown extra fields from Gemini response', () => {
    const result = validateAndCoerce(validRaw({unexpectedField: 'value', anotherField: 123}), SOURCE_URL)
    expect(result.name).toBe('Norrøna Falketind Gore-Tex Jacket')
    expect((result as Record<string, unknown>)['unexpectedField']).toBeUndefined()
  })
})
