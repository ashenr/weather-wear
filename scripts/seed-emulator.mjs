#!/usr/bin/env node
/**
 * Seed test data into the Firebase emulator.
 *
 * Run:   node scripts/seed-emulator.mjs
 *   or   node scripts/seed-emulator.mjs --uid <userId>
 *
 * Requires emulators to be running: ./emulators.sh
 * Sign in to the app first so the Auth emulator has a user to seed data for.
 *
 * Clears then re-seeds:
 *   - users/{USER_ID}/wardrobe   (8 items)
 *   - weatherCache               (8 days ending today)
 *   - users/{USER_ID}/feedback   (7 entries for past 7 days)
 */

const PROJECT = 'smart-display-172af'
const FIRESTORE_BASE = `http://localhost:8080/v1/projects/${PROJECT}/databases/(default)/documents`
const AUTH_BASE = `http://localhost:9099/identitytoolkit.googleapis.com/v1/projects/${PROJECT}`
const HEADERS = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }

/** Resolve the user ID to seed data for.
 *  Priority: --uid CLI arg > first account in Auth emulator */
async function resolveUserId() {
  const uidArgIdx = process.argv.indexOf('--uid')
  if (uidArgIdx !== -1 && process.argv[uidArgIdx + 1]) {
    return process.argv[uidArgIdx + 1]
  }

  const res = await fetch(`${AUTH_BASE}/accounts:query`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({}),
  }).catch(() => null)

  if (!res?.ok) {
    throw new Error('Could not reach Auth emulator on port 9099. Is ./emulators.sh running?')
  }

  const body = await res.json()
  const users = body.userInfo ?? []

  if (users.length === 0) {
    throw new Error(
      'No users found in the Auth emulator.\n' +
      'Sign in to the app at http://localhost:5173 first, then re-run this script.',
    )
  }

  if (users.length > 1) {
    process.stdout.write(`  found ${users.length} auth users — using first: ${users[0].localId} (${users[0].email})\n`)
  }

  return users[0].localId
}

// ---------------------------------------------------------------------------
// Firestore REST API helpers
// ---------------------------------------------------------------------------

function fv(val) {
  if (val === null || val === undefined) return { nullValue: null }
  if (typeof val === 'boolean') return { booleanValue: val }
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val }
  }
  if (typeof val === 'string') return { stringValue: val }
  if (val instanceof Date) return { timestampValue: val.toISOString() }
  if (Array.isArray(val)) return { arrayValue: { values: val.map(fv) } }
  if (typeof val === 'object') {
    const fields = {}
    for (const [k, v] of Object.entries(val)) fields[k] = fv(v)
    return { mapValue: { fields } }
  }
  throw new Error(`Unsupported type: ${typeof val}`)
}

function toDoc(obj) {
  const fields = {}
  for (const [k, v] of Object.entries(obj)) fields[k] = fv(v)
  return { fields }
}

async function setDoc(docPath, data) {
  const url = `${FIRESTORE_BASE}/${docPath}`
  const res = await fetch(url, { method: 'PATCH', headers: HEADERS, body: JSON.stringify(toDoc(data)) })
  if (!res.ok) throw new Error(`PATCH ${docPath} → ${res.status}: ${await res.text()}`)
  process.stdout.write(`  ✓ ${docPath}\n`)
}

/** Delete all docs in a collection (up to the emulator default page size). */
async function clearCollection(collectionPath) {
  const url = `${FIRESTORE_BASE}/${collectionPath}`
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) return
  const body = await res.json()
  if (!body.documents?.length) return
  for (const docMeta of body.documents) {
    const docPath = docMeta.name.split('/documents/')[1]
    await fetch(`${FIRESTORE_BASE}/${docPath}`, { method: 'DELETE', headers: HEADERS })
  }
  process.stdout.write(`  cleared ${body.documents.length} existing doc(s) from ${collectionPath}\n`)
}

