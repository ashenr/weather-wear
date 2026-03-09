import { httpsCallable } from 'firebase/functions'
import { collection, doc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore'
import { functions, db } from './firebase'
import type { ComfortRating, FeedbackEntry } from '../types/feedback'

export interface SubmitFeedbackInput {
  date: string
  itemsWorn: string[]
  comfortRating: ComfortRating
  note?: string
}

export async function submitFeedback(input: SubmitFeedbackInput): Promise<void> {
  const fn = httpsCallable<SubmitFeedbackInput, { success: boolean }>(
    functions,
    'submitFeedback'
  )
  await fn(input)
}

export async function getFeedbackForDate(
  userId: string,
  date: string
): Promise<FeedbackEntry | null> {
  const ref = doc(db, 'users', userId, 'feedback', date)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as FeedbackEntry
}

export async function getRecentFeedback(userId: string, days = 14): Promise<FeedbackEntry[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(cutoff)

  const ref = collection(db, 'users', userId, 'feedback')
  const q = query(ref, where('date', '>=', cutoffStr), orderBy('date', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FeedbackEntry))
}
