import {onCall, HttpsError} from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import {getFirestore, Timestamp} from 'firebase-admin/firestore'
import {validateFeedbackInput, toOsloDate} from './validateInput.js'
import type {SubmitFeedbackInput, FeedbackSubmitDoc} from './types.js'
import type {WeatherCacheDoc} from '../weather/types.js'

export const submitFeedback = onCall(
  {region: 'europe-west1'},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }
    const userId = request.auth.uid
    const data = request.data as SubmitFeedbackInput
    const todayDate = toOsloDate(new Date())

    const validationError = validateFeedbackInput(data, todayDate)
    if (validationError) {
      throw new HttpsError('invalid-argument', validationError.message)
    }

    const db = getFirestore()

    // Validate each itemsWorn ID exists in the user's wardrobe
    const wardrobeRefs = data.itemsWorn.map((id) =>
      db.collection('users').doc(userId).collection('wardrobe').doc(id)
    )
    const wardrobeSnaps = await Promise.all(wardrobeRefs.map((ref) => ref.get()))
    const missingIds = data.itemsWorn.filter((_, i) => !wardrobeSnaps[i].exists)
    if (missingIds.length > 0) {
      throw new HttpsError(
        'invalid-argument',
        `The following item IDs were not found in your wardrobe: ${missingIds.join(', ')}`
      )
    }

    // Snapshot weather data for the day (best-effort)
    let conditionType: string | null = null
    let weatherSummary: Record<string, unknown> | null = null
    try {
      const weatherSnap = await db.collection('weatherCache').doc(data.date).get()
      if (weatherSnap.exists) {
        const weather = weatherSnap.data() as WeatherCacheDoc
        conditionType = weather.conditionType ?? null
        weatherSummary = weather.summary as unknown as Record<string, unknown> ?? null
      }
    } catch (err) {
      logger.warn('Could not read weather cache for feedback snapshot', err)
    }

    // Write feedback document (overwrite if exists)
    const feedbackDoc: FeedbackSubmitDoc = {
      date: data.date,
      submittedAt: Timestamp.now(),
      itemsWorn: data.itemsWorn,
      comfortRating: data.comfortRating,
      conditionType,
      weatherSummary,
      note: data.note ?? null,
    }

    await db.collection('users').doc(userId).collection('feedback').doc(data.date).set(feedbackDoc)
    logger.info(`Feedback submitted for ${userId} on ${data.date}`)

    return {success: true}
  }
)