// ---------------------------------------------------------------------------
// Date helpers — everything relative to today in Oslo timezone
// ---------------------------------------------------------------------------

/** Returns 'YYYY-MM-DD' for today minus daysAgo, in Europe/Oslo timezone. */
function osloDate(daysAgo = 0) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(d)
}

/**
 * Returns a Date for "the morning after" a given date string.
 * Used for feedback submittedAt (feedback is typically logged the next morning).
 */
function nextMorning(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  // 07:30 UTC the following day (~08:30 Oslo winter / 09:30 summer)
  return new Date(Date.UTC(y, m - 1, d + 1, 7, 30, 0))
}

// Compute date strings for the 8 weather days (today = index 0)
const dates = Array.from({ length: 8 }, (_, i) => osloDate(i))
// dates[0] = today, dates[1] = yesterday, ..., dates[7] = 7 days ago

// ---------------------------------------------------------------------------
// Wardrobe items
// ---------------------------------------------------------------------------

const ITEM_CREATED = new Date(Date.now() - 22 * 24 * 60 * 60 * 1000) // ~3 weeks ago

const wardrobeItems = [
  {
    id: 'item-jacket-01',
    name: 'Arc\'teryx Beta AR',
    category: 'jacket',
    color: 'black',
    material: 'Gore-Tex Pro 3-layer',
    brand: 'Arc\'teryx',
    warmthLevel: 4,
    waterproof: 'water-resistant',
    windproof: true,
    temperatureRange: { min: -15, max: 5 },
    photoUrl: '',
    sourceUrl: '',
    notes: 'Main winter jacket. Excellent waterproofing and windproofing.',
    extractedByAI: false,
    createdAt: ITEM_CREATED,
    updatedAt: ITEM_CREATED,
  },
  {
    id: 'item-jacket-02',
    name: 'Norrøna Falketind Gore-Tex Jacket',
    category: 'jacket',
    color: 'blue',
    material: 'Gore-Tex 3-layer',
    brand: 'Norrøna',
    warmthLevel: 3,
    waterproof: 'yes',
    windproof: true,
    temperatureRange: { min: -10, max: 10 },
    photoUrl: '',
    sourceUrl: '',
    notes: 'Lighter than the Beta AR. Good for active or milder days.',
    extractedByAI: false,
    createdAt: ITEM_CREATED,
    updatedAt: ITEM_CREATED,
  },
  {
    id: 'item-fleece-01',
    name: 'Patagonia R1 Fleece',
    category: 'fleece',
    color: 'grey',
    material: 'Polartec Power Stretch',
    brand: 'Patagonia',
    warmthLevel: 3,
    waterproof: 'no',
    windproof: false,
    temperatureRange: { min: -5, max: 10 },
    photoUrl: '',
    sourceUrl: '',
    notes: 'Breathable mid layer. Pairs well with a shell jacket.',
    extractedByAI: false,
    createdAt: ITEM_CREATED,
    updatedAt: ITEM_CREATED,
  },
  {
    id: 'item-base-01',
    name: 'Icebreaker Merino 200 Base Layer',
    category: 'base-layer',
    color: 'navy',
    material: '100% Merino Wool',
    brand: 'Icebreaker',
    warmthLevel: 2,
    waterproof: 'no',
    windproof: false,
    temperatureRange: { min: -10, max: 5 },
    photoUrl: '',
    sourceUrl: '',
    notes: 'Warm merino base, no itch. Essential on cold days.',
    extractedByAI: false,
    createdAt: ITEM_CREATED,
    updatedAt: ITEM_CREATED,
  },
  {
    id: 'item-sweater-01',
    name: 'Uniqlo Extra Fine Merino Sweater',
    category: 'sweater',
    color: 'dark green',
    material: 'Extra Fine Merino Wool',
    brand: 'Uniqlo',
    warmthLevel: 3,
    waterproof: 'no',
    windproof: false,
    temperatureRange: { min: 0, max: 15 },
    photoUrl: '',
    sourceUrl: '',
    notes: 'Good mid layer for mild days. Can wear as outer on dry-cool days.',
    extractedByAI: false,
    createdAt: ITEM_CREATED,
    updatedAt: ITEM_CREATED,
  },
  {
    id: 'item-hat-01',
    name: 'Merino Wool Beanie',
    category: 'hat',
    color: 'charcoal',
    material: 'Merino Wool',
    brand: 'Generic',
    warmthLevel: 2,
    waterproof: 'no',
    windproof: false,
    temperatureRange: { min: -15, max: 5 },
    photoUrl: '',
    sourceUrl: '',
    notes: 'Warm winter beanie. Covers ears well.',
    extractedByAI: false,
    createdAt: ITEM_CREATED,
    updatedAt: ITEM_CREATED,
  },
  {
    id: 'item-gloves-01',
    name: 'Hestra Waterproof Gloves',
    category: 'gloves',
    color: 'black',
    material: 'Gore-Tex + Wool lining',
    brand: 'Hestra',
    warmthLevel: 3,
    waterproof: 'water-resistant',
    windproof: true,
    temperatureRange: { min: -10, max: 5 },
    photoUrl: '',
    sourceUrl: '',
    notes: 'Essential for windy or wet days. Keeps hands dry.',
    extractedByAI: false,
    createdAt: ITEM_CREATED,
    updatedAt: ITEM_CREATED,
  },
  {
    id: 'item-scarf-01',
    name: 'Merino Wool Scarf',
    category: 'scarf',
    color: 'burgundy',
    material: 'Merino Wool',
    brand: 'Generic',
    warmthLevel: 2,
    waterproof: 'no',
    windproof: false,
    temperatureRange: { min: -15, max: 5 },
    photoUrl: '',
    sourceUrl: '',
    notes: 'Soft and warm. Good for very cold or windy days.',
    extractedByAI: false,
    createdAt: ITEM_CREATED,
    updatedAt: ITEM_CREATED,
  },
]

