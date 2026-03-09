import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'
import type { DailySuggestion } from '../types/suggestion'

export async function getDailySuggestion(): Promise<DailySuggestion> {
  const fn = httpsCallable<Record<string, never>, DailySuggestion>(
    functions,
    'getDailySuggestion'
  )
  const result = await fn({})
  return result.data
}
