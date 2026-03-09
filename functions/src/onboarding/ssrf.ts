/**
 * SSRF prevention: IP address validation for the crawlProductUrl function.
 *
 * Blocks private/internal IPv4 and IPv6 ranges to prevent Server-Side Request
 * Forgery attacks that could reach GCP internal services, metadata endpoints,
 * or private network resources.
 */

/**
 * Returns true if the IPv4 address falls into a blocked range:
 * RFC 1918 (private), loopback, link-local (includes GCP metadata 169.254.169.254),
 * shared address space (100.64/10), and non-routable (0.0.0.0/8).
 */
export function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return true
  const a = parts[0]!
  const b = parts[1]!
  if (a === 0) return true // 0.0.0.0/8 non-routable
  if (a === 10) return true // 10.0.0.0/8 RFC 1918
  if (a === 127) return true // 127.0.0.0/8 loopback
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 shared address space
  if (a === 169 && b === 254) return true // 169.254.0.0/16 link-local + GCP metadata
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12 RFC 1918
  if (a === 192 && b === 168) return true // 192.168.0.0/16 RFC 1918
  return false
}

/**
 * Returns true if the IPv6 address falls into a blocked range:
 * loopback (::1), unique local (fc00::/7), link-local (fe80::/10).
 */
export function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase()
  if (normalized === '::1') return true // loopback
  if (/^f[cd][0-9a-f]{2}:/i.test(normalized)) return true // fc00::/7 unique local (fc** and fd**)
  if (/^fe[89ab][0-9a-f]:/i.test(normalized) || normalized.startsWith('fe80:')) return true // fe80::/10 link-local
  return false
}
