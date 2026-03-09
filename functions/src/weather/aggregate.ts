import type {YrnoTimeseries, PeriodData, DailySummary} from './types.js'

const PERIODS = [
  {name: 'morning' as const, startHour: 6, endHour: 9},
  {name: 'daytime' as const, startHour: 9, endHour: 15},
  {name: 'afternoon' as const, startHour: 15, endHour: 18},
  {name: 'evening' as const, startHour: 18, endHour: 21},
]

function getOsloHour(utcTimeString: string): number {
  const date = new Date(utcTimeString)
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Oslo',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(date),
    10
  )
}

function getOsloDate(utcTimeString: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Oslo',
  }).format(new Date(utcTimeString))
}

function calculateFeelsLike(tempC: number, windSpeedMs: number): number {
  if (tempC < 10 && windSpeedMs > 1.3) {
    const vKmh = windSpeedMs * 3.6
    const v016 = Math.pow(vKmh, 0.16)
    return 13.12 + 0.6215 * tempC - 11.37 * v016 + 0.3965 * tempC * v016
  }
  return tempC
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function mostFrequent(arr: string[]): string {
  if (arr.length === 0) return 'cloudy'
  const counts: Record<string, number> = {}
  for (const s of arr) {
    counts[s] = (counts[s] ?? 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function aggregateForDate(
  timeseries: YrnoTimeseries[],
  targetDate: string
): { periods: PeriodData[]; summary: DailySummary } {
  const dateEntries = timeseries.filter(
    (entry) => getOsloDate(entry.time) === targetDate
  )

  const periods: PeriodData[] = []

  for (const period of PERIODS) {
    const entries = dateEntries.filter((entry) => {
      const hour = getOsloHour(entry.time)
      return hour >= period.startHour && hour < period.endHour
    })

    if (entries.length === 0) {
      periods.push({
        name: period.name,
        startHour: period.startHour,
        endHour: period.endHour,
        temp: 0,
        feelsLike: 0,
        precipitation: 0,
        precipProbability: 0,
        wind: 0,
        windGust: 0,
        humidity: 0,
        dewPoint: 0,
        cloudCover: 0,
        symbol: 'cloudy',
      })
      continue
    }

    const precipAmounts: number[] = []
    const precipProbs: number[] = []
    const symbols: string[] = []
    const windGusts: number[] = []

    for (const entry of entries) {
      const hourly = entry.data.next_1_hours ?? entry.data.next_6_hours
      if (hourly) {
        precipAmounts.push(hourly.details.precipitation_amount)
        precipProbs.push(hourly.details.probability_of_precipitation)
        symbols.push(hourly.summary.symbol_code)
      }
      const gust = entry.data.instant.details.wind_speed_of_gust
      if (gust !== undefined) windGusts.push(gust)
    }

    const temps = entries.map((e) => e.data.instant.details.air_temperature)
    const winds = entries.map((e) => e.data.instant.details.wind_speed)
    const feelsLikes = entries.map((e) =>
      calculateFeelsLike(
        e.data.instant.details.air_temperature,
        e.data.instant.details.wind_speed
      )
    )

    periods.push({
      name: period.name,
      startHour: period.startHour,
      endHour: period.endHour,
      temp: round1(average(temps)),
      feelsLike: round1(average(feelsLikes)),
      precipitation: round1(precipAmounts.reduce((a, b) => a + b, 0)),
      precipProbability: precipProbs.length > 0 ? Math.max(...precipProbs) : 0,
      wind: round1(average(winds)),
      windGust: windGusts.length > 0 ? round1(Math.max(...windGusts)) : 0,
      humidity: round1(
        average(entries.map((e) => e.data.instant.details.relative_humidity))
      ),
      dewPoint: round1(
        average(
          entries.map(
            (e) => e.data.instant.details.dew_point_temperature ?? 0
          )
        )
      ),
      cloudCover: round1(
        average(entries.map((e) => e.data.instant.details.cloud_area_fraction))
      ),
      symbol: mostFrequent(symbols),
    })
  }

  const summary: DailySummary = {
    minTemp:
      periods.length > 0 ? Math.min(...periods.map((p) => p.temp)) : 0,
    maxTemp:
      periods.length > 0 ? Math.max(...periods.map((p) => p.temp)) : 0,
    totalPrecipitation: round1(
      periods.reduce((sum, p) => sum + p.precipitation, 0)
    ),
    maxWind:
      periods.length > 0 ? Math.max(...periods.map((p) => p.wind)) : 0,
    avgCloudCover: round1(average(periods.map((p) => p.cloudCover))),
  }

  return {periods, summary}
}
