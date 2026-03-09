const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const MAX_BODY_BYTES = 2 * 1024 * 1024 // 2MB
const FETCH_TIMEOUT_MS = 15_000

export interface ScrapeResult {
  pageText: string
  imageUrls: string[]
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,no;q=0.8',
      },
      redirect: 'follow',
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Page took too long to load')
    }
    throw new Error('Could not reach the page')
  } finally {
    clearTimeout(timer)
  }

  if (response.status === 404) throw new Error('Page not found')
  if (response.status === 403 || response.status === 401) throw new Error('Page is blocking access')
  if (!response.ok) throw new Error(`Page returned error ${response.status}`)

  // Read body with 2MB size limit
  const body = response.body
  if (!body) throw new Error('No response body')

  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await reader.read()
      if (result.done) break
      totalBytes += result.value.length
      if (totalBytes > MAX_BODY_BYTES) {
        reader.cancel().catch(() => undefined)
        break
      }
      chunks.push(result.value)
    }
  } catch (err) {
    reader.cancel().catch(() => undefined)
    throw err
  }

  const totalChunkBytes = chunks.reduce((sum, c) => sum + c.length, 0)
  const merged = new Uint8Array(totalChunkBytes)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }

  return extractText(new TextDecoder().decode(merged))
}

export function extractText(html: string): ScrapeResult {
  // Remove script, style, noscript blocks
  const stripped = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')

  // Title
  const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(stripped)
  const title = titleMatch ? htmlDecode(titleMatch[1].trim()) : ''

  // Meta description
  const metaDescMatch =
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i.exec(stripped) ??
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i.exec(stripped)
  const metaDescription = metaDescMatch ? htmlDecode(metaDescMatch[1]) : ''

  // og:title
  const ogTitleMatch =
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(stripped) ??
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i.exec(stripped)
  const ogTitle = ogTitleMatch ? htmlDecode(ogTitleMatch[1]) : ''

  // og:image — primary image candidate
  const ogImageMatch =
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(stripped) ??
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i.exec(stripped)
  const imageUrls: string[] = []
  if (ogImageMatch) imageUrls.push(ogImageMatch[1])

  // Additional img src attributes
  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi
  let imgMatch: RegExpExecArray | null
  while ((imgMatch = imgRe.exec(stripped)) !== null) {
    if (!imageUrls.includes(imgMatch[1])) imageUrls.push(imgMatch[1])
    if (imageUrls.length >= 20) break
  }

  // Body text — strip all remaining tags
  const bodyText = stripped
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Combine into a single structured text block for Gemini, truncated to 8000 chars
  const sections: string[] = []
  if (title) sections.push(`Title: ${title}`)
  if (ogTitle && ogTitle !== title) sections.push(`Product title: ${ogTitle}`)
  if (metaDescription) sections.push(`Description: ${metaDescription}`)
  sections.push(`Content: ${bodyText}`)

  return {
    pageText: sections.join('\n\n').slice(0, 8000),
    imageUrls,
  }
}

function htmlDecode(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
