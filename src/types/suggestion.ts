import type { PeriodData, DailySummary, ConditionType } from './weather'

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

export interface DailySuggestion {
  date: string
  conditionType: ConditionType
  forecast: {
    periods: PeriodData[]
    summary: DailySummary
  }
  suggestion: SuggestionData
  isFallback?: boolean
}
