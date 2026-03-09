import {describe, it, expect} from 'vitest'
import {isBlockedIpv4, isBlockedIpv6} from '../../../src/onboarding/ssrf.js'

// ── isBlockedIpv4 ─────────────────────────────────────────────────────────────

describe('isBlockedIpv4', () => {
  // RFC 1918 — 10.0.0.0/8
  it('blocks 10.0.0.0/8 (RFC 1918)', () => {
    expect(isBlockedIpv4('10.0.0.1')).toBe(true)
    expect(isBlockedIpv4('10.255.255.255')).toBe(true)
  })

  // RFC 1918 — 172.16.0.0/12
  it('blocks 172.16.0.0/12 (RFC 1918)', () => {
    expect(isBlockedIpv4('172.16.0.1')).toBe(true)
    expect(isBlockedIpv4('172.31.255.255')).toBe(true)
  })

  it('does not block addresses just outside 172.16-31 range', () => {
    expect(isBlockedIpv4('172.15.255.255')).toBe(false)
    expect(isBlockedIpv4('172.32.0.0')).toBe(false)
  })

  // RFC 1918 — 192.168.0.0/16
  it('blocks 192.168.0.0/16 (RFC 1918)', () => {
    expect(isBlockedIpv4('192.168.0.1')).toBe(true)
    expect(isBlockedIpv4('192.168.255.255')).toBe(true)
  })

  // Loopback — 127.0.0.0/8
  it('blocks 127.0.0.0/8 loopback', () => {
    expect(isBlockedIpv4('127.0.0.1')).toBe(true)
    expect(isBlockedIpv4('127.255.255.255')).toBe(true)
  })

  // Link-local + GCP metadata — 169.254.0.0/16
  it('blocks 169.254.0.0/16 link-local (includes GCP metadata 169.254.169.254)', () => {
    expect(isBlockedIpv4('169.254.169.254')).toBe(true)
    expect(isBlockedIpv4('169.254.0.1')).toBe(true)
    expect(isBlockedIpv4('169.254.255.255')).toBe(true)
  })

  // Shared address space — 100.64.0.0/10
  it('blocks 100.64.0.0/10 shared address space', () => {
    expect(isBlockedIpv4('100.64.0.0')).toBe(true)
    expect(isBlockedIpv4('100.127.255.255')).toBe(true)
  })

  it('does not block addresses just outside 100.64-127 range', () => {
    expect(isBlockedIpv4('100.63.255.255')).toBe(false)
    expect(isBlockedIpv4('100.128.0.0')).toBe(false)
  })

  // Non-routable — 0.0.0.0/8
  it('blocks 0.0.0.0/8 non-routable', () => {
    expect(isBlockedIpv4('0.0.0.0')).toBe(true)
    expect(isBlockedIpv4('0.0.0.1')).toBe(true)
  })

  // Malformed
  it('blocks malformed or invalid IP strings', () => {
    expect(isBlockedIpv4('not-an-ip')).toBe(true)
    expect(isBlockedIpv4('256.0.0.1')).toBe(true)
    expect(isBlockedIpv4('1.2.3')).toBe(true)
    expect(isBlockedIpv4('')).toBe(true)
  })

  // Public IPs — must NOT be blocked
  it('allows well-known public IPv4 addresses', () => {
    expect(isBlockedIpv4('8.8.8.8')).toBe(false) // Google DNS
    expect(isBlockedIpv4('1.1.1.1')).toBe(false) // Cloudflare DNS
    expect(isBlockedIpv4('93.184.216.34')).toBe(false) // example.com
    expect(isBlockedIpv4('104.16.0.0')).toBe(false) // Cloudflare CDN
  })
})

// ── isBlockedIpv6 ─────────────────────────────────────────────────────────────

describe('isBlockedIpv6', () => {
  // Loopback
  it('blocks ::1 loopback', () => {
    expect(isBlockedIpv6('::1')).toBe(true)
  })

  // Unique local — fc00::/7 (fc** and fd**)
  it('blocks fc00::/7 unique local addresses', () => {
    expect(isBlockedIpv6('fc00::1')).toBe(true)
    expect(isBlockedIpv6('fc12:3456::1')).toBe(true)
    expect(isBlockedIpv6('fd00::1')).toBe(true)
    expect(isBlockedIpv6('fd12:3456::abcd')).toBe(true)
  })

  // Link-local — fe80::/10
  it('blocks fe80::/10 link-local addresses', () => {
    expect(isBlockedIpv6('fe80::1')).toBe(true)
    expect(isBlockedIpv6('fe80::1:2:3:4')).toBe(true)
    expect(isBlockedIpv6('fe81::1')).toBe(true)
    expect(isBlockedIpv6('feb0::1')).toBe(true)
  })

  // Public — must NOT be blocked
  it('allows public IPv6 addresses', () => {
    expect(isBlockedIpv6('2001:db8::1')).toBe(false) // documentation range (public)
    expect(isBlockedIpv6('2607:f8b0::1')).toBe(false) // Google
    expect(isBlockedIpv6('2400:cb00::1')).toBe(false) // Cloudflare
  })
})
