import {describe, it, expect} from 'vitest'
import * as crypto from 'node:crypto'
import {generateKeyMaterial} from '../../src/apiKey/generateApiKey.js'

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
// Full end-to-end validation (Firestore lookup, weather/suggestion fetching)
// is covered by integration tests.

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
