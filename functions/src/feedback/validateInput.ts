import {VALID_COMFORT_RATINGS} from './types.js'
import type {ComfortRating, SubmitFeedbackInput} from './types.js'

export function isValidDateStr(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const d = new Date(date + 'T00:00:00Z')
  if (isNaN(d.getTime())) return false
  // Guard against date roll-over (e.g. "2026-02-30" → 2026-03-02)
  return d.toISOString().startsWith(date)
}

/**
 * Returns date-only string in Europe/Oslo timezone.
 * @param {Date} date - the date to convert
 * @return {string} date string in YYYY-MM-DD format
 */
export function toOsloDate(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {timeZone: 'Europe/Oslo'}).format(date)
}

/**
 * Returns number of milliseconds represented by a YYYY-MM-DD date at UTC midnight.
 * @param {string} dateStr - date string in YYYY-MM-DD format
 * @return {number} milliseconds since epoch
 */
function dateMs(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00Z').getTime()
}

export function isNotInFuture(inputDate: string, todayDate: string): boolean {
  return dateMs(inputDate) <= dateMs(todayDate)
}

export function isWithinDaysAgo(inputDate: string, todayDate: string, maxDays: number): boolean {
  const maxMs = maxDays * 24 * 60 * 60 * 1000
  return dateMs(todayDate) - dateMs(inputDate) <= maxMs
}

export function isValidComfortRating(rating: unknown): rating is ComfortRating {
  return typeof rating === 'string' && VALID_COMFORT_RATINGS.includes(rating as ComfortRating)
}

export interface ValidationError {
  field: string
  message: string
}

/**
 * Validates the raw input fields (excluding Firestore ID lookups). Returns the first error found, or null.
 * @param {unknown} data - the raw input data to validate
 * @param {string} todayDate - today's date in YYYY-MM-DD format
 * @return {ValidationError|null} first validation error, or null if valid
 */
export function validateFeedbackInput(
  data: unknown,
  todayDate: string
): ValidationError | null {
  if (typeof data !== 'object' || data === null) {
    return {field: 'data', message: 'Request data must be an object'}
  }
  const d = data as Partial<SubmitFeedbackInput>

  // date
  if (typeof d.date !== 'string' || !isValidDateStr(d.date)) {
    return {field: 'date', message: 'date must be a valid YYYY-MM-DD string'}
  }
  if (!isNotInFuture(d.date, todayDate)) {
    return {field: 'date', message: 'date must not be in the future'}
  }
  if (!isWithinDaysAgo(d.date, todayDate, 7)) {
    return {field: 'date', message: 'date must be within the last 7 days'}
  }

  // itemsWorn
  if (!Array.isArray(d.itemsWorn) || d.itemsWorn.length === 0) {
    return {field: 'itemsWorn', message: 'itemsWorn must be a non-empty array'}
  }
  if (d.itemsWorn.some((id) => typeof id !== 'string' || !id)) {
    return {field: 'itemsWorn', message: 'itemsWorn must contain valid item IDs'}
  }

  // comfortRating
  if (!isValidComfortRating(d.comfortRating)) {
    return {
      field: 'comfortRating',
      message: `comfortRating must be one of: ${VALID_COMFORT_RATINGS.join(', ')}`,
    }
  }

  // note
  if (d.note !== undefined && d.note !== null) {
    if (typeof d.note !== 'string') {
      return {field: 'note', message: 'note must be a string'}
    }
    if (d.note.length > 500) {
      return {field: 'note', message: 'note must be at most 500 characters'}
    }
  }

  return null
}
