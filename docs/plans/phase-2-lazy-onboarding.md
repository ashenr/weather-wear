# Phase 2 — Lazy Onboarding

**Goal:** Make it easy to populate the wardrobe by pasting product URLs. A Cloud Function scrapes the page and uses Gemini to extract structured clothing data.

**Depends on:** Phase 1 completed (wardrobe CRUD, item form)

**Estimated scope:** ~6 files created/modified

---

## Step 1: `crawlProductUrl` Cloud Function

**What:** Build the function that fetches a product page, extracts text, and uses Gemini to extract structured clothing item data.

**Files to create/modify:**
- `functions/src/onboarding/crawlProductUrl.ts` — main function logic
- `functions/src/onboarding/scraper.ts` — HTML fetching and text extraction
- `functions/src/onboarding/extractionPrompt.ts` — Gemini prompt for product data extraction
- `functions/src/index.ts` — export the new function

**Function signature:**
```typescript
export const crawlProductUrl = onCall(
  { region: "europe-west1" },
  async (request) => { ... }
);
```

**Implementation details:**

### 1a. Input validation
- Validate `url` is present and is a valid HTTP/HTTPS URL
- Reject non-HTTP protocols (javascript:, data:, file:, etc.)
- SSRF prevention:
  - Resolve the hostname via DNS once before fetching, then fetch using the resolved IP (pin the DNS result to prevent DNS rebinding attacks where a hostname resolves to a public IP initially but a private IP on re-resolution)
  - Block private/internal IPv4: RFC 1918 ranges (10.x, 172.16-31.x, 192.168.x), loopback (127.x), link-local (169.254.x)
  - Block private/internal IPv6: loopback (`::1`), unique local addresses (`fc00::/7`), link-local (`fe80::/10`)
  - Block GCP metadata server (`169.254.169.254`)
  - Block non-routable and reserved ranges (0.0.0.0/8, 100.64.0.0/10)

### 1b. HTML Fetching (`scraper.ts`)
- Fetch the URL with:
  - Timeout: 15 seconds
  - Max response body: 2MB
  - User-Agent: a browser-like string (some product pages block bots)
  - Follow redirects (up to 5)
- Handle common errors:
  - Timeout → "Page took too long to load"
  - 404 → "Page not found"
  - 403 → "Page is blocking access"
  - Network error → "Could not reach the page"

### 1c. Text extraction (`scraper.ts`)
- Strip `<script>`, `<style>`, `<noscript>` tags
- Extract meaningful content:
  - `<title>` tag
  - `<meta>` tags (description, og:title, og:image, product-related meta)
  - Main body text content
  - `<img>` tags with src attributes (for product images)
- Truncate extracted text to ~8000 characters to fit within Gemini's context comfortably
- Preserve structure hints (headings, list items) for better extraction

### 1d. Gemini extraction (`extractionPrompt.ts`)
- Use the extraction prompt from the spec
- Call Gemini with `responseMimeType: "application/json"`
- Model: `gemini-2.5-flash-lite` (fast, good at structured extraction)
- Parse and validate with retry:
  1. Parse JSON in a try/catch — if invalid JSON, retry once with stricter prompt
  2. Validate field values:
     - `category` must be one of the valid enum values (or set to `"other"`)
     - `warmthLevel` must be 1–5 (or set to `null`)
     - `waterproof` must be one of `"yes" | "no" | "water-resistant"` (or set to `null`)
  3. If extraction completely fails after retry, return an empty item template with only `sourceUrl` set — user fills in manually
- Resolve relative image URLs to absolute URLs using the source URL as base

### 1e. Return extracted data
- Return the structured item data to the client
- Include `sourceUrl` (the original URL) and `extractedByAI: true`
- Do NOT save to Firestore — the user reviews and edits before saving (handled by frontend)

---

## Step 2: URL-Based Add Item Flow (Frontend)

**What:** Update the add item page to support URL-based entry as the primary flow.

**Files to modify:**
- `src/pages/AddItemPage.tsx` — add URL input section above manual form
- `src/components/wardrobe/ItemForm.tsx` — support pre-population from extracted data

**Files to create:**
- `src/lib/onboarding.ts` — client-side function to call `crawlProductUrl`

**UI flow:**

### 2a. URL input section (top of page)
- Text input for URL with "Extract" button
- Placeholder text: "Paste a product URL from Zalando, Norrøna, Uniqlo, etc."
- Loading state: spinner with "Extracting product details..." message
- Error state: show error message from the function, with option to retry or switch to manual entry
- Tab or toggle: "From URL" / "Manual Entry" (use Chakra v3 `Tabs` component)

### 2b. Preview & edit flow
- After successful extraction, populate the `ItemForm` with extracted data
- Highlight fields that were extracted by AI (subtle visual indicator)
- Fields with `null` values show as empty for user to fill in
- If a product image URL was extracted, show a preview thumbnail
- User reviews all fields, adjusts as needed, then clicks "Save"
- On save: call `addWardrobeItem()` with `extractedByAI: true` and `sourceUrl` set

### 2c. Error handling UX
- If extraction partially fails (some fields null), still show the form with whatever was extracted
- Show a notice: "Some details couldn't be extracted. Please fill in the missing fields."
- If extraction completely fails, offer to switch to manual entry with the URL pre-filled in notes

---

## Step 3: Edge Case Handling

**What:** Handle common failure scenarios gracefully.

**Scenarios to handle:**

| Scenario | Handling |
|---|---|
| Invalid URL format | Client-side validation before calling function |
| Page blocks crawling (403/anti-bot) | Show error: "This site blocked access. Try manual entry instead." |
| Page requires JavaScript (SPA) | Gemini may get empty/minimal content — detect and show: "Couldn't extract details from this page. Try a different URL or enter manually." |
| Very long page (>2MB) | Truncate to 2MB before processing |
| Non-clothing product page | Gemini returns mostly null fields — show form with notice |
| Page in non-English language | Gemini handles multilingual content well — should work for Norwegian/Nordic sites |
| Duplicate URL | Check if `sourceUrl` already exists in wardrobe — warn user but allow adding |
| Rate limiting | Cloud Function enforces per-user rate limit (e.g., 10 extractions per hour) |

---

## Verification Checklist

- [ ] Pasting a valid product URL (e.g., from Zalando) extracts meaningful data
- [ ] Extracted data populates the form correctly for user review
- [ ] User can edit extracted fields before saving
- [ ] Saved item has `extractedByAI: true` and `sourceUrl` set
- [ ] Invalid URLs show clear error messages
- [ ] Pages that block crawling show a helpful fallback message
- [ ] Manual entry still works as before
- [ ] Product image preview displays correctly when available
- [ ] Function handles timeouts and large pages gracefully
- [ ] Build succeeds for both frontend and functions
