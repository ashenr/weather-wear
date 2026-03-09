import type { Timestamp } from 'firebase/firestore'

export type WardrobeCategory =
  | 'jacket'
  | 'sweater'
  | 'fleece'
  | 'base-layer'
  | 'trousers'
  | 'hat'
  | 'gloves'
  | 'scarf'
  | 'other'

export type WarmthLevel = 1 | 2 | 3 | 4 | 5

export type WaterproofLevel = 'yes' | 'no' | 'water-resistant'

export interface WardrobeItem {
  id?: string
  name: string
  category: WardrobeCategory
  color: string
  material: string
  brand: string
  warmthLevel: WarmthLevel
  waterproof: WaterproofLevel
  windproof: boolean
  temperatureRange: { min: number; max: number }
  photoUrl: string
  sourceUrl: string
  notes: string
  extractedByAI: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type WardrobeItemInput = Omit<WardrobeItem, 'id' | 'createdAt' | 'updatedAt'>
