import type { PeriodData, DailySummary } from '../weather/types.js'

export interface WardrobeItemDoc {
  id: string
  name: string
  category: string
  color?: string
  material?: string
  brand?: string
  warmthLevel?: number
  waterproof?: string
  windproof?: boolean
  temperatureRange?: { min: number; max: number }
  notes?: string
}

export interface FeedbackDoc {
  date: string
  itemsWorn: string[]
  comfortRating: string
  conditionType: string
  weatherSummary?: Record<string, unknown>
  note?: string
}

export interface SuggestionLayer {
  itemId: string
  name?: string
  reasoning: string
}

export interface SuggestionData {
  baseLayer: SuggestionLayer | null
  midLayer: SuggestionLayer | null
  outerLayer: SuggestionLayer | null
  accessories: SuggestionLayer[]
  overallAdvice: string
}

export interface SuggestionDoc {
  date: string
  generatedAt: string
  conditionType: string
  forecast: {
    periods: PeriodData[]
    summary: DailySummary
  }
  suggestion: SuggestionData
  rawGeminiResponse?: string
  isFallback?: boolean
}
