import {onCall, HttpsError} from 'firebase-functions/v2/https'
import {getFirestore} from 'firebase-admin/firestore'

export const revokeApiKey = onCall(
  {region: 'europe-west1'},
  async (request): Promise<{success: boolean}> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }
    const userId = request.auth.uid

    const db = getFirestore()
    const keyRef = db.collection('users').doc(userId).collection('apiKey').doc('default')
    const snap = await keyRef.get()
    if (snap.exists) {
      await keyRef.update({active: false})
    }

    return {success: true}
  }
)
