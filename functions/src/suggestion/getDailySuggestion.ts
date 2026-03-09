import {onCall, HttpsError} from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import {getFirestore} from 'firebase-admin/firestore'
import {defineSecret} from 'firebase-functions/params'
import {GoogleGenAI} from '@google/genai'
import {fetchAndCacheWeather} from '../weather/fetchWeather.js'
import {buildSuggestionPrompt} from './buildPrompt.js'
import {parseAndValidate} from './validateResponse.js'
import type {WeatherCacheDoc} from '../weather/types.js'
import type {WardrobeItemDoc, FeedbackDoc, SuggestionDoc, SuggestionData} from './types.js'

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

export const getDailySuggestion = onCall(
  {region: 'europe-west1', secrets: [geminiApiKey]},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }
    const userId = request.auth.uid
    const today = getTodayOslo()
    const db = getFirestore()

    // 1. Check for cached suggestion
    const suggestionRef = db
      .collection('users')
      .doc(userId)
      .collection('suggestions')
      .doc(today)
    const cached = await suggestionRef.get()
    if (cached.exists && !cached.data()?.['isFallback']) {
      logger.info(`Returning cached suggestion for ${userId} on ${today}`)
      return cached.data() as SuggestionDoc
    }

    // 2. Read weather data (fetch on-demand if missing)
    const weatherRef = db.collection('weatherCache').doc(today)
    let weatherSnap = await weatherRef.get()
    if (!weatherSnap.exists) {
      logger.info('Weather cache missing — fetching on demand')
      await fetchAndCacheWeather()
      weatherSnap = await weatherRef.get()
    }
    if (!weatherSnap.exists) {
      throw new HttpsError('not-found', 'Weather data unavailable for today')
    }
    const weather = weatherSnap.data() as WeatherCacheDoc

    // 3. Read wardrobe
    const wardrobeSnap = await db
      .collection('users')
      .doc(userId)
      .collection('wardrobe')
      .get()
    if (wardrobeSnap.empty) {
      throw new HttpsError(
        'failed-precondition',
        'Your wardrobe is empty. Add some clothing items before requesting a suggestion.'
      )
    }
    const wardrobe: WardrobeItemDoc[] = wardrobeSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<WardrobeItemDoc, 'id'>),
    }))
    const wardrobeIds = new Set(wardrobe.map((w) => w.id))

    // 4. Read recent feedback (last 14 days)
    const cutoff = getDateNDaysAgo(14)
    const feedbackSnap = await db
      .collection('users')
      .doc(userId)
      .collection('feedback')
      .where('date', '>=', cutoff)
      .orderBy('date', 'desc')
      .get()
    const feedback: FeedbackDoc[] = feedbackSnap.docs.map(
      (d) => d.data() as FeedbackDoc
    )

    // 5. Build prompt and call Gemini
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

    let suggestionData: SuggestionData
    let rawResponse = ''
    let isFallback = false

    const callGemini = async (promptText: string): Promise<string> => {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: promptText,
        config: {responseMimeType: 'application/json'},
      })
      return result.text ?? ''
    }

    try {
      rawResponse = await callGemini(prompt)
      suggestionData = parseAndValidate(JSON.parse(rawResponse), wardrobeIds)
    } catch (firstErr) {
      logger.warn('First Gemini attempt failed, retrying with stricter prompt', firstErr)
      try {
        const strictPrompt =
          prompt + '\n\nCRITICAL: You MUST return ONLY valid JSON. No markdown, no code blocks.'
        rawResponse = await callGemini(strictPrompt)
        suggestionData = parseAndValidate(JSON.parse(rawResponse), wardrobeIds)
      } catch (secondErr) {
        logger.error('Gemini retry failed — using fallback', secondErr)
        isFallback = true
        // Extract overallAdvice if possible, otherwise use generic message
        let advice =
          'Unable to match specific wardrobe items at this time. Please check the weather and dress appropriately.'
        try {
          const parsed = JSON.parse(rawResponse) as Record<string, unknown>
          if (typeof parsed['overallAdvice'] === 'string') advice = parsed['overallAdvice']
        } catch {
          // ignore
        }
        suggestionData = {
          baseLayer: null,
          midLayer: null,
          outerLayer: null,
          accessories: [],
          overallAdvice: advice + ' (Item matching failed — please try again later.)',
        }
      }
    }

    const doc: SuggestionDoc = {
      date: today,
      generatedAt: new Date().toISOString(),
      conditionType: weather.conditionType,
      forecast: {periods: weather.periods, summary: weather.summary},
      suggestion: suggestionData,
      rawGeminiResponse: rawResponse,
      isFallback,
    }

    // 6. Cache if not a fallback
    if (!isFallback) {
      await suggestionRef.set(doc)
      logger.info(`Suggestion cached for ${userId} on ${today}`)
    }

    return doc
  }
)
