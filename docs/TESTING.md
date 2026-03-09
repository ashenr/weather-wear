# Testing Strategy

## Framework Choices

| Layer | Framework | Rationale |
|-------|-----------|-----------|
| Backend unit tests | Vitest | Fast, same API as frontend runner; single test framework across the project |
| Backend integration | Vitest + firebase-functions-test + emulators | Tests Cloud Functions with real Firestore reads/writes against emulator |
| Frontend components | Vitest + React Testing Library | Vitest is Vite-native (shares config/transforms); RTL tests user behavior, not implementation |
| Frontend data layer | Vitest | Same runner as component tests; mock Firebase SDK |
| E2E | Manual checklists (deferred) | Structured manual testing is sufficient for this single-user application |

## Dependencies

### Backend (`functions/package.json` devDependencies)

```
vitest
```

`firebase-functions-test` is already available.

### Frontend (root `package.json` devDependencies)

```
vitest
@testing-library/react
@testing-library/jest-dom
@testing-library/user-event
jsdom
```

## Test Scripts

### Backend (`functions/package.json`)

```json
{
  "test": "vitest run",
  "test:unit": "vitest run test/unit",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

### Frontend (root `package.json`)

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

## Test File Organization

### Backend — separate `test/` directory

Tests live outside `src/` to avoid inclusion in the compiled `lib/` build output.

```
functions/
  src/
    weather/
      osloLogic.ts
      aggregate.ts
      ...
    feedback/
      validateInput.ts   ← extracted validators (unit-tested)
      submitFeedback.ts
      types.ts
  test/
    unit/
      weather/
        osloLogic.test.ts          ✓ done (45 tests)
        aggregate.test.ts          ✓ done (26 tests)
        feelsLike.test.ts          ✓ done (14 tests)
      suggestion/
        buildPrompt.test.ts        ✓ done (16 tests)
        validateResponse.test.ts   ✓ done (18 tests)
      onboarding/
        ssrf.test.ts               ✓ done (15 tests)
        scraper.test.ts            ✓ done (15 tests)
        validateExtraction.test.ts ✓ done (21 tests)
      feedback/
        validateInput.test.ts      ✓ done (42 tests)
    integration/
      weather/
        fetchWeather.test.ts       TODO
      suggestion/
        getDailySuggestion.test.ts TODO
      onboarding/
        crawlProductUrl.test.ts    TODO
      feedback/
        submitFeedback.test.ts     TODO
    fixtures/
      yrno-response.json
      gemini-suggestion-response.json
      gemini-extraction-response.json
      wardrobe-items.json
      weather-cache-entry.json
    helpers/
      emulator-setup.ts
      mock-gemini.ts
      factories.ts
  vitest.config.ts
```

### Frontend — co-located with source

```
src/
  components/
    SuggestionCard.tsx
    SuggestionCard.test.tsx        ✓ done (9 tests)
    feedback/
      ComfortRatingSelector.tsx
      ComfortRatingSelector.test.tsx ✓ done (5 tests)
      WornItemsSelector.tsx
      WornItemsSelector.test.tsx   ✓ done (9 tests)
    wardrobe/
      ItemForm.tsx
      ItemForm.test.tsx            ✓ done (8 tests)
  test/
    setup.ts
    test-utils.tsx
