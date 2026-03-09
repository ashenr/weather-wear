export type ComfortRating =
  | 'too-cold'
  | 'slightly-cold'
  | 'just-right'
  | 'slightly-warm'
  | 'too-warm'

export const COMFORT_RATINGS: { value: ComfortRating; label: string }[] = [
  { value: 'too-cold', label: 'Too cold' },
  { value: 'slightly-cold', label: 'Slightly cold' },
  { value: 'just-right', label: 'Just right' },
  { value: 'slightly-warm', label: 'Slightly warm' },
  { value: 'too-warm', label: 'Too warm' },
]

export interface FeedbackEntry {
  id: string
  date: string
  itemsWorn: string[]
  comfortRating: ComfortRating
  conditionType: string | null
  weatherSummary: Record<string, unknown> | null
  note: string | null
}
