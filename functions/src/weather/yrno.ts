import type {YrnoResponse} from './types.js'

const YRNO_URL =
  'https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=59.9139&lon=10.7522'
const USER_AGENT = 'WeatherWear/1.0 github.com/ashenw/weatherwear'

export interface YrnoFetchResult {
  data: YrnoResponse;
  updatedAt: string;
  expires?: string;
}

export async function fetchYrno(
  ifModifiedSince?: string
): Promise<YrnoFetchResult | null> {
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
  }
  if (ifModifiedSince) {
    headers['If-Modified-Since'] = ifModifiedSince
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch(YRNO_URL, {
      headers,
      signal: controller.signal,
    })

    if (response.status === 304) {
      return null
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      throw new Error(
        `yr.no rate limited${retryAfter ? ` (Retry-After: ${retryAfter}s)` : ''}`
      )
    }

    if (!response.ok) {
      throw new Error(
        `yr.no API error: ${response.status} ${response.statusText}`
      )
    }

    const data = (await response.json()) as YrnoResponse
    const expires = response.headers.get('Expires') ?? undefined
    const lastModified =
      response.headers.get('Last-Modified') ?? data.properties.meta.updated_at

    return {data, updatedAt: lastModified, expires}
  } finally {
    clearTimeout(timeout)
  }
}
