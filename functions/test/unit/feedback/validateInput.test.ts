import {describe, it, expect} from 'vitest'
import {
  isValidDateStr,
  isNotInFuture,
  isWithinDaysAgo,
  isValidComfortRating,
  validateFeedbackInput,
} from '../../../src/feedback/validateInput.js'

// ── isValidDateStr ─────────────────────────────────────────────────────────────

describe('isValidDateStr', () => {
  it('accepts a valid date string', () => {
    expect(isValidDateStr('2026-03-09')).toBe(true)
  })

  it('accepts the start of year', () => {
    expect(isValidDateStr('2026-01-01')).toBe(true)
  })

  it('accepts the end of year', () => {
    expect(isValidDateStr('2026-12-31')).toBe(true)
  })

  it('rejects an invalid day (Feb 30)', () => {
    expect(isValidDateStr('2026-02-30')).toBe(false)
  })

  it('rejects wrong format with slashes', () => {
    expect(isValidDateStr('2026/03/09')).toBe(false)
  })

  it('rejects a partial date', () => {
    expect(isValidDateStr('2026-03')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidDateStr('')).toBe(false)
  })

  it('rejects non-date string', () => {
    expect(isValidDateStr('not-a-date')).toBe(false)
  })

  it('rejects incorrect separator placement', () => {
    expect(isValidDateStr('20260309')).toBe(false)
  })
})

// ── isNotInFuture ──────────────────────────────────────────────────────────────

describe('isNotInFuture', () => {
  const today = '2026-03-09'

  it('accepts today', () => {
    expect(isNotInFuture('2026-03-09', today)).toBe(true)
  })

  it('accepts yesterday', () => {
    expect(isNotInFuture('2026-03-08', today)).toBe(true)
  })

  it('accepts 7 days ago', () => {
    expect(isNotInFuture('2026-03-02', today)).toBe(true)
  })

  it('rejects tomorrow', () => {
    expect(isNotInFuture('2026-03-10', today)).toBe(false)
  })

  it('rejects a far future date', () => {
    expect(isNotInFuture('2027-01-01', today)).toBe(false)
  })
})

// ── isWithinDaysAgo ────────────────────────────────────────────────────────────

describe('isWithinDaysAgo', () => {
  const today = '2026-03-09'

  it('accepts today (0 days ago)', () => {
    expect(isWithinDaysAgo('2026-03-09', today, 7)).toBe(true)
  })

  it('accepts exactly 7 days ago', () => {
    expect(isWithinDaysAgo('2026-03-02', today, 7)).toBe(true)
  })

  it('rejects 8 days ago', () => {
    expect(isWithinDaysAgo('2026-03-01', today, 7)).toBe(false)
  })

  it('rejects a date from last month', () => {
    expect(isWithinDaysAgo('2026-02-01', today, 7)).toBe(false)
  })

  it('uses the provided maxDays parameter', () => {
    expect(isWithinDaysAgo('2026-03-07', today, 2)).toBe(true)
    expect(isWithinDaysAgo('2026-03-06', today, 2)).toBe(false)
  })
})

// ── isValidComfortRating ───────────────────────────────────────────────────────

describe('isValidComfortRating', () => {
  it('accepts all five valid ratings', () => {
    expect(isValidComfortRating('too-cold')).toBe(true)
    expect(isValidComfortRating('slightly-cold')).toBe(true)
    expect(isValidComfortRating('just-right')).toBe(true)
    expect(isValidComfortRating('slightly-warm')).toBe(true)
    expect(isValidComfortRating('too-warm')).toBe(true)
  })

  it('rejects an unknown string', () => {
    expect(isValidComfortRating('cold')).toBe(false)
    expect(isValidComfortRating('warm')).toBe(false)
    expect(isValidComfortRating('ok')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidComfortRating('')).toBe(false)
  })

  it('rejects non-string types', () => {
    expect(isValidComfortRating(null)).toBe(false)
    expect(isValidComfortRating(undefined)).toBe(false)
    expect(isValidComfortRating(3)).toBe(false)
  })
})

// ── validateFeedbackInput ──────────────────────────────────────────────────────

const TODAY = '2026-03-09'

