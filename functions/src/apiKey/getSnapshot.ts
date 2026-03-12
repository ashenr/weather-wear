import {onRequest} from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import * as crypto from 'node:crypto'
import {getFirestore, FieldValue} from 'firebase-admin/firestore'
import {defineSecret} from 'firebase-functions/params'
import {GoogleGenAI} from '@google/genai'
import {fetchAndCacheWeather} from '../weather/fetchWeather.js'
import {buildSuggestionPrompt} from '../suggestion/buildPrompt.js'
import {parseAndValidate} from '../suggestion/validateResponse.js'
import type {WeatherCacheDoc} from '../weather/types.js'
import type {WardrobeItemDoc, FeedbackDoc, SuggestionData, SuggestionDoc} from '../suggestion/types.js'

const geminiApiKey = defineSecret('GEMINI_API_KEY')

function getTodayOslo(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Oslo',
  }).format(new Date())
}

function getDateNDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Oslo',
  }).format(d)
}

async function generateSuggestion(
  userId: string,
  weather: WeatherCacheDoc,
  today: string
): Promise<{suggestion: SuggestionData | null; suggestionError?: string}> {
  const db = getFirestore()

  const wardrobeSnap = await db
    .collection('users')
    .doc(userId)
    .collection('wardrobe')
    .get()
  if (wardrobeSnap.empty) {
    return {suggestion: null, suggestionError: 'Wardrobe is empty — add clothing items to receive suggestions'}
  }
  const wardrobe: WardrobeItemDoc[] = wardrobeSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<WardrobeItemDoc, 'id'>),
  }))
  const wardrobeIds = new Set(wardrobe.map((w) => w.id))

  const cutoff = getDateNDaysAgo(14)
  const feedbackSnap = await db
    .collection('users')
    .doc(userId)
    .collection('feedback')
    .where('date', '>=', cutoff)
    .orderBy('date', 'desc')
    .get()
  const feedback: FeedbackDoc[] = feedbackSnap.docs.map((d) => d.data() as FeedbackDoc)

  const prompt = buildSuggestionPrompt(
    {
      periods: weather.periods,
      summary: weather.summary,
      conditionType: weather.conditionType,
      windWarning: weather.windWarning,
    },
    wardrobe,
    feedback
  )

  const ai = new GoogleGenAI({apiKey: geminiApiKey.value()})

  const callGemini = async (promptText: string): Promise<string> => {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: promptText,
      config: {responseMimeType: 'application/json'},
    })
    return result.text ?? ''
  }

  let suggestionData: SuggestionData
  let rawResponse = ''

  try {
    rawResponse = await callGemini(prompt)
    suggestionData = parseAndValidate(JSON.parse(rawResponse), wardrobeIds)
  } catch (firstErr) {
    logger.warn('getSnapshot: first Gemini attempt failed, retrying', firstErr)
    try {
      const strictPrompt = prompt + '\n\nCRITICAL: You MUST return ONLY valid JSON. No markdown, no code blocks.'
      rawResponse = await callGemini(strictPrompt)
      suggestionData = parseAndValidate(JSON.parse(rawResponse), wardrobeIds)
    } catch (secondErr) {
      logger.error('getSnapshot: Gemini retry failed', secondErr)
      return {suggestion: null, suggestionError: 'Failed to generate clothing suggestion — please try again later'}
    }
  }

  const suggestionRef = db
    .collection('users')
    .doc(userId)
    .collection('suggestions')
    .doc(today)
  const doc: SuggestionDoc = {
    date: today,
    generatedAt: new Date().toISOString(),
    conditionType: weather.conditionType,
    forecast: {periods: weather.periods, summary: weather.summary},
    suggestion: suggestionData,
    rawGeminiResponse: rawResponse,
    isFallback: false,
  }
  suggestionRef.set(doc).catch((err) => {
    logger.warn('getSnapshot: failed to cache suggestion', err)
  })

  return {suggestion: suggestionData}
}

export const getSnapshot = onRequest(
  {region: 'europe-west1', secrets: [geminiApiKey]},
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.status(204).send('')
      return
    }

    if (req.method !== 'GET') {
      res.status(405).json({error: 'method_not_allowed'})
      return
    }

    const key = req.query['key']
    if (!key || typeof key !== 'string' || key.trim() === '') {
      res.status(401).json({error: 'missing_key'})
      return
    }

    const candidateHash = crypto.createHash('sha256').update(key).digest('hex')

    const db = getFirestore()
    const keySnap = await db
      .collectionGroup('apiKey')
      .where('keyHash', '==', candidateHash)
      .where('active', '==', true)
      .limit(1)
      .get()

    if (keySnap.empty) {
      res.status(401).json({error: 'invalid_key'})
      return
    }

    const keyDoc = keySnap.docs[0]
    const userId = keyDoc.ref.parent.parent?.id
    if (!userId) {
      logger.error('getSnapshot: apiKey document has unexpected path', keyDoc.ref.path)
      res.status(500).json({error: 'internal_error'})
      return
    }

    // Non-blocking lastUsedAt update
    keyDoc.ref.update({lastUsedAt: FieldValue.serverTimestamp()}).catch((err) => {
      logger.warn('getSnapshot: failed to update lastUsedAt', err)
    })

    const today = getTodayOslo()

    // Read weather cache
    const weatherSnap = await db.collection('weatherCache').doc(today).get()
    if (!weatherSnap.exists) {
      try {
        await fetchAndCacheWeather()
        const retrySnap = await db.collection('weatherCache').doc(today).get()
        if (!retrySnap.exists) {
          res.status(503).json({error: 'weather_unavailable'})
          return
        }
        const weather = retrySnap.data() as WeatherCacheDoc
        return void (await respondWithData(res, db, userId, today, weather))
      } catch {
        res.status(503).json({error: 'weather_unavailable'})
        return
      }
    }
    const weather = weatherSnap.data() as WeatherCacheDoc

    await respondWithData(res, db, userId, today, weather)
  }
)

async function respondWithData(
  res: import('express').Response,
  db: FirebaseFirestore.Firestore,
  userId: string,
  today: string,
  weather: WeatherCacheDoc
): Promise<void> {
  // Read or generate suggestion
  const suggestionRef = db.collection('users').doc(userId).collection('suggestions').doc(today)
  const suggestionSnap = await suggestionRef.get()

  let suggestion: SuggestionData | null = null
  let suggestionError: string | undefined

  if (suggestionSnap.exists && !suggestionSnap.data()?.['isFallback']) {
    suggestion = (suggestionSnap.data() as SuggestionDoc).suggestion
  } else {
    const result = await generateSuggestion(userId, weather, today)
    suggestion = result.suggestion
    suggestionError = result.suggestionError
  }

  const responseBody: Record<string, unknown> = {
    date: today,
    weather: {
      conditionType: weather.conditionType,
      windWarning: weather.windWarning,
      periods: Object.fromEntries(weather.periods.map((p) => [p.name, p])),
      summary: {
        minTemp: weather.summary.minTemp,
        maxTemp: weather.summary.maxTemp,
        totalPrecipitation: weather.summary.totalPrecipitation,
        maxWind: weather.summary.maxWind,
      },
    },
    suggestion,
  }

  if (suggestionError !== undefined) {
    responseBody['suggestionError'] = suggestionError
  }

  res.status(200).json(responseBody)
}
