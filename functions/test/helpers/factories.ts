import type {DailySummary, PeriodData, YrnoTimeseries} from '../../src/weather/types.js'

export function makeSummary(overrides: Partial<DailySummary> = {}): DailySummary {
  return {
    minTemp: 2,
    maxTemp: 8,
    totalPrecipitation: 0.5,
    maxWind: 5,
    avgCloudCover: 60,
    ...overrides,
  }
}

export function makePeriod(overrides: Partial<PeriodData> = {}): PeriodData {
  return {
    name: 'morning',
    startHour: 6,
    endHour: 9,
    temp: 3,
    feelsLike: 1,
    precipitation: 0,
    precipProbability: 0,
    wind: 4,
    windGust: 7,
    humidity: 70,
    dewPoint: -1,
    cloudCover: 60,
    symbol: 'cloudy',
    ...overrides,
  }
}

export function makeTimeseries(
  time: string,
  overrides: {
    temp?: number
    humidity?: number
    dewPoint?: number
    wind?: number
    gust?: number
    cloudCover?: number
    precipitation?: number
    precipProb?: number
    symbol?: string
    useNext6Hours?: boolean
  } = {}
): YrnoTimeseries {
  const {
    temp = 3,
    humidity = 70,
    dewPoint = -1,
    wind = 4,
    gust = 7,
    cloudCover = 60,
    precipitation = 0,
    precipProb = 10,
    symbol = 'cloudy',
    useNext6Hours = false,
  } = overrides

  const entry: YrnoTimeseries = {
    time,
    data: {
      instant: {
        details: {
          air_temperature: temp,
          relative_humidity: humidity,
          dew_point_temperature: dewPoint,
          wind_speed: wind,
          wind_speed_of_gust: gust,
          cloud_area_fraction: cloudCover,
        },
      },
    },
  }

  if (useNext6Hours) {
    entry.data.next_6_hours = {
      summary: {symbol_code: symbol},
      details: {precipitation_amount: precipitation, probability_of_precipitation: precipProb},
    }
  } else {
    entry.data.next_1_hours = {
      summary: {symbol_code: symbol},
      details: {precipitation_amount: precipitation, probability_of_precipitation: precipProb},
    }
  }

  return entry
}
