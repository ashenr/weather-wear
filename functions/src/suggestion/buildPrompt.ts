import type {ConditionType, PeriodData, DailySummary} from '../weather/types.js'
import type {WardrobeItemDoc, FeedbackDoc} from './types.js'

interface WeatherInput {
  periods: PeriodData[]
  summary: DailySummary
  conditionType: ConditionType
  windWarning: boolean
}

const CONDITION_DISPLAY: Record<ConditionType, string> = {
  warm: 'Warm',
  'dry-mild': 'Dry Mild',
  'dry-cool': 'Dry Cool',
  'windy-cold': 'Windy Cold',
  'wet-slush': 'Wet Slush',
  'wet-cold': 'Wet Cold',
  'mild-damp': 'Mild Damp',
  'dry-cold': 'Dry Cold',
}

function formatPeriod(period: PeriodData | undefined): string {
  if (!period) return 'No data'
  const parts = [
    `${period.temp}°C (feels like ${period.feelsLike}°C)`,
    `${period.precipitation}mm precip`,
    `wind ${period.wind} m/s`,
  ]
  if (period.precipProbability > 30) parts.push(`${period.precipProbability}% rain chance`)
  return parts.join(', ')
}

export function deriveComfortTendency(feedback: FeedbackDoc[]): string {
  if (feedback.length === 0) return 'are still adapting to Nordic weather'

  const ratings = feedback.map((f) => f.comfortRating)
  const coldCount = ratings.filter((r) => r === 'too-cold' || r === 'slightly-cold').length
  const warmCount = ratings.filter((r) => r === 'too-warm' || r === 'slightly-warm').length
  const justRightCount = ratings.filter((r) => r === 'just-right').length

  if (coldCount > warmCount && coldCount > justRightCount) {
    return 'feel the cold more than average'
  }
  if (warmCount > coldCount && warmCount > justRightCount) {
    return 'tend to run warm'
  }
  return 'have well-calibrated cold tolerance'
}

export function buildSuggestionPrompt(
  weather: WeatherInput,
  wardrobe: WardrobeItemDoc[],
  feedback: FeedbackDoc[]
): string {
  const comfortTendency = deriveComfortTendency(feedback)
  const {periods, summary, conditionType, windWarning} = weather

  const periodMap = Object.fromEntries(periods.map((p) => [p.name, p]))

  const feedbackSection =
    feedback.length === 0
      ? 'No feedback history yet.'
      : feedback
          .map(
            (f) =>
              `${f.date} (${f.conditionType}): wore [${f.itemsWorn.join(', ')}], rated "${f.comfortRating}"${f.note ? ` — "${f.note}"` : ''}`
          )
          .join('\n')

  const wardrobeSection = wardrobe
    .map((item) =>
      JSON.stringify({
        id: item.id,
        name: item.name,
        category: item.category,
        warmthLevel: item.warmthLevel,
        waterproof: item.waterproof,
        windproof: item.windproof,
        temperatureRange: item.temperatureRange,
        material: item.material,
      })
    )
    .join('\n')

  const windNote = windWarning ? ' (WIND WARNING: gusts > 8 m/s)' : ''

  return `You are a personal clothing advisor for someone living in Oslo, Norway who moved from Sri Lanka 3 years ago. They are still adapting to Nordic weather and tend to ${comfortTendency} based on past feedback.

TODAY'S WEATHER IN OSLO:
Condition type: ${CONDITION_DISPLAY[conditionType]}${windNote}
Morning (06-09):   ${formatPeriod(periodMap['morning'])}
Daytime (09-15):   ${formatPeriod(periodMap['daytime'])}
Afternoon (15-18): ${formatPeriod(periodMap['afternoon'])}
Evening (18-21):   ${formatPeriod(periodMap['evening'])}
Summary: ${summary.minTemp}°C to ${summary.maxTemp}°C, total ${summary.totalPrecipitation}mm precipitation, max wind ${summary.maxWind} m/s

THEIR WARDROBE (one JSON object per line):
${wardrobeSection}

PAST FEEDBACK (last 14 days):
${feedbackSection}

Based on the full-day forecast, recommend what to wear today. Consider that they will be outside during transitions between periods (commute, errands) and should be prepared for the worst conditions of the day.

Return ONLY a valid JSON object with this structure:
{
  "baseLayer":   { "itemId": "...", "name": "...", "reasoning": "..." },
  "midLayer":    { "itemId": "...", "name": "...", "reasoning": "..." },
  "outerLayer":  { "itemId": "...", "name": "...", "reasoning": "..." },
  "accessories": [{ "itemId": "...", "name": "...", "reasoning": "..." }],
  "overallAdvice": "2-3 sentence summary with references to specific times of day"
}

Rules:
- Only use itemId values that appear in the wardrobe JSON above (exact match)
- Set a layer to null if it is not needed (e.g. base layer in warm weather)
- If the wardrobe is missing an essential item, mention this in overallAdvice
- Account for the user's comfort tendency from their feedback history`
}
