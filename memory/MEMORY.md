# Smart Display — Project Memory

## Status
- Phase 0 (Foundation) complete. Both frontend and functions builds pass.

## Key Files
- `src/main.tsx` — React entry; uses `<ChakraProvider value={defaultSystem}>`
- `src/App.tsx` — BrowserRouter + AuthProvider + routes
- `src/lib/firebase.ts` — Firebase app init; exports `auth`, `db`, `functions`
- `src/contexts/AuthContext.tsx` — Google sign-in context
- `src/types/weather.ts` — Frontend weather types (WeatherCache, PeriodData, etc.)
- `functions/src/index.ts` — Exports `fetchWeather` callable
- `functions/src/weather/types.ts` — Shared types for functions
- `functions/src/weather/yrno.ts` — yr.no API client (10s timeout, conditional requests)
- `functions/src/weather/aggregate.ts` — Hourly → period aggregation + feels-like calc
- `functions/src/weather/osloLogic.ts` — Oslo condition classification (8 types)
- `functions/src/weather/fetchWeather.ts` — onCall function; caches to weatherCache/{date}
- `.env.local` — Firebase client config (not committed)

## Firebase
- Project: `smart-display-172af`
- Web App ID: `1:745821837438:web:138d46a2f253ab13ee202f`
- Region: `europe-west1` (functions), `eur3` (Firestore)
- Auth: Google sign-in only

## Chakra UI v3
- No `@emotion/styled` or `framer-motion` needed — only `@emotion/react`
- Provider: `<ChakraProvider value={defaultSystem}>` in main.tsx
- Key props: `colorPalette` (not `colorScheme`), `loading` (not `isLoading`)
- `fg.muted` for muted text color

## Build
- Frontend: `npm run build` (root) — tsc --noEmit + vite build → `dist/`
- Functions: `npm run build` in `functions/` — tsc → `lib/`
- tsconfig.json: no `references` (caused composite error); just `"include": ["src"]`

## Conventions
- Oslo date: `new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo" }).format(new Date())`
- Oslo hour: `Intl.DateTimeFormat("en-US", { timeZone: "Europe/Oslo", hour: "numeric", hourCycle: "h23" })`
- Feels-like: Environment Canada wind chill (T < 10°C and wind > 1.3 m/s)
- Weather doc ID: `YYYY-MM-DD` (Oslo date)
- Functions imports use `.js` extension (NodeNext module resolution)

## Emulators
- Auth: 9099, Functions: 5001, Firestore: 8080, Hosting: 5000
- UI enabled, singleProjectMode: true
