# Smart Display — Project Memory

## Status
- Phase 0 (Foundation) complete and verified end-to-end.
- 170 unit tests passing (osloLogic: 45, aggregate: 26, feelsLike: 14, buildPrompt: 16, validateResponse: 18, ssrf: 15, scraper: 15, validateExtraction: 21).
- Phase 1 (Core Suggestion MVP) complete. Both frontend and functions builds pass.
- Phase 2 (Lazy Onboarding) complete. Both builds pass.

## Key Files
- `src/main.tsx` — React entry; uses `<ChakraProvider value={defaultSystem}>`
- `src/App.tsx` — BrowserRouter + AuthProvider + routes
- `src/lib/firebase.ts` — Firebase app init; exports `auth`, `db`, `functions`; connects to emulators when `VITE_USE_EMULATORS=true`
- `src/contexts/AuthContext.tsx` — Google sign-in via `signInWithRedirect` + `getRedirectResult`
- `src/pages/LoginPage.tsx` — Redirects to `/` if user already authenticated (needed for redirect flow)
- `src/types/weather.ts` — Frontend weather types (WeatherCache, PeriodData, etc.)
- `functions/src/index.ts` — Exports `fetchWeather` callable
- `functions/src/weather/types.ts` — Shared types for functions
- `functions/src/weather/yrno.ts` — yr.no API client (10s timeout, conditional requests)
- `functions/src/weather/aggregate.ts` — Hourly → period aggregation + feels-like calc
- `functions/src/weather/osloLogic.ts` — Oslo condition classification (8 types)
- `functions/src/weather/fetchWeather.ts` — exports `fetchAndCacheWeather()` (shared logic), `fetchWeather` (onCall), `scheduledFetchWeather` (onSchedule 05:00 CET)
- `functions/src/suggestion/types.ts` — WardrobeItemDoc, FeedbackDoc, SuggestionDoc, SuggestionData, SuggestionLayer
- `functions/src/suggestion/buildPrompt.ts` — `buildSuggestionPrompt()` + `deriveComfortTendency()`
- `functions/src/suggestion/getDailySuggestion.ts` — onCall; reads weather+wardrobe+feedback, calls Gemini, caches result
- `src/types/wardrobe.ts` — WardrobeItem, WardrobeCategory, WarmthLevel, WaterproofLevel
- `src/types/suggestion.ts` — DailySuggestion, SuggestionData, SuggestionLayer
- `src/lib/wardrobe.ts` — addWardrobeItem, updateWardrobeItem, deleteWardrobeItem, getWardrobeItems, getWardrobeItem
- `src/lib/suggestion.ts` — getDailySuggestion() callable wrapper
- `src/components/ui/toaster.tsx` — createToaster instance + Toaster component (Chakra v3 pattern)
- `src/components/wardrobe/ItemForm.tsx` — controlled form for add/edit; exports ItemFormValues type
- `src/components/wardrobe/ItemCard.tsx` — wardrobe item card with warmth dots, waterproof/windproof badges
- `src/components/SuggestionCard.tsx` — displays Gemini suggestion (layers + accessories + overallAdvice)
- `src/pages/WardrobePage.tsx`, `AddItemPage.tsx`, `ItemDetailPage.tsx` — wardrobe CRUD pages
- `.env.local` — Firebase client config + VITE_USE_EMULATORS=true (not committed)
- `functions/test/helpers/factories.ts` — makeSummary, makePeriod, makeTimeseries

## Firebase
- Project: `smart-display-172af`
- Web App ID: `1:745821837438:web:138d46a2f253ab13ee202f`
- Region: `europe-west1` (functions), `eur3` (Firestore)
- Auth: Google sign-in only (signInWithRedirect, NOT signInWithPopup — popup blocked in automated browsers)

## Chakra UI v3
- No `@emotion/styled` or `framer-motion` needed — only `@emotion/react`
- Provider: `<ChakraProvider value={defaultSystem}>` in main.tsx
- Key props: `colorPalette` (not `colorScheme`), `loading` (not `isLoading`)
- `fg.muted` for muted text color

## Code Style (enforced by linter)
- Single quotes, no semicolons in functions/ TypeScript files
- Functions source files use single-quote imports after linter pass

## Build & Test
- Frontend: `npm run build` (root) — tsc --noEmit + vite build → `dist/`
- Functions: `npm run build` in `functions/` — tsc → `lib/`
- tsconfig.json: no `references` (caused composite error); just `"include": ["src"]`
- Tests: Vitest (both frontend and backend — NOT Jest)
- Backend test scripts: `npm test` / `npm run test:unit` / `npm run test:coverage` in `functions/`

## Conventions
- Oslo date: `new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo" }).format(new Date())`
- Oslo hour: `Intl.DateTimeFormat("en-US", { timeZone: "Europe/Oslo", hour: "numeric", hourCycle: "h23" })`
- Feels-like: Environment Canada wind chill (T < 10°C and wind > 1.3 m/s)
- Weather doc ID: `YYYY-MM-DD` (Oslo date)
- Functions imports use `.js` extension (NodeNext module resolution)

## Emulators
- Auth: 9099, Functions: 5001, Firestore: 8080, Hosting: 5000
- UI enabled, singleProjectMode: true
- Start: `cd functions && npm run build && cd .. && firebase emulators:start --only auth,firestore,functions`
- Auth emulator test sign-in: click "Add new account" → "Auto-generate user information" → "Sign in with Google.com"
- VITE_USE_EMULATORS=true in .env.local connects frontend to emulators