function validInput(overrides = {}): unknown {
  return {
    date: '2026-03-09',
    itemsWorn: ['jacket-1'],
    comfortRating: 'just-right',
    ...overrides,
  }
}

describe('validateFeedbackInput', () => {
  it('returns null for a fully valid input', () => {
    expect(validateFeedbackInput(validInput(), TODAY)).toBeNull()
  })

  it('returns null when note is omitted', () => {
    expect(validateFeedbackInput(validInput(), TODAY)).toBeNull()
  })

  it('returns null when note is a short string', () => {
    expect(validateFeedbackInput(validInput({note: 'cold wind'}), TODAY)).toBeNull()
  })

  it('returns null for a valid date 7 days ago', () => {
    const result = validateFeedbackInput(validInput({date: '2026-03-02'}), TODAY)
    expect(result).toBeNull()
  })

  // --- data type ---
  it('returns error when data is not an object', () => {
    expect(validateFeedbackInput('bad', TODAY)).not.toBeNull()
    expect(validateFeedbackInput(null, TODAY)).not.toBeNull()
    expect(validateFeedbackInput(42, TODAY)?.field).toBe('data')
  })

  // --- date field ---
  it('returns date error when date is missing', () => {
    const result = validateFeedbackInput(validInput({date: undefined}), TODAY)
    expect(result?.field).toBe('date')
  })

  it('returns date error when date format is wrong', () => {
    const result = validateFeedbackInput(validInput({date: '09-03-2026'}), TODAY)
    expect(result?.field).toBe('date')
  })

  it('returns date error when date is in the future', () => {
    const result = validateFeedbackInput(validInput({date: '2026-03-10'}), TODAY)
    expect(result?.field).toBe('date')
    expect(result?.message).toContain('future')
  })

  it('returns date error when date is more than 7 days ago', () => {
    const result = validateFeedbackInput(validInput({date: '2026-03-01'}), TODAY)
    expect(result?.field).toBe('date')
    expect(result?.message).toContain('7 days')
  })

  // --- itemsWorn ---
  it('returns itemsWorn error when array is empty', () => {
    const result = validateFeedbackInput(validInput({itemsWorn: []}), TODAY)
    expect(result?.field).toBe('itemsWorn')
    expect(result?.message).toContain('non-empty')
  })

  it('returns itemsWorn error when array is missing', () => {
    const result = validateFeedbackInput(validInput({itemsWorn: undefined}), TODAY)
    expect(result?.field).toBe('itemsWorn')
  })

  it('returns itemsWorn error when an ID is an empty string', () => {
    const result = validateFeedbackInput(validInput({itemsWorn: ['valid-id', '']}), TODAY)
    expect(result?.field).toBe('itemsWorn')
  })

  it('returns itemsWorn error when an ID is not a string', () => {
    const result = validateFeedbackInput(validInput({itemsWorn: [42]}), TODAY)
    expect(result?.field).toBe('itemsWorn')
  })

  // --- comfortRating ---
  it('returns comfortRating error for an invalid rating', () => {
    const result = validateFeedbackInput(validInput({comfortRating: 'warm'}), TODAY)
    expect(result?.field).toBe('comfortRating')
    expect(result?.message).toContain('too-cold')
  })

  it('returns comfortRating error when missing', () => {
    const result = validateFeedbackInput(validInput({comfortRating: undefined}), TODAY)
    expect(result?.field).toBe('comfortRating')
  })

  // --- note ---
  it('returns note error when note exceeds 500 characters', () => {
    const result = validateFeedbackInput(validInput({note: 'x'.repeat(501)}), TODAY)
    expect(result?.field).toBe('note')
    expect(result?.message).toContain('500')
  })

  it('accepts note of exactly 500 characters', () => {
    const result = validateFeedbackInput(validInput({note: 'x'.repeat(500)}), TODAY)
    expect(result).toBeNull()
  })

  it('returns note error when note is not a string', () => {
    const result = validateFeedbackInput(validInput({note: 12345}), TODAY)
    expect(result?.field).toBe('note')
  })

  it('accepts null note', () => {
    const result = validateFeedbackInput(validInput({note: null}), TODAY)
    expect(result).toBeNull()
  })
})
