import {onCall} from 'firebase-functions/v2/https'
import {onSchedule} from 'firebase-functions/v2/scheduler'
import * as logger from 'firebase-functions/logger'
import {getFirestore} from 'firebase-admin/firestore'
import {fetchYrno} from './yrno.js'
import {aggregateForDate} from './aggregate.js'
import {classifyCondition} from './osloLogic.js'
import type {WeatherCacheDoc} from './types.js'

function getTodayOslo(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Oslo',
  }).format(new Date())
}

export async function fetchAndCacheWeather(): Promise<{
  status: string
  date: string
  conditionType?: string
}> {
  const db = getFirestore()
  const today = getTodayOslo()
  logger.info(`Fetching weather for ${today}`)

  let ifModifiedSince: string | undefined
  const cacheRef = db.collection('weatherCache').doc(today)
  const cacheSnap = await cacheRef.get()
  if (cacheSnap.exists) {
    const existing = cacheSnap.data() as WeatherCacheDoc
    ifModifiedSince = existing.yrnoUpdatedAt
  }

  const result = await fetchYrno(ifModifiedSince)
  if (!result) {
    logger.info('yr.no returned 304 Not Modified — using cached data')
    return {status: 'cached', date: today}
  }

  const {periods, summary} = aggregateForDate(
    result.data.properties.timeseries,
    today
  )
  const {conditionType, windWarning} = classifyCondition(summary, periods)

  const doc: WeatherCacheDoc = {
    date: today,
    fetchedAt: new Date().toISOString(),
    periods,
    summary,
    conditionType,
    windWarning,
    yrnoUpdatedAt: result.updatedAt,
    ...(result.expires ? {yrnoExpires: result.expires} : {}),
  }

  await cacheRef.set(doc)
  logger.info(`Weather cached for ${today}: ${conditionType}`)
  return {status: 'updated', date: today, conditionType}
}

export const fetchWeather = onCall(
  {region: 'europe-west1'},
  async () => {
    return fetchAndCacheWeather()
  }
)

export const scheduledFetchWeather = onSchedule(
  {schedule: '0 5 * * *', timeZone: 'Europe/Oslo', region: 'europe-west1'},
  async () => {
    await fetchAndCacheWeather()
  }
)
