import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

export async function generateApiKey(): Promise<string> {
  const fn = httpsCallable<void, { apiKey: string }>(functions, 'generateApiKey')
  const result = await fn()
  return result.data.apiKey
}

export async function revokeApiKey(): Promise<void> {
  const fn = httpsCallable<void, { success: boolean }>(functions, 'revokeApiKey')
  await fn()
}