```

**Naming convention:** `*.test.ts` / `*.test.tsx`

---

## Automated Tests — What to Test

### Priority 1: Write During Phase 0 (CRITICAL) — DONE

#### Oslo Logic Classification (`osloLogic.test.ts`) — 45 tests

Core business logic — deterministic rules with boundary conditions. The spec requires unit tests before deployment.

- Each of the 9 classification rules (happy path)
- Boundary values: `maxTemp` exactly 20, `minTemp` exactly 0/5/10, `precipitation` exactly 1mm, `wind` exactly 8 m/s, `humidity` exactly 80%
- First-match-wins ordering (e.g., warm takes precedence over dry-mild)
- `windWarning` flag set independently of primary classification
- Humidity averaging across periods
- Note: `minTemp` exactly 15 with precipitation results in `mild-damp` via fallback (not the mild-damp rule itself, which uses `< 15`)

#### Weather Aggregation (`aggregate.test.ts`) — 26 tests

Pure math on arrays — incorrect averaging cascades into wrong classifications.

- Period grouping (06-09, 09-15, 15-18, 18-21) for both CET and CEST
- Excluding hours outside 06:00–21:00
- UTC to `Europe/Oslo` timezone conversion (CET winter, CEST summer)
- DST transition days (spring CET→CEST, autumn CEST→CET)
- Aggregation math: averages, sums, max, most-frequent symbol
- Fallback from `next_1_hours` to `next_6_hours` when unavailable
- Empty period handling (zero defaults, `cloudy` symbol)
- Daily summary derivation (min/max temp, total precip, max wind, avg cloud)
- Rounding to 1 decimal place
- Date filtering with UTC midnight crossing

#### Feels-Like Temperature (`feelsLike.test.ts`) — 14 tests

Wind chill formula tested indirectly through `aggregateForDate` (the `calculateFeelsLike` function is module-private).

- Formula applied when temp < 10°C and wind > 1.3 m/s
- Returns raw temp when thresholds not met
- Known reference values (e.g., -10°C at 20 km/h ~= -17.9°C)
- Threshold boundaries (exactly 10°C, exactly 1.3 m/s, just above 1.3 m/s)
- Confirms feelsLike is always lower than actual temp when formula applies

#### `fetchWeather` Integration (`fetchWeather.test.ts`) — TODO

Full pipeline against Firestore emulator. Mock yr.no via `vi.spyOn(globalThis, "fetch")`.

- Fetches, aggregates, classifies, and writes to `weatherCache/{date}`
- Correct User-Agent header
- Error handling (yr.no down, timeout)
- ~5 test cases

### Priority 2: Write During Phase 1

#### Gemini Response Validation (`validateResponse.test.ts`)

Data integrity boundary between non-deterministic AI output and the app.

- Valid response accepted
- Invalid `itemId` references rejected
- Missing required fields rejected
- Null/empty accessories handled
- ~12 test cases

#### Prompt Building (`buildPrompt.test.ts`)

- All template variables substituted
- Empty feedback handled gracefully
- Feedback limited to last 14 days
- ~10 test cases

#### Comfort Tendency (`deriveComfortTendency.test.ts`)

- "still adapting" when < 3 entries
- Correct cold/warm/balanced derivation
- ~6 test cases

#### `getDailySuggestion` Integration

- Returns cached suggestion if exists
- Generates new when no cache
- Validates itemIds against wardrobe
- Falls back to text-only on invalid Gemini response
- Empty wardrobe returns error
- ~7 test cases

### Priority 3: Write During Phase 2

#### SSRF IP Blocking (`ssrf.test.ts`)

Security boundary — regression suite for IP validation.

- IPv4: RFC 1918 (10.x, 172.16-31.x, 192.168.x), loopback (127.x), link-local (169.254.x)
- IPv6: loopback (`::1`), unique local (`fc00::/7`), link-local (`fe80::/10`)
- GCP metadata (169.254.169.254), non-routable (0.0.0.0/8), shared (100.64.0.0/10)
- Valid public IPs allowed
- ~18 test cases

#### Scraper (`scraper.test.ts`)

- Script/style/noscript tag removal
- Meta tag extraction (og:title, og:image)
- Truncation to ~8000 characters
- Malformed HTML handling
- ~10 test cases

#### Extraction Validation (`validateExtraction.test.ts`)

- Invalid category coerced to "other"
- warmthLevel outside 1-5 set to null
- Relative photoUrl resolved to absolute
- ~8 test cases

### Priority 4: Write During Phase 3

#### Feedback Input Validation (`validateInput.test.ts`) — DONE (42 tests)

Pure validators extracted from `submitFeedback.ts` for unit testability.

- `isValidDateStr` — format regex, leap-year handling, roll-over guard (Feb 30)
- `isNotInFuture` — today accepted, tomorrow rejected
- `isWithinDaysAgo` — exactly 7 days accepted, 8 days rejected
- `isValidComfortRating` — all 5 values, unknown strings, non-string types
- `validateFeedbackInput` — every invalid field combination, boundary values

#### `submitFeedback` Integration (TODO)

- Stores feedback with weather snapshot
- Validates itemsWorn IDs exist
- Rejects future dates and dates > 7 days past
- Overwrites existing feedback for same date
- ~6 test cases

### Priority 5: Write During Phase 0–3 (Frontend)

#### Component Tests — DONE (31 tests total)

- `SuggestionCard` — layer display, null layers, accessories, fallback badge (9 tests)
- `ItemForm` — required field validation, pre-population for editing (8 tests)
- `ComfortRatingSelector` — all 5 options render, onChange fired with correct value (5 tests)
- `WornItemsSelector` — grouped by category, select/deselect, empty state, ordering (9 tests)

---

## Mocking Strategy

### yr.no API

Mock `globalThis.fetch` via `vi.spyOn`. Use a captured fixture file (`test/fixtures/yrno-response.json`) trimmed to one day's timeseries.

```bash
# Capture fixture
curl -H "User-Agent: SmartDisplay/1.0 github.com/ashenw/smart-display" \
  "https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=59.9139&lon=10.7522" \
  | jq '.properties.timeseries[:24]' > functions/test/fixtures/yrno-response.json
