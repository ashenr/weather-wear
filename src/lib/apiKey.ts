import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

export interface ApiKeyStatus {
  status: 'none' | 'active' | 'revoked'
  keySuffix?: string
  createdAt?: Date
  lastUsedAt?: Date | null
}

type ApiKeyStatusResponse =
  | { status: 'none' }
  | { status: 'active' | 'revoked'; keySuffix: string; createdAt: number; lastUsedAt: number | null }

export async function getApiKeyStatus(): Promise<ApiKeyStatus> {
  const fn = httpsCallable<void, ApiKeyStatusResponse>(functions, 'getApiKeyStatus')
  const result = await fn()
  const d = result.data
  if (d.status === 'none') return { status: 'none' }
  return {
    status: d.status,
    keySuffix: d.keySuffix,
    createdAt: new Date(d.createdAt),
    lastUsedAt: d.lastUsedAt != null ? new Date(d.lastUsedAt) : null,
  }
}

export async function generateApiKey(): Promise<string> {
  const fn = httpsCallable<void, { apiKey: string }>(functions, 'generateApiKey')
  const result = await fn()
  return result.data.apiKey
}

export async function revokeApiKey(): Promise<void> {
  const fn = httpsCallable<void, { success: boolean }>(functions, 'revokeApiKey')
  await fn()
}
