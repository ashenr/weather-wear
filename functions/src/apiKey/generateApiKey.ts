import {onCall, HttpsError} from 'firebase-functions/v2/https'
import * as crypto from 'node:crypto'
import {getFirestore, FieldValue} from 'firebase-admin/firestore'

export function generateKeyMaterial(): {rawKey: string; keyHash: string; keySuffix: string} {
  const rawBytes = crypto.randomBytes(32)
  const rawKey = rawBytes.toString('base64url')
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
  const keySuffix = rawKey.slice(-4)
  return {rawKey, keyHash, keySuffix}
}

export const generateApiKey = onCall(
  {region: 'europe-west1'},
  async (request): Promise<{apiKey: string}> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }
    const userId = request.auth.uid

    const {rawKey, keyHash, keySuffix} = generateKeyMaterial()

    const db = getFirestore()
    await db.collection('users').doc(userId).collection('apiKey').doc('default').set({
      keyHash,
      keySuffix,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      lastUsedAt: null,
    })

    return {apiKey: rawKey}
  }
)