```

### Gemini API

Mock the SDK client at the module level, not HTTP level. Create a factory in `test/helpers/mock-gemini.ts`:

```typescript
export function createMockGeminiModel(responseText: string) {
  return {
    generateContent: vi.fn().mockResolvedValue({
      response: { text: () => responseText },
    }),
  };
}
```

Variants: valid JSON, invalid JSON (test retry), hallucinated itemIds (test validation).

### Firestore (unit tests)

Not mocked — pure functions (Oslo Logic, aggregation, feels-like) take plain data and return plain data. No Firestore dependency.

### Firestore (integration tests)

Use the real Firestore emulator. Seed with helpers, clear between tests:

```typescript
// Clear via emulator REST endpoint
await fetch(
  "http://127.0.0.1:8080/emulator/v1/projects/smart-display-172af/databases/(default)/documents",
  { method: "DELETE" }
);
```

### Firebase Auth (integration tests)

Use `firebase-functions-test` to create authenticated context:

```typescript
const wrapped = testEnv.wrap(getDailySuggestion);
await wrapped({}, { auth: { uid: "test-user-id", token: {} } });
```

---

## Test Data — Factory Functions

Use factory functions for readable, maintainable test data:

```typescript
// test/helpers/factories.ts
export function makeSummary(overrides: Partial<DailySummary> = {}): DailySummary {
  return { minTemp: 2, maxTemp: 8, totalPrecipitation: 0.5, maxWind: 5, avgCloudCover: 60, ...overrides };
}

export function makePeriod(overrides: Partial<PeriodData> = {}): PeriodData {
  return { name: 'morning', startHour: 6, endHour: 9, temp: 3, feelsLike: 1,
           precipitation: 0, wind: 4, windGust: 7, humidity: 70, ... , ...overrides };
}

