import {onCall, HttpsError} from 'firebase-functions/v2/https'
import {getFirestore} from 'firebase-admin/firestore'
import type {ApiKeyDoc} from './types.js'

export type ApiKeyStatusResponse =
  | {status: 'none'}
  | {status: 'active' | 'revoked'; keySuffix: string; createdAt: number; lastUsedAt: number | null}

export function mapApiKeyDoc(data: ApiKeyDoc): Extract<ApiKeyStatusResponse, {status: 'active' | 'revoked'}> {
  return {
    status: data.active ? 'active' : 'revoked',
    keySuffix: data.keySuffix,
    createdAt: data.createdAt.toMillis(),
    lastUsedAt: data.lastUsedAt ? data.lastUsedAt.toMillis() : null,
  }
}

export const getApiKeyStatus = onCall(
  {region: 'europe-west1'},
  async (request): Promise<ApiKeyStatusResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }
    const userId = request.auth.uid

    const db = getFirestore()
    const snap = await db.collection('users').doc(userId).collection('apiKey').doc('default').get()
    if (!snap.exists) {
      return {status: 'none'}
    }

    const data = snap.data() as ApiKeyDoc
    // Return only display-safe fields — keyHash is intentionally omitted
    return mapApiKeyDoc(data)
  }
)
