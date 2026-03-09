export interface ExtractedItem {
  name: string | null
  category: string | null
  color: string | null
  material: string | null
  brand: string | null
  warmthLevel: number | null
  waterproof: string | null
  windproof: boolean | null
  temperatureRange: {min: number; max: number} | null
  photoUrl: string | null
  sourceUrl: string
  extractedByAI: true
}

const VALID_CATEGORIES = new Set([
  'jacket',
  'sweater',
  'fleece',
  'base-layer',
  'trousers',
  'hat',
  'gloves',
  'scarf',
  'other',
])
const VALID_WATERPROOF = new Set(['yes', 'no', 'water-resistant'])

export function buildExtractionPrompt(pageText: string): string {
  return `You are a clothing product data extractor. Given the raw text content from a product web page, extract the following structured information about the clothing item.

Return a JSON object with these fields:
- name: Product name (string or null)
- category: One of [jacket, sweater, fleece, base-layer, trousers, hat, gloves, scarf, other] (or null if unclear)
- color: Primary color (string or null)
- material: Main fabric/material e.g. "Gore-Tex", "merino wool", "polyester fleece" (string or null)
- brand: Brand name (string or null)
- warmthLevel: Integer 1–5 based on the product description (1 = ultralight summer, 2 = light spring/fall, 3 = moderate cold, 4 = cold winter, 5 = extreme cold) (or null)
- waterproof: One of ["yes", "no", "water-resistant"] (or null)
- windproof: boolean (or null)
- temperatureRange: { "min": number, "max": number } in Celsius — estimate the comfortable temperature range (or null)
- photoUrl: Main product image URL if found in the page content (or null)

If any field cannot be determined from the page content, set it to null.

PAGE CONTENT:
${pageText}`
}

export function validateAndCoerce(raw: Record<string, unknown>, sourceUrl: string): ExtractedItem {
  const warmthRaw = raw['warmthLevel']
  let warmthLevel: number | null = null
  if (typeof warmthRaw === 'number' && warmthRaw >= 1 && warmthRaw <= 5) {
    warmthLevel = Math.round(warmthRaw)
  }

  const tempRaw = raw['temperatureRange']
  let temperatureRange: {min: number; max: number} | null = null
  if (
    tempRaw !== null &&
    typeof tempRaw === 'object' &&
    typeof (tempRaw as Record<string, unknown>)['min'] === 'number' &&
    typeof (tempRaw as Record<string, unknown>)['max'] === 'number'
  ) {
    temperatureRange = tempRaw as {min: number; max: number}
  }

  const categoryRaw = raw['category']
  const waterproofRaw = raw['waterproof']

  return {
    name: typeof raw['name'] === 'string' ? raw['name'] : null,
    // Unknown categories fall back to "other" (a valid enum value) rather than null,
    // so the user can still save the item without being forced to pick a category.
    category: typeof categoryRaw === 'string' && VALID_CATEGORIES.has(categoryRaw) ? categoryRaw : 'other',
    color: typeof raw['color'] === 'string' ? raw['color'] : null,
    material: typeof raw['material'] === 'string' ? raw['material'] : null,
    brand: typeof raw['brand'] === 'string' ? raw['brand'] : null,
    warmthLevel,
    waterproof:
      typeof waterproofRaw === 'string' && VALID_WATERPROOF.has(waterproofRaw) ? waterproofRaw : null,
    windproof: typeof raw['windproof'] === 'boolean' ? raw['windproof'] : null,
    temperatureRange,
    photoUrl: typeof raw['photoUrl'] === 'string' && raw['photoUrl'] ? raw['photoUrl'] : null,
    sourceUrl,
    extractedByAI: true,
  }
}