export function makeTimeseries(time: string, overrides = {}): YrnoTimeseries {
  // Builds a full yr.no timeseries entry with instant details + next_1_hours/next_6_hours
  // Supports: temp, humidity, dewPoint, wind, gust, cloudCover, precipitation, precipProb,
  //           symbol, useNext6Hours (boolean to use next_6_hours instead of next_1_hours)
}
```

Only relevant overrides appear in each test — defaults are sensible. The `makeTimeseries` factory is
particularly useful for aggregation tests, as it builds valid yr.no entries with a single call.

---

## Configuration Files

### Backend: `functions/vitest.config.ts`

```typescript
import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    root: '.',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/**/types.ts'],
    },
  },
})
```

### Frontend: Vitest config in `vite.config.ts`

```typescript
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/test/**", "src/vite-env.d.ts", "src/main.tsx"],
    },
  },
});
```

### Frontend: `src/test/setup.ts`

```typescript
import "@testing-library/jest-dom/vitest";
```

---

## Running Integration Tests

Integration tests require Firebase emulators running:

```bash
# Terminal 1: start emulators
firebase emulators:start --only firestore,auth

# Terminal 2: run integration tests
cd functions && npm run test:integration
```

Or use `firebase emulators:exec` to run in one command:

```bash
firebase emulators:exec --only firestore,auth \
  "cd functions && npm run test:integration" \
  --project smart-display-172af
```

---

## Manual Testing

### Structured Checklists

Each phase plan (`docs/plans/phase-*.md`) includes a verification checklist. These serve as the manual testing protocol. Key manual tests:

| Area | Test | Steps |
|------|------|-------|
| Weather | Fetch and display | Trigger fetchWeather, verify data in Firestore and on dashboard |
| Weather | Timezone | Verify periods align with CET/CEST for current season |
| Weather | Classification | Compare `conditionType` against actual Oslo weather |
| Suggestion | Generation | Add 3+ wardrobe items, request suggestion, verify item references |
| Suggestion | Caching | Request twice — second should be instant |
| Suggestion | Empty wardrobe | Request with no items — should show helpful error |
| Wardrobe | URL extraction | Paste Zalando/Norrona URL, verify extracted fields |
| Wardrobe | Blocked site | Paste URL from bot-blocking site — should show fallback |
| Wardrobe | CRUD | Add, edit, delete items — verify Firestore state |
| Feedback | Submission | Select items, rate comfort, verify Firestore doc |
| Feedback | Effect | Submit 5+ "too-cold" ratings, verify suggestion adapts |
| Auth | Login/logout | Google sign-in, session persistence, sign-out |
| Auth | Protection | Access dashboard URL while logged out — should redirect |
| Mobile | Responsive | Test all pages on mobile viewport (375px width) |

### Browser Testing

- Primary: Chrome (desktop + mobile emulation)
- Secondary: Safari (iOS — likely primary real-world usage for morning phone check)
- Test "Add to Home Screen" PWA behavior on iOS Safari (Phase 4)

---

## Coverage Targets

Practical targets — protect against real breakage, not arbitrary numbers.

| Module | Target | Rationale |
|--------|--------|-----------|
| Oslo Logic | 100% | Core business logic, deterministic, fully testable |
| Aggregation | >90% | Pure math, high confidence needed |
| Feels-like calc | 100% | Known formula with specific thresholds |
| SSRF blocking | 100% | Security boundary |
| Gemini validation | >90% | Data integrity boundary |
| Prompt building | >80% | String construction, lower risk |
| Cloud Functions | >70% | Happy paths + key error paths |
| Frontend components | >60% | Behavior testing, not implementation |

---

## CI Pipeline (Future)

Not implementing now, but the test architecture supports it:

```yaml
# .github/workflows/test.yml
jobs:
  backend-unit:
    steps:
      - run: cd functions && npm ci && npm run test:unit

  backend-integration:
    steps:
      - run: npm install -g firebase-tools
      - run: cd functions && npm ci
      - run: firebase emulators:exec --only firestore,auth "cd functions && npm test"

  frontend:
    steps:
      - run: npm ci && npx vitest run --coverage

  lint:
    steps:
      - run: npm ci && npm run lint
      - run: cd functions && npm ci && npm run lint
```

Unit tests run without emulators (fast). Integration tests use `emulators:exec`. Separate jobs for fast feedback.

---

## Current Test Status

### Backend unit tests (`functions/`)

| Test file | Tests | Status |
| --------- | ----- | ------ |
| `test/unit/weather/osloLogic.test.ts` | 45 | Done |
| `test/unit/weather/aggregate.test.ts` | 26 | Done |
| `test/unit/weather/feelsLike.test.ts` | 14 | Done |
| `test/unit/suggestion/buildPrompt.test.ts` | 16 | Done |
| `test/unit/suggestion/validateResponse.test.ts` | 18 | Done |
| `test/unit/onboarding/ssrf.test.ts` | 15 | Done |
| `test/unit/onboarding/scraper.test.ts` | 15 | Done |
| `test/unit/onboarding/validateExtraction.test.ts` | 21 | Done |
| `test/unit/feedback/validateInput.test.ts` | 42 | Done |
| `test/integration/weather/fetchWeather.test.ts` | ~5 | TODO |
| `test/integration/suggestion/getDailySuggestion.test.ts` | ~7 | TODO |
| `test/integration/onboarding/crawlProductUrl.test.ts` | ~5 | TODO |
| `test/integration/feedback/submitFeedback.test.ts` | ~6 | TODO |

**Backend total: 212 unit tests, all passing (~200ms runtime).**

### Frontend tests (`src/`)

| Test file | Tests | Status |
| --------- | ----- | ------ |
| `src/components/SuggestionCard.test.tsx` | 9 | Done |
| `src/components/wardrobe/ItemForm.test.tsx` | 8 | Done |
| `src/components/feedback/ComfortRatingSelector.test.tsx` | 5 | Done |
| `src/components/feedback/WornItemsSelector.test.tsx` | 9 | Done |

**Frontend total: 31 tests, all passing (~2.7s runtime).**