// ---------------------------------------------------------------------------
// Weather cache — 8 days ending today
//
// Oslo Logic classification (first match wins):
//   warm:       maxTemp > 20
//   dry-mild:   minTemp >= 10, precip < 1
//   dry-cool:   minTemp 5–10, precip < 1
//   windy-cold: minTemp < 5, maxWind > 8
//   wet-slush:  minTemp 0–5, precip >= 2
//   wet-cold:   minTemp -5 to <0, precip >= 1, humidity > 80
//   mild-damp:  minTemp 5–15, precip > 0
//   dry-cold:   minTemp < 0, precip < 1
// ---------------------------------------------------------------------------

function mkPeriod(name, startHour, endHour, p) {
  return { name, startHour, endHour, ...p }
}

// 8 weather profiles indexed 0 (today) → 7 (oldest)
// dates[i] is assigned to profile[i]
const weatherProfiles = [
  // [0] today — wet-cold: minTemp=-2, precip=3.5mm, humidity=88%
  {
    conditionType: 'wet-cold',
    windWarning: false,
    periods: [
      mkPeriod('morning', 6, 9, { temp: -1.5, feelsLike: -3.8, precipitation: 0.8, precipProbability: 70, wind: 4.2, windGust: 6.1, humidity: 90, dewPoint: -3.0, cloudCover: 92, symbol: 'sleet' }),
      mkPeriod('daytime', 9, 15, { temp: 0.5, feelsLike: -1.8, precipitation: 1.5, precipProbability: 85, wind: 5.1, windGust: 7.2, humidity: 88, dewPoint: -1.5, cloudCover: 96, symbol: 'rain' }),
      mkPeriod('afternoon', 15, 18, { temp: 0.8, feelsLike: -1.2, precipitation: 0.7, precipProbability: 75, wind: 4.8, windGust: 6.5, humidity: 87, dewPoint: -1.2, cloudCover: 94, symbol: 'lightrain' }),
      mkPeriod('evening', 18, 21, { temp: -0.5, feelsLike: -2.6, precipitation: 0.5, precipProbability: 60, wind: 4.0, windGust: 5.8, humidity: 89, dewPoint: -2.0, cloudCover: 90, symbol: 'sleet' }),
    ],
    summary: { minTemp: -2.0, maxTemp: 1.0, totalPrecipitation: 3.5, maxWind: 7.2, avgCloudCover: 93.0 },
  },
  // [1] yesterday — dry-cold: minTemp=-4, precip=0.3mm
  {
    conditionType: 'dry-cold',
    windWarning: false,
    periods: [
      mkPeriod('morning', 6, 9, { temp: -3.5, feelsLike: -5.8, precipitation: 0.0, precipProbability: 10, wind: 3.2, windGust: 4.5, humidity: 72, dewPoint: -8.0, cloudCover: 30, symbol: 'partlycloudy_day' }),
      mkPeriod('daytime', 9, 15, { temp: -1.5, feelsLike: -3.2, precipitation: 0.2, precipProbability: 20, wind: 3.8, windGust: 5.2, humidity: 70, dewPoint: -7.5, cloudCover: 45, symbol: 'cloudy' }),
      mkPeriod('afternoon', 15, 18, { temp: -2.0, feelsLike: -3.9, precipitation: 0.1, precipProbability: 15, wind: 3.5, windGust: 5.0, humidity: 71, dewPoint: -7.8, cloudCover: 40, symbol: 'cloudy' }),
      mkPeriod('evening', 18, 21, { temp: -3.0, feelsLike: -5.2, precipitation: 0.0, precipProbability: 10, wind: 3.1, windGust: 4.2, humidity: 73, dewPoint: -8.2, cloudCover: 25, symbol: 'clearsky_night' }),
    ],
    summary: { minTemp: -4.0, maxTemp: -1.0, totalPrecipitation: 0.3, maxWind: 5.2, avgCloudCover: 35.0 },
  },
  // [2] 2 days ago — windy-cold: minTemp=-1, maxWind=15m/s
  {
    conditionType: 'windy-cold',
    windWarning: true,
    periods: [
      mkPeriod('morning', 6, 9, { temp: -0.5, feelsLike: -5.2, precipitation: 0.0, precipProbability: 20, wind: 8.5, windGust: 12.0, humidity: 68, dewPoint: -6.0, cloudCover: 60, symbol: 'partlycloudy_day' }),
      mkPeriod('daytime', 9, 15, { temp: 2.0, feelsLike: -3.1, precipitation: 0.3, precipProbability: 30, wind: 9.8, windGust: 14.5, humidity: 65, dewPoint: -5.5, cloudCover: 55, symbol: 'cloudy' }),
      mkPeriod('afternoon', 15, 18, { temp: 2.5, feelsLike: -2.5, precipitation: 0.2, precipProbability: 25, wind: 10.2, windGust: 15.0, humidity: 63, dewPoint: -5.8, cloudCover: 50, symbol: 'partlycloudy_day' }),
      mkPeriod('evening', 18, 21, { temp: 1.0, feelsLike: -4.0, precipitation: 0.0, precipProbability: 15, wind: 9.1, windGust: 13.2, humidity: 67, dewPoint: -6.2, cloudCover: 45, symbol: 'clearsky_night' }),
    ],
    summary: { minTemp: -1.0, maxTemp: 3.0, totalPrecipitation: 0.5, maxWind: 15.0, avgCloudCover: 52.5 },
  },
  // [3] 3 days ago — wet-slush: minTemp=2, precip=4.2mm
  {
    conditionType: 'wet-slush',
    windWarning: false,
    periods: [
      mkPeriod('morning', 6, 9, { temp: 2.0, feelsLike: 0.5, precipitation: 0.8, precipProbability: 75, wind: 3.5, windGust: 5.2, humidity: 93, dewPoint: 1.0, cloudCover: 98, symbol: 'sleet' }),
      mkPeriod('daytime', 9, 15, { temp: 3.5, feelsLike: 2.2, precipitation: 1.8, precipProbability: 90, wind: 3.0, windGust: 4.5, humidity: 94, dewPoint: 2.5, cloudCover: 99, symbol: 'rain' }),
      mkPeriod('afternoon', 15, 18, { temp: 4.0, feelsLike: 2.8, precipitation: 1.0, precipProbability: 85, wind: 2.8, windGust: 4.0, humidity: 92, dewPoint: 2.8, cloudCover: 97, symbol: 'lightrain' }),
      mkPeriod('evening', 18, 21, { temp: 3.0, feelsLike: 1.6, precipitation: 0.6, precipProbability: 70, wind: 3.2, windGust: 4.8, humidity: 93, dewPoint: 1.8, cloudCover: 98, symbol: 'lightrain' }),
    ],
    summary: { minTemp: 2.0, maxTemp: 5.0, totalPrecipitation: 4.2, maxWind: 5.2, avgCloudCover: 98.0 },
  },
  // [4] 4 days ago — dry-cool: minTemp=6, maxTemp=12, precip=0.2mm
  {
    conditionType: 'dry-cool',
    windWarning: false,
    periods: [
      mkPeriod('morning', 6, 9, { temp: 6.5, feelsLike: 5.8, precipitation: 0.0, precipProbability: 5, wind: 2.5, windGust: 3.8, humidity: 55, dewPoint: -2.0, cloudCover: 20, symbol: 'fair_day' }),
      mkPeriod('daytime', 9, 15, { temp: 10.5, feelsLike: 10.5, precipitation: 0.1, precipProbability: 10, wind: 2.2, windGust: 3.5, humidity: 50, dewPoint: -1.0, cloudCover: 25, symbol: 'partlycloudy_day' }),
      mkPeriod('afternoon', 15, 18, { temp: 11.5, feelsLike: 11.5, precipitation: 0.1, precipProbability: 10, wind: 2.0, windGust: 3.2, humidity: 48, dewPoint: -1.5, cloudCover: 30, symbol: 'partlycloudy_day' }),
      mkPeriod('evening', 18, 21, { temp: 8.0, feelsLike: 7.5, precipitation: 0.0, precipProbability: 5, wind: 2.8, windGust: 4.0, humidity: 52, dewPoint: -1.8, cloudCover: 15, symbol: 'clearsky_night' }),
    ],
    summary: { minTemp: 6.0, maxTemp: 12.0, totalPrecipitation: 0.2, maxWind: 3.8, avgCloudCover: 22.5 },
  },
  // [5] 5 days ago — mild-damp: minTemp=7, precip=1.8mm
  {
    conditionType: 'mild-damp',
    windWarning: false,
    periods: [
      mkPeriod('morning', 6, 9, { temp: 7.5, feelsLike: 6.8, precipitation: 0.3, precipProbability: 40, wind: 2.8, windGust: 4.2, humidity: 75, dewPoint: 3.5, cloudCover: 75, symbol: 'cloudy' }),
      mkPeriod('daytime', 9, 15, { temp: 10.5, feelsLike: 10.5, precipitation: 0.8, precipProbability: 60, wind: 2.5, windGust: 3.8, humidity: 72, dewPoint: 5.0, cloudCover: 80, symbol: 'lightrain' }),
      mkPeriod('afternoon', 15, 18, { temp: 11.5, feelsLike: 11.5, precipitation: 0.5, precipProbability: 50, wind: 2.2, windGust: 3.5, humidity: 70, dewPoint: 5.5, cloudCover: 70, symbol: 'cloudy' }),
      mkPeriod('evening', 18, 21, { temp: 9.0, feelsLike: 8.5, precipitation: 0.2, precipProbability: 35, wind: 3.0, windGust: 4.5, humidity: 73, dewPoint: 4.0, cloudCover: 78, symbol: 'cloudy' }),
    ],
    summary: { minTemp: 7.0, maxTemp: 12.0, totalPrecipitation: 1.8, maxWind: 4.2, avgCloudCover: 75.75 },
  },
  // [6] 6 days ago — dry-cold: minTemp=-6, precip=0.0mm
  {
    conditionType: 'dry-cold',
    windWarning: false,
    periods: [
      mkPeriod('morning', 6, 9, { temp: -5.5, feelsLike: -8.2, precipitation: 0.0, precipProbability: 5, wind: 3.8, windGust: 5.5, humidity: 65, dewPoint: -11.0, cloudCover: 15, symbol: 'clearsky_day' }),
      mkPeriod('daytime', 9, 15, { temp: -2.5, feelsLike: -5.1, precipitation: 0.0, precipProbability: 5, wind: 3.5, windGust: 5.0, humidity: 63, dewPoint: -10.5, cloudCover: 20, symbol: 'fair_day' }),
      mkPeriod('afternoon', 15, 18, { temp: -3.0, feelsLike: -5.8, precipitation: 0.0, precipProbability: 5, wind: 3.8, windGust: 5.5, humidity: 64, dewPoint: -10.8, cloudCover: 25, symbol: 'partlycloudy_day' }),
      mkPeriod('evening', 18, 21, { temp: -5.0, feelsLike: -7.8, precipitation: 0.0, precipProbability: 5, wind: 3.5, windGust: 5.0, humidity: 66, dewPoint: -11.2, cloudCover: 10, symbol: 'clearsky_night' }),
    ],
    summary: { minTemp: -6.0, maxTemp: -2.0, totalPrecipitation: 0.0, maxWind: 5.5, avgCloudCover: 17.5 },
  },
  // [7] 7 days ago — wet-cold: minTemp=-3, precip=2.5mm, humidity=87%
  {
    conditionType: 'wet-cold',
    windWarning: false,
    periods: [
      mkPeriod('morning', 6, 9, { temp: -2.5, feelsLike: -5.0, precipitation: 0.5, precipProbability: 65, wind: 3.8, windGust: 5.5, humidity: 88, dewPoint: -4.2, cloudCover: 92, symbol: 'sleet' }),
      mkPeriod('daytime', 9, 15, { temp: -0.5, feelsLike: -2.8, precipitation: 1.0, precipProbability: 80, wind: 4.5, windGust: 6.5, humidity: 87, dewPoint: -2.5, cloudCover: 96, symbol: 'sleet' }),
      mkPeriod('afternoon', 15, 18, { temp: -0.2, feelsLike: -2.4, precipitation: 0.7, precipProbability: 75, wind: 4.2, windGust: 6.0, humidity: 86, dewPoint: -2.8, cloudCover: 94, symbol: 'lightrain' }),
      mkPeriod('evening', 18, 21, { temp: -1.5, feelsLike: -3.8, precipitation: 0.3, precipProbability: 60, wind: 3.8, windGust: 5.5, humidity: 88, dewPoint: -3.5, cloudCover: 90, symbol: 'sleet' }),
    ],
    summary: { minTemp: -3.0, maxTemp: 0.0, totalPrecipitation: 2.5, maxWind: 6.5, avgCloudCover: 93.0 },
  },
]

