import type {SuggestionData, SuggestionLayer} from './types.js'

export function validateLayer(
  layer: unknown,
  wardrobeIds: Set<string>
): SuggestionLayer | null {
  if (layer === null || layer === undefined) return null
  if (typeof layer !== 'object') return null
  const l = layer as Record<string, unknown>
  if (typeof l['itemId'] !== 'string' || !wardrobeIds.has(l['itemId'])) return null
  return {
    itemId: l['itemId'],
    name: typeof l['name'] === 'string' ? l['name'] : undefined,
    reasoning: typeof l['reasoning'] === 'string' ? l['reasoning'] : '',
  }
}

export function parseAndValidate(
  raw: unknown,
  wardrobeIds: Set<string>
): SuggestionData {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Response is not an object')
  }
  const r = raw as Record<string, unknown>
  if (typeof r['overallAdvice'] !== 'string' || !r['overallAdvice']) {
    throw new Error('Missing overallAdvice')
  }

  const accessories: SuggestionLayer[] = Array.isArray(r['accessories'])
    ? (r['accessories'] as unknown[])
        .map((a) => validateLayer(a, wardrobeIds))
        .filter((a): a is SuggestionLayer => a !== null)
    : []

  return {
    baseLayer: validateLayer(r['baseLayer'], wardrobeIds),
    midLayer: validateLayer(r['midLayer'], wardrobeIds),
    outerLayer: validateLayer(r['outerLayer'], wardrobeIds),
    accessories,
    overallAdvice: r['overallAdvice'] as string,
  }
}
