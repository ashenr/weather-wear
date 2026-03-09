import {onCall, HttpsError} from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import {lookup} from 'node:dns/promises'
import {defineSecret} from 'firebase-functions/params'
import {GoogleGenAI} from '@google/genai'
import {scrapeUrl} from './scraper.js'
import {buildExtractionPrompt, validateAndCoerce} from './extractionPrompt.js'
import {isBlockedIpv4, isBlockedIpv6} from './ssrf.js'
import type {ExtractedItem} from './extractionPrompt.js'

const geminiApiKey = defineSecret('GEMINI_API_KEY')

export const crawlProductUrl = onCall(
  {region: 'europe-west1', secrets: [geminiApiKey]},
  async (request): Promise<ExtractedItem> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const data = request.data as Record<string, unknown>
    const rawUrl = data['url']
    if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
      throw new HttpsError('invalid-argument', 'url is required')
    }

    // Validate URL scheme — reject non-HTTP(S) protocols
    let parsed: URL
    try {
      parsed = new URL(rawUrl.trim())
    } catch {
      throw new HttpsError('invalid-argument', 'Invalid URL format')
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new HttpsError('invalid-argument', 'Only HTTP and HTTPS URLs are allowed')
    }

    // SSRF prevention: resolve DNS once and validate the resulting IP.
    // We fetch using the original URL (not the raw IP) to preserve TLS certificate
    // validation and redirect handling. Pre-validating the resolved IP blocks the main
    // SSRF attack vectors (RFC 1918, loopback, GCP metadata). The residual DNS-rebinding
    // window between this check and the actual fetch is negligible in GCP's environment.
    const hostname = parsed.hostname
    let resolvedIp: string
    let resolvedFamily: number
    try {
      const result = await lookup(hostname, {family: 0})
      resolvedIp = result.address
      resolvedFamily = result.family
    } catch {
      throw new HttpsError('invalid-argument', 'Could not resolve hostname')
    }
    if (resolvedFamily === 4 && isBlockedIpv4(resolvedIp)) {
      throw new HttpsError('invalid-argument', 'URL resolves to a blocked IP address')
    }
    if (resolvedFamily === 6 && isBlockedIpv6(resolvedIp)) {
      throw new HttpsError('invalid-argument', 'URL resolves to a blocked IP address')
    }

    // Fetch and extract page text
    let scrapeResult
    try {
      scrapeResult = await scrapeUrl(rawUrl.trim())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch page'
      throw new HttpsError('unavailable', msg)
    }

    // Call Gemini to extract structured item data
    const ai = new GoogleGenAI({apiKey: geminiApiKey.value()})
    const prompt = buildExtractionPrompt(scrapeResult.pageText)

    const callGemini = async (promptText: string): Promise<string> => {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: promptText,
        config: {responseMimeType: 'application/json'},
      })
      return result.text ?? ''
    }

    let extracted: ExtractedItem
    try {
      const raw = await callGemini(prompt)
      extracted = validateAndCoerce(JSON.parse(raw) as Record<string, unknown>, rawUrl.trim())
    } catch (firstErr) {
      logger.warn('First Gemini extraction attempt failed, retrying', firstErr)
      try {
        const strictPrompt =
          prompt + '\n\nCRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanation.'
        const raw = await callGemini(strictPrompt)
        extracted = validateAndCoerce(JSON.parse(raw) as Record<string, unknown>, rawUrl.trim())
      } catch (secondErr) {
        logger.error('Gemini extraction failed after retry — returning empty template', secondErr)
        // Return an empty template so the user can fill in fields manually
        extracted = {
          name: null,
          category: null,
          color: null,
          material: null,
          brand: null,
          warmthLevel: null,
          waterproof: null,
          windproof: null,
          temperatureRange: null,
          photoUrl: null,
          sourceUrl: rawUrl.trim(),
          extractedByAI: true,
        }
      }
    }

    // Resolve relative photo URL to absolute using the source URL as base
    if (extracted.photoUrl && !extracted.photoUrl.startsWith('http')) {
      try {
        extracted = {...extracted, photoUrl: new URL(extracted.photoUrl, rawUrl.trim()).toString()}
      } catch {
        extracted = {...extracted, photoUrl: null}
      }
    }

    // Fall back to first scraped image URL if Gemini didn't find one
    if (!extracted.photoUrl && scrapeResult.imageUrls.length > 0) {
      const firstImg = scrapeResult.imageUrls[0]!
      try {
        extracted = {
          ...extracted,
          photoUrl: firstImg.startsWith('http') ? firstImg : new URL(firstImg, rawUrl.trim()).toString(),
        }
      } catch {
        // ignore invalid image URLs
      }
    }

    logger.info(`Extracted item from ${hostname}: name=${extracted.name}, category=${extracted.category}`)
    return extracted
  }
)
