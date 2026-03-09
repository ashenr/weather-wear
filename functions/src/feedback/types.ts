import type {Timestamp} from 'firebase-admin/firestore'

export type ComfortRating = 'too-cold' | 'slightly-cold' | 'just-right' | 'slightly-warm' | 'too-warm'

export const VALID_COMFORT_RATINGS: ComfortRating[] = [
  'too-cold',
  'slightly-cold',
  'just-right',
  'slightly-warm',
  'too-warm',
]

export interface SubmitFeedbackInput {
  date: string
  itemsWorn: string[]
  comfortRating: ComfortRating
  note?: string
}

export interface FeedbackSubmitDoc {
  date: string
  submittedAt: Timestamp
  itemsWorn: string[]
  comfortRating: ComfortRating
  conditionType: string | null
  weatherSummary: Record<string, unknown> | null
  note: string | null
}
