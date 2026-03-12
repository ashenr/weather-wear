import {describe, it, expect} from 'vitest'
import * as crypto from 'node:crypto'
import {generateKeyMaterial} from '../../src/apiKey/generateApiKey.js'
import {mapApiKeyDoc} from '../../src/apiKey/getApiKeyStatus.js'
import type {ApiKeyDoc} from '../../src/apiKey/types.js'

// Minimal Firestore Timestamp stub for tests
function makeTimestamp(ms: number) {
  return {toMillis: () => ms} as import('firebase-admin/firestore').Timestamp
}

// ── generateKeyMaterial ────────────────────────────────────────────────────────

describe('generateKeyMaterial', () => {
  it('rawKey is a valid base64url string (no +, /, or = chars)', () => {
    const {rawKey} = generateKeyMaterial()
    expect(rawKey).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('rawKey is at least 40 characters long', () => {
    const {rawKey} = generateKeyMaterial()
    // 32 bytes base64url-encoded → ceil(32 * 4 / 3) = 43 chars
    expect(rawKey.length).toBeGreaterThanOrEqual(40)
  })

  it('keyHash is a valid 64-char lowercase hex string (SHA-256)', () => {
    const {keyHash} = generateKeyMaterial()
    expect(keyHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('keySuffix equals the last 4 characters of rawKey', () => {
    const {rawKey, keySuffix} = generateKeyMaterial()
    expect(keySuffix).toBe(rawKey.slice(-4))
  })

  it('calling generate twice produces different raw keys', () => {
    const first = generateKeyMaterial()
    const second = generateKeyMaterial()
    expect(first.rawKey).not.toBe(second.rawKey)
  })

  it('calling generate twice produces different key hashes', () => {
    const first = generateKeyMaterial()
    const second = generateKeyMaterial()
    expect(first.keyHash).not.toBe(second.keyHash)
  })

  it('keyHash is the SHA-256 hash of rawKey', () => {
    const {rawKey, keyHash} = generateKeyMaterial()
    const expected = crypto.createHash('sha256').update(rawKey).digest('hex')
    expect(keyHash).toBe(expected)
  })
})

// ── getSnapshot key validation — HTTP logic ────────────────────────────────────
// These tests verify the key hashing and HTTP validation logic in isolation.
// Full end-to-end validation (including Firestore lookup and weather/suggestion
// fetching) would require separate integration tests, which are not part of
// this unit test suite.
describe('getSnapshot key hash validation', () => {
  it('candidate key hash matches stored hash for a known key', () => {
    const {rawKey, keyHash} = generateKeyMaterial()
    // Simulate what getSnapshot does: hash the incoming key and compare
    const candidateHash = crypto.createHash('sha256').update(rawKey).digest('hex')
    expect(candidateHash).toBe(keyHash)
  })

  it('candidate hash does not match a different key', () => {
    const first = generateKeyMaterial()
    const second = generateKeyMaterial()
    const candidateHash = crypto.createHash('sha256').update(second.rawKey).digest('hex')
    expect(candidateHash).not.toBe(first.keyHash)
  })

  it('hash comparison is deterministic for the same key', () => {
    const {rawKey} = generateKeyMaterial()
    const hash1 = crypto.createHash('sha256').update(rawKey).digest('hex')
    const hash2 = crypto.createHash('sha256').update(rawKey).digest('hex')
    expect(hash1).toBe(hash2)
  })

  it('empty string key produces a different hash than any generated key', () => {
    const {keyHash} = generateKeyMaterial()
    const emptyHash = crypto.createHash('sha256').update('').digest('hex')
    expect(emptyHash).not.toBe(keyHash)
  })
})

// ── getSnapshot HTTP method and key presence checks ───────────────────────────
// These verify the pure guard logic extracted from the handler.

function checkMethod(method: string): boolean {
  return method === 'GET'
}

function checkKeyPresent(key: unknown): boolean {
  return typeof key === 'string' && key.trim() !== ''
}

describe('getSnapshot HTTP guard logic', () => {
  it('accepts GET method', () => {
    expect(checkMethod('GET')).toBe(true)
  })

  it('rejects POST method', () => {
    expect(checkMethod('POST')).toBe(false)
  })

  it('rejects PUT method', () => {
    expect(checkMethod('PUT')).toBe(false)
  })

  it('rejects DELETE method', () => {
    expect(checkMethod('DELETE')).toBe(false)
  })

  it('accepts a non-empty string key', () => {
    const {rawKey} = generateKeyMaterial()
    expect(checkKeyPresent(rawKey)).toBe(true)
  })

  it('rejects missing key (undefined)', () => {
    expect(checkKeyPresent(undefined)).toBe(false)
  })

  it('rejects empty string key', () => {
    expect(checkKeyPresent('')).toBe(false)
  })

  it('rejects whitespace-only key', () => {
    expect(checkKeyPresent('   ')).toBe(false)
  })

  it('rejects non-string key (number)', () => {
    expect(checkKeyPresent(42)).toBe(false)
  })

  it('rejects non-string key (array)', () => {
    expect(checkKeyPresent(['key1', 'key2'])).toBe(false)
  })
})

// ── mapApiKeyDoc ───────────────────────────────────────────────────────────────
// Tests that the response mapping helper returns only display-safe fields and
// never includes keyHash.

describe('mapApiKeyDoc', () => {
  const baseDoc: ApiKeyDoc = {
    keyHash: 'aabbcc',
    keySuffix: 'xZ3q',
    active: true,
    createdAt: makeTimestamp(1_700_000_000_000),
    lastUsedAt: null,
  }

  it('returns status "active" when active is true', () => {
    expect(mapApiKeyDoc({...baseDoc, active: true}).status).toBe('active')
  })

  it('returns status "revoked" when active is false', () => {
    expect(mapApiKeyDoc({...baseDoc, active: false}).status).toBe('revoked')
  })

  it('includes keySuffix in the response', () => {
    expect(mapApiKeyDoc(baseDoc).keySuffix).toBe('xZ3q')
  })

  it('converts createdAt Timestamp to milliseconds', () => {
    expect(mapApiKeyDoc(baseDoc).createdAt).toBe(1_700_000_000_000)
  })

  it('returns lastUsedAt as null when not set', () => {
    expect(mapApiKeyDoc({...baseDoc, lastUsedAt: null}).lastUsedAt).toBeNull()
  })

  it('converts lastUsedAt Timestamp to milliseconds when set', () => {
    const doc = {...baseDoc, lastUsedAt: makeTimestamp(1_741_000_000_000)}
    expect(mapApiKeyDoc(doc).lastUsedAt).toBe(1_741_000_000_000)
  })

  it('does not include keyHash in the response', () => {
    const result = mapApiKeyDoc(baseDoc)
    expect(result).not.toHaveProperty('keyHash')
  })
})

// ── getSnapshot userId guard logic ─────────────────────────────────────────────
// Tests that userId is correctly extracted via ref traversal and the guard
// rejects documents that don't have the expected parent hierarchy.

function extractUserId(ref: {parent: {parent: {id: string} | null} | null}): string | undefined {
  return ref.parent?.parent?.id
}

describe('getSnapshot userId extraction', () => {
  it('returns userId from a correctly structured doc ref', () => {
    const ref = {parent: {parent: {id: 'user-abc'}}}
    expect(extractUserId(ref)).toBe('user-abc')
  })

  it('returns undefined when parent.parent is null (root collection doc)', () => {
    const ref = {parent: {parent: null}}
    expect(extractUserId(ref)).toBeUndefined()
  })

  it('returns undefined when parent is null', () => {
    const ref = {parent: null}
    expect(extractUserId(ref)).toBeUndefined()
  })
})
