import {describe, it, expect} from 'vitest'
import {extractText} from '../../../src/onboarding/scraper.js'

// ── tag removal ───────────────────────────────────────────────────────────────

describe('extractText — tag removal', () => {
  it('removes <script> blocks', () => {
    const result = extractText('<html><body>Hello<script>alert("xss")</script> world</body></html>')
    expect(result.pageText).not.toContain('alert')
    expect(result.pageText).toContain('Hello')
    expect(result.pageText).toContain('world')
  })

  it('removes <style> blocks', () => {
    const result = extractText('<html><head><style>body { color: red; }</style></head><body>Text</body></html>')
    expect(result.pageText).not.toContain('color: red')
    expect(result.pageText).toContain('Text')
  })

  it('removes <noscript> blocks', () => {
    const result = extractText('<html><body>Main<noscript>Enable JS please</noscript> content</body></html>')
    expect(result.pageText).not.toContain('Enable JS')
    expect(result.pageText).toContain('Main')
    expect(result.pageText).toContain('content')
  })
})

// ── title and meta extraction ─────────────────────────────────────────────────

describe('extractText — title and meta extraction', () => {
  it('extracts <title> tag content', () => {
    const result = extractText('<html><head><title>Norrøna Jacket</title></head><body>Body text</body></html>')
    expect(result.pageText).toContain('Title: Norrøna Jacket')
  })

  it('extracts og:title meta tag', () => {
    const html = `<html><head>
      <title>Page Title</title>
      <meta property="og:title" content="Product OG Title" />
    </head><body>Body</body></html>`
    const result = extractText(html)
    expect(result.pageText).toContain('Product OG Title')
  })

  it('omits "Product title:" when og:title matches <title> to avoid duplication', () => {
    const html = `<html><head>
      <title>Same Title</title>
      <meta property="og:title" content="Same Title" />
    </head><body>Body</body></html>`
    const result = extractText(html)
    // The separate "Product title:" label should not be added when it duplicates <title>
    expect(result.pageText).not.toContain('Product title:')
    // But the title itself should still appear via the "Title:" prefix
    expect(result.pageText).toContain('Title: Same Title')
  })

  it('extracts meta description', () => {
    const html = `<html><head>
      <meta name="description" content="A warm Gore-Tex jacket for Oslo winters." />
    </head><body>Body</body></html>`
    const result = extractText(html)
    expect(result.pageText).toContain('A warm Gore-Tex jacket for Oslo winters.')
  })

  it('decodes HTML entities in extracted text', () => {
    const result = extractText('<html><head><title>Helly &amp; Hansen</title></head><body>x</body></html>')
    expect(result.pageText).toContain('Helly & Hansen')
  })
})

// ── image URL extraction ──────────────────────────────────────────────────────

describe('extractText — image URL extraction', () => {
  it('extracts og:image as the first imageUrl', () => {
    const html = `<html><head>
      <meta property="og:image" content="https://example.com/og.jpg" />
    </head><body><img src="https://example.com/other.jpg" /></body></html>`
    const result = extractText(html)
    expect(result.imageUrls[0]).toBe('https://example.com/og.jpg')
  })

  it('extracts <img src> attributes', () => {
    const html = '<html><body><img src="https://example.com/a.jpg" /><img src="/b.jpg" /></body></html>'
    const result = extractText(html)
    expect(result.imageUrls).toContain('https://example.com/a.jpg')
    expect(result.imageUrls).toContain('/b.jpg')
  })

  it('returns empty imageUrls when no images are present', () => {
    const result = extractText('<html><body>Text only</body></html>')
    expect(result.imageUrls).toEqual([])
  })
})

// ── truncation ────────────────────────────────────────────────────────────────

describe('extractText — truncation', () => {
  it('truncates pageText to 8000 characters', () => {
    const longBody = 'a'.repeat(10000)
    const result = extractText(`<html><body>${longBody}</body></html>`)
    expect(result.pageText.length).toBeLessThanOrEqual(8000)
  })

  it('does not truncate short content', () => {
    const result = extractText('<html><head><title>Short</title></head><body>Body</body></html>')
    expect(result.pageText.length).toBeGreaterThan(0)
    expect(result.pageText.length).toBeLessThanOrEqual(8000)
  })
})

// ── edge cases ────────────────────────────────────────────────────────────────

describe('extractText — edge cases', () => {
  it('handles empty HTML without throwing', () => {
    expect(() => extractText('')).not.toThrow()
    expect(() => extractText('<html></html>')).not.toThrow()
  })

  it('handles malformed HTML without throwing', () => {
    expect(() => extractText('<div><p>Unclosed tags')).not.toThrow()
    expect(() => extractText('<<<>>>')).not.toThrow()
  })
})
