import type {Timestamp} from 'firebase-admin/firestore'

export interface ApiKeyDoc {
  keyHash: string
  keySuffix: string
  active: boolean
  createdAt: Timestamp
  lastUsedAt: Timestamp | null
}
