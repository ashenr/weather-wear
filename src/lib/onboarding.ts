import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

export interface ExtractedItem {
  name: string | null
  category: string | null
  color: string | null
  material: string | null
  brand: string | null
  warmthLevel: number | null
  waterproof: string | null
  windproof: boolean | null
  temperatureRange: { min: number; max: number } | null
  photoUrl: string | null
  sourceUrl: string
  extractedByAI: true
}

export async function crawlProductUrl(url: string): Promise<ExtractedItem> {
  const fn = httpsCallable<{ url: string }, ExtractedItem>(functions, 'crawlProductUrl')
  const result = await fn({ url })
  return result.data
}
