import type {DailySummary, PeriodData, ConditionType} from './types.js'

export interface ClassificationResult {
  conditionType: ConditionType;
  windWarning: boolean;
}

export function classifyCondition(
  summary: DailySummary,
  periods: PeriodData[]
): ClassificationResult {
  const {minTemp, maxTemp, totalPrecipitation, maxWind} = summary
  const avgHumidity =
    periods.reduce((sum, p) => sum + p.humidity, 0) / (periods.length || 1)

  let conditionType: ConditionType

  if (maxTemp > 20) {
    conditionType = 'warm'
  } else if (minTemp >= 10 && totalPrecipitation < 1) {
    conditionType = 'dry-mild'
  } else if (minTemp >= 5 && minTemp < 10 && totalPrecipitation < 1) {
    conditionType = 'dry-cool'
  } else if (minTemp < 5 && maxWind > 8) {
    conditionType = 'windy-cold'
  } else if (minTemp >= 0 && minTemp < 5 && totalPrecipitation >= 2) {
    conditionType = 'wet-slush'
  } else if (
    minTemp >= -5 &&
    minTemp < 0 &&
    totalPrecipitation >= 1 &&
    avgHumidity > 80
  ) {
    conditionType = 'wet-cold'
  } else if (minTemp >= 5 && minTemp < 15 && totalPrecipitation > 0) {
    conditionType = 'mild-damp'
  } else if (minTemp < 0 && totalPrecipitation < 1) {
    conditionType = 'dry-cold'
  } else {
    conditionType = 'mild-damp'
  }

  return {
    conditionType,
    windWarning: maxWind > 8,
  }
}