// ---------------------------------------------------------------------------
// Feedback — 7 entries for days[1..7] (yesterday through 7 days ago)
// submittedAt = morning after the feedback day
// ---------------------------------------------------------------------------

const feedbackProfiles = [
  // [1] yesterday — dry-cold
  {
    itemsWorn: ['item-jacket-01', 'item-base-01', 'item-fleece-01', 'item-hat-01'],
    comfortRating: 'slightly-cold',
    note: 'Cold in the morning commute. Should have added the scarf.',
  },
  // [2] 2 days ago — windy-cold
  {
    itemsWorn: ['item-jacket-01', 'item-base-01', 'item-fleece-01', 'item-hat-01', 'item-gloves-01'],
    comfortRating: 'just-right',
    note: 'The gloves made a big difference against the wind.',
  },
  // [3] 3 days ago — wet-slush
  {
    itemsWorn: ['item-jacket-01', 'item-fleece-01', 'item-hat-01', 'item-gloves-01'],
    comfortRating: 'just-right',
    note: 'Staying dry was the key. Good call on the Arc\'teryx.',
  },
  // [4] 4 days ago — dry-cool
  {
    itemsWorn: ['item-jacket-02', 'item-sweater-01'],
    comfortRating: 'slightly-warm',
    note: 'The sweater was almost too much by lunchtime. Could have gone without.',
  },
  // [5] 5 days ago — mild-damp
  {
    itemsWorn: ['item-jacket-02', 'item-sweater-01'],
    comfortRating: 'just-right',
    note: null,
  },
  // [6] 6 days ago — dry-cold
  {
    itemsWorn: ['item-jacket-01', 'item-base-01', 'item-fleece-01'],
    comfortRating: 'slightly-cold',
    note: 'Should have added the hat. Ears were freezing.',
  },
  // [7] 7 days ago — wet-cold
  {
    itemsWorn: ['item-jacket-01', 'item-base-01', 'item-fleece-01', 'item-hat-01', 'item-gloves-01', 'item-scarf-01'],
    comfortRating: 'just-right',
    note: 'Full kit needed. The scarf was essential.',
  },
]

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding Firebase emulator...\n')

  const USER_ID = await resolveUserId()
  console.log(`User ID:      ${USER_ID}`)
  console.log(`Today (Oslo): ${dates[0]}\n`)

  // 1. Clear existing data
  console.log('=== Clearing existing data ===')
  await clearCollection(`users/${USER_ID}/wardrobe`)
  await clearCollection('weatherCache')
  await clearCollection(`users/${USER_ID}/feedback`)

  // 2. Wardrobe items
  console.log('\n=== Wardrobe Items ===')
  for (const { id, ...data } of wardrobeItems) {
    await setDoc(`users/${USER_ID}/wardrobe/${id}`, data)
  }

  // 3. Weather cache — dates[0]=today through dates[7]=7 days ago
  console.log('\n=== Weather Cache ===')
  for (let i = 0; i < weatherProfiles.length; i++) {
    const date = dates[i]
    const { conditionType, windWarning, periods, summary } = weatherProfiles[i]
    await setDoc(`weatherCache/${date}`, {
      date,
      fetchedAt: new Date(`${date}T05:10:00Z`).toISOString(),
      yrnoUpdatedAt: new Date(`${date}T05:00:00Z`).toISOString(),
      conditionType,
      windWarning,
      periods,
      summary,
    })
  }

  // 4. Feedback — dates[1]=yesterday through dates[7]=7 days ago
  console.log('\n=== Feedback ===')
  for (let i = 0; i < feedbackProfiles.length; i++) {
    const date = dates[i + 1] // skip today (index 0), feedback starts from yesterday
    const weather = weatherProfiles[i + 1]
    const { itemsWorn, comfortRating, note } = feedbackProfiles[i]
    await setDoc(`users/${USER_ID}/feedback/${date}`, {
      date,
      submittedAt: nextMorning(date),
      itemsWorn,
      comfortRating,
      conditionType: weather.conditionType,
      weatherSummary: weather.summary,
      note,
    })
  }

  console.log(`
Done!
  ${wardrobeItems.length} wardrobe items
  ${weatherProfiles.length} weather days  (${dates[7]} → ${dates[0]}, today is ${weatherProfiles[0].conditionType})
  ${feedbackProfiles.length} feedback entries (${dates[7]} → ${dates[1]})
`)
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message)
  process.exit(1)
})
