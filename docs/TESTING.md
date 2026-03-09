# Testing Strategy

## Framework Choices

| Layer | Framework | Rationale |
|-------|-----------|-----------|
| Backend unit tests | Jest + ts-jest | `firebase-functions-test` already installed (requires Jest); Jest available as transitive dep |
| Backend integration | Jest + firebase-functions-test + emulators | Tests Cloud Functions with real Firestore reads/writes against emulator |
| Frontend components | Vitest + React Testing Library | Vitest is Vite-native (shares config/transforms); RTL tests user behavior, not implementation |
| Frontend data layer | Vitest | Same runner as component tests; mock Firebase SDK |
| E2E | Manual checklists (deferred) | Structured manual testing is sufficient for this single-user application |

## Dependencies

### Backend (`functions/package.json` devDependencies)

```
ts-jest
@types/jest
```

`firebase-functions-test` and Jest are already available.

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
  "test": "jest",
  "test:unit": "jest --selectProjects unit",
  "test:integration": "jest --selectProjects integration",
  "test:coverage": "jest --coverage",
  "test:watch": "jest --watch --selectProjects unit"
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
  test/
    unit/
      weather/
        osloLogic.test.ts
        aggregate.test.ts
        feelsLike.test.ts
      suggestion/
        buildPrompt.test.ts
        validateResponse.test.ts
      onboarding/
        ssrf.test.ts
        scraper.test.ts
        validateExtraction.test.ts
      feedback/
        deriveComfortTendency.test.ts
    integration/
      weather/
        fetchWeather.test.ts
      suggestion/
        getDailySuggestion.test.ts
      onboarding/
        crawlProductUrl.test.ts
      feedback/
        submitFeedback.test.ts
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
  jest.config.ts
```

### Frontend — co-located with source

```
src/
  components/
    WeatherCard.tsx
    WeatherCard.test.tsx
    SuggestionCard.tsx
    SuggestionCard.test.tsx
    wardrobe/
      ItemForm.tsx
      ItemForm.test.tsx
  lib/
    wardrobe.ts
    wardrobe.test.ts
  test/
    setup.ts
    test-utils.tsx
```

**Naming convention:** `*.test.ts` / `*.test.tsx`

---

## Automated Tests — What to Test

### Priority 1: Write During Phase 0 (CRITICAL)

#### Oslo Logic Classification (`osloLogic.test.ts`)

Core business logic — deterministic rules with boundary conditions. The spec requires unit tests before deployment.

- Each of the 9 classification rules (happy path)
- Boundary values: `maxTemp` exactly 20, `minTemp` exactly 0/5/10, `precipitation` exactly 1mm, `wind` exactly 8 m/s, `humidity` exactly 80%
- First-match-wins ordering (e.g., warm takes precedence over dry-mild)
- `windWarning` flag set independently of primary classification
- ~30 test cases

#### Weather Aggregation (`aggregate.test.ts`)

Pure math on arrays — incorrect averaging cascades into wrong classifications.

- Period grouping (06-09, 09-15, 15-18, 18-21)
- Excluding hours outside 06:00–21:00
- UTC to `Europe/Oslo` timezone conversion (CET winter, CEST summer)
- DST transition days (last Sunday of March/October)
- Aggregation math: averages, sums, max, most-frequent symbol
- Fallback from `next_1_hours` to `next_6_hours` when unavailable
- ~25 test cases

#### Feels-Like Temperature (`feelsLike.test.ts`)

Wind chill formula with specific threshold conditions.

- Formula applied when temp < 10°C and wind > 1.3 m/s
- Returns raw temp when thresholds not met
- Known reference values (e.g., -10°C at 20 km/h ~= -17.9°C)
- m/s to km/h conversion correctness
- Threshold boundaries (exactly 10°C, exactly 1.3 m/s)
- ~12 test cases

#### `fetchWeather` Integration (`fetchWeather.test.ts`)

Full pipeline against Firestore emulator. Mock yr.no via `jest.spyOn(globalThis, "fetch")`.

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

#### `submitFeedback` Integration

- Stores feedback with weather snapshot
- Validates itemsWorn IDs exist
- Rejects future dates and dates > 7 days past
- Overwrites existing feedback for same date
- ~6 test cases

### Priority 5: Write During Phase 0–3 (Frontend)

#### Component Tests

Start with the most complex display and input components:

- `WeatherCard` — periods display, empty state, condition badge
- `ItemForm` — required field validation, pre-population for editing
- `SuggestionCard` — layer display, loading skeleton, error state
- `ComfortRatingSelector` — 5 options, selection callback
- ~30 test cases total

---

## Mocking Strategy

### yr.no API

Mock `globalThis.fetch` via `jest.spyOn`. Use a captured fixture file (`test/fixtures/yrno-response.json`) trimmed to one day's timeseries.

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
    generateContent: jest.fn().mockResolvedValue({
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
export function makeWeatherSummary(overrides = {}) {
  return { minTemp: -3, maxTemp: 2, totalPrecipitation: 0.5, maxWind: 6, avgCloudCover: 75, ...overrides };
}

export function makePeriodData(overrides = {}) {
  return { temp: 0, feelsLike: -3, precipitation: 0, wind: 4, windGust: 8, humidity: 70, ... , ...overrides };
}

export function makeWardrobeItem(overrides = {}) {
  return { id: "item-" + Math.random().toString(36).slice(2, 8), name: "Test Jacket", category: "jacket", ... , ...overrides };
}
```

Only relevant overrides appear in each test — defaults are sensible.

---

## Configuration Files

### Backend: `functions/jest.config.ts`

```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.test.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/index.ts",
    "!src/**/types.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov"],
  projects: [
    {
      displayName: "unit",
      testMatch: ["<rootDir>/test/unit/**/*.test.ts"],
      preset: "ts-jest",
      testEnvironment: "node",
    },
    {
      displayName: "integration",
      testMatch: ["<rootDir>/test/integration/**/*.test.ts"],
      preset: "ts-jest",
      testEnvironment: "node",
      testTimeout: 30000,
    },
  ],
};

export default config;
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
      - run: firebase emulators:exec --only firestore,auth "cd functions && npm run test:integration"

  frontend:
    steps:
      - run: npm ci && npx vitest run --coverage

  lint:
    steps:
      - run: npm ci && npm run lint
      - run: cd functions && npm ci && npm run lint
```

Unit tests run without emulators (fast). Integration tests use `emulators:exec`. Separate jobs for fast feedback.
