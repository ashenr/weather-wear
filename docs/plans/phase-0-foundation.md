# Phase 0 — Foundation (Experiment)

**Goal:** Prove the concept works end-to-end with minimal UI. Set up the React app, authentication, Firestore rules, weather data pipeline, and a minimal dashboard.

**Estimated scope:** ~15 files created/modified

---

## Prerequisites

- Firebase project `smart-display-172af` exists (confirmed)
- Cloud Functions scaffold exists with Node 24 (confirmed)
- Firebase Hosting configured with `public/` directory (confirmed)

---

## Step 1: Initialize React + Vite Project

**What:** Set up the frontend app with React, Vite, TypeScript, and Chakra UI.

**Files to create/modify:**
- `package.json` — root-level, React + Vite + Chakra UI dependencies
- `vite.config.ts` — Vite configuration
- `tsconfig.json` — TypeScript config for frontend
- `tsconfig.node.json` — TypeScript config for Vite/Node
- `index.html` — Vite entry HTML (replaces `public/index.html`)
- `src/main.tsx` — React entry point, wraps app with ChakraProvider
- `src/App.tsx` — Root component with router setup
- `src/vite-env.d.ts` — Vite type declarations
- `.env.example` — template for environment variables

**Dependencies:**
```
react, react-dom, react-router-dom
@chakra-ui/react, @emotion/react
firebase (client SDK)
```

**Dev dependencies:**
```
vite, @vitejs/plugin-react
typescript, @types/react, @types/react-dom
```

**Chakra UI v3 notes:**
- Chakra v3 no longer requires `@emotion/styled` or `framer-motion` — only `@emotion/react`
- Provider setup uses `<ChakraProvider>` from `@chakra-ui/react` (import changed from v2)
- Refer to Chakra UI MCP server during implementation for correct v3 component APIs

**Details:**
- Update `firebase.json` hosting config: change `"public": "public"` → `"public": "dist"` (Vite's build output)
- Remove the old `public/index.html` placeholder
- Configure Vite proxy for Firebase emulator during development if needed
- Add Firebase emulator configuration to `firebase.json`:

  ```json
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "hosting": { "port": 5000 },
    "ui": { "enabled": true }
  }
  ```

---

## Step 2: Firebase Client SDK Setup

**What:** Initialize the Firebase client SDK with project config.

**Files to create:**
- `src/lib/firebase.ts` — Firebase app initialization, export `auth` and `db` instances

**Details:**
- Use Firebase config from the project (apiKey, authDomain, projectId, etc.)
- Get config values from `firebase_get_sdk_config` for the web app
- Initialize `getFirestore()` with the app instance
- Initialize `getAuth()` with the app instance
- Export typed references for reuse across the app

---

## Step 3: Firebase Auth (Google Sign-in)

**What:** Implement Google sign-in with Firebase Auth. Create login page and auth context.

**Files to create:**
- `src/contexts/AuthContext.tsx` — React context providing current user state, loading state, sign-in/sign-out functions
- `src/pages/LoginPage.tsx` — Login page with Google sign-in button
- `src/components/ProtectedRoute.tsx` — Route wrapper that redirects to login if unauthenticated

**Details:**
- `AuthContext` uses `onAuthStateChanged` listener to track auth state
- Provides: `user`, `loading`, `signIn()`, `signOut()`
- `signIn()` uses `signInWithPopup` with `GoogleAuthProvider`
- `ProtectedRoute` shows a loading spinner while auth state resolves, then redirects to `/login` if no user
- Update `App.tsx` to wrap routes with `AuthContext.Provider` and protect the dashboard route

---

## Step 4: Firestore Security Rules

**What:** Replace the default deny-all rules with user-scoped rules.

**File to modify:**
- `firestore.rules`

**Rules structure:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Weather cache is top-level, location-specific (not user-specific)
    // Written by Cloud Functions (Admin SDK bypasses rules)
    // Readable by any authenticated user
    match /weatherCache/{date} {
      allow read: if request.auth != null;
      allow write: if false; // only written by Admin SDK
    }

    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Details:**
- Weather cache lives at top-level `weatherCache/{date}` — it's location data, not user data
- Weather docs are written by Cloud Functions using Admin SDK (bypasses rules), read-only for clients
- All user data (wardrobe, suggestions, feedback) lives under `users/{userId}/...`
- Only the authenticated user matching `userId` can read/write their own data
- Deploy rules with `firebase deploy --only firestore:rules`

---

## Step 5: `fetchWeather` Cloud Function

**What:** Build the core weather data pipeline — fetch from yr.no, aggregate into time periods, classify with Oslo Logic, cache in Firestore.

**Files to create/modify:**
- `functions/src/index.ts` — export the function (remove hello world stubs)
- `functions/src/weather/fetchWeather.ts` — main function logic
- `functions/src/weather/yrno.ts` — yr.no API client
- `functions/src/weather/aggregate.ts` — aggregate hourly data into time periods
- `functions/src/weather/osloLogic.ts` — weather condition classification
- `functions/src/weather/types.ts` — TypeScript interfaces for weather data

**Function signature:**
```typescript
// HTTP callable for now (scheduled trigger added in Phase 1)
export const fetchWeather = onCall({ region: "europe-west1" }, async (request) => { ... });
```

**Note on manual triggering:** During Phase 0, there is no scheduled trigger — weather data must be fetched manually. The dashboard includes a "Fetch Weather" button that calls this function. This is intentional for testing; the scheduled variant (`scheduledFetchWeather`) is added in Phase 1 Step 7. Both the callable and scheduled versions share the same core logic (yr.no fetch → aggregate → classify → cache).

**Implementation details:**

### 5a. yr.no API Client (`yrno.ts`)
- Fetch from `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=59.9139&lon=10.7522`
- Set `User-Agent: WeatherWear/1.0 github.com/ashenw/weatherwear`
- Parse the JSON timeseries response
- Handle HTTP errors and timeouts (10s timeout)
- Respect `Expires` and `Last-Modified` headers; use `If-Modified-Since` for conditional requests
- Available instant fields: `air_temperature`, `relative_humidity`, `dew_point_temperature`, `wind_speed`, `wind_speed_of_gust`, `wind_from_direction`, `air_pressure_at_sea_level`, `cloud_area_fraction` (total/high/medium/low), `fog_area_fraction`, `ultraviolet_index_clear_sky`
- Available period fields (`next_1_hours`): `precipitation_amount` (+min/max), `probability_of_precipitation`, `probability_of_thunder`, `symbol_code`
- Note: `next_1_hours` data unavailable beyond 60-hour forecast range; fall back to `next_6_hours` when absent

### 5b. Aggregation (`aggregate.ts`)
- Filter timeseries to today's hours (06:00–21:00 CET/CEST)
- **Important:** yr.no returns UTC timestamps — convert to `Europe/Oslo` timezone before grouping (handles CET/CEST switch on last Sunday of March/October)
- Group into 4 periods:
  - Morning: 06:00–09:00
  - Daytime: 09:00–15:00
  - Afternoon: 15:00–18:00
  - Evening: 18:00–21:00
- For each period, calculate:
  - `temp`: average of `air_temperature` instant values
  - `feelsLike`: calculated wind chill (see 5b-i below)
  - `precipitation`: sum of `precipitation_amount` from `next_1_hours` summaries
  - `precipProbability`: max `probability_of_precipitation` across hours in the period
  - `wind`: average of `wind_speed` instant values
  - `windGust`: max of `wind_speed_of_gust` instant values
  - `humidity`: average of `relative_humidity` instant values
  - `dewPoint`: average of `dew_point_temperature` instant values
  - `cloudCover`: average of `cloud_area_fraction` instant values
  - `symbol`: most frequent `symbol_code` from `next_1_hours` summaries
- Calculate daily summary:
  - `minTemp`: min temperature across all periods
  - `maxTemp`: max temperature across all periods
  - `totalPrecipitation`: sum of all period precipitation
  - `maxWind`: max wind speed across all periods
  - `avgCloudCover`: average cloud cover across all periods

#### 5b-i. Feels-like temperature calculation

yr.no does not provide a wind chill field. Calculate per hourly data point, then average per period:
- When `air_temperature` < 10°C **and** `wind_speed` > 1.3 m/s (4.8 km/h):
  `feelsLike = 13.12 + 0.6215×T - 11.37×V^0.16 + 0.3965×T×V^0.16`
  where T = air temperature (°C), V = wind speed converted to km/h (m/s × 3.6)
- Otherwise: `feelsLike = air_temperature`

### 5c. Oslo Logic Classification (`osloLogic.ts`)
- Input: daily summary + period data
- Output: one of the condition types from the spec
- Classification rules (evaluated in order, first match wins):
  1. `warm`: maxTemp > 20°C
  2. `dry-mild`: minTemp ≥ 10°C, totalPrecipitation < 1mm
  3. `dry-cool`: minTemp 5–10°C, totalPrecipitation < 1mm
  4. `windy-cold`: minTemp < 5°C AND maxWind > 8 m/s
  5. `wet-slush`: minTemp 0–5°C AND totalPrecipitation ≥ 2mm
  6. `wet-cold`: minTemp -5–0°C AND totalPrecipitation ≥ 1mm AND avg humidity > 80%
  7. `mild-damp`: minTemp 5–15°C AND totalPrecipitation > 0
  8. `dry-cold`: minTemp < 0°C AND totalPrecipitation < 1mm
  9. Default fallback: `mild-damp`
- Additionally, set `windWarning: true` when `maxWind > 8 m/s` (independent of the primary classification) — this flag is stored alongside `conditionType` in the weather cache and passed to Gemini as supplementary context

### 5d. Cache to Firestore
- Write the aggregated data to `weatherCache/{date}` (top-level collection, not per-user)
- Document ID format: `YYYY-MM-DD`
- Include all period data, summary, condition type, and fetch timestamp
- Uses Admin SDK to write (bypasses security rules)

**Dependencies to add to `functions/package.json`:**
```
node-fetch (or use built-in fetch in Node 24)
```

---

## Step 6: Minimal Dashboard Page

**What:** Build a simple dashboard that displays the cached weather data.

**Files to create:**
- `src/pages/DashboardPage.tsx` — main dashboard view
- `src/components/WeatherCard.tsx` — displays weather periods and condition type

**Details:**
- On mount, read `weatherCache/{today's date}` from Firestore (top-level collection)
- If no cached data exists, show a "No weather data yet" message with a button to trigger `fetchWeather`
- Display:
  - Condition type badge (e.g., "Wet Cold")
  - Daily summary (min/max temp, precipitation, wind)
  - Each time period with temp, feels-like, precipitation, wind, weather symbol
- Use Chakra UI v3 components — refer to Chakra UI MCP server for correct APIs
- Call the `fetchWeather` callable function when the button is pressed

---

## Step 7: App Routing & Layout

**What:** Wire up routing and create the app layout shell.

**Files to create/modify:**
- `src/App.tsx` — update with React Router routes
- `src/components/Layout.tsx` — app shell with header/nav
- `src/components/Header.tsx` — top bar with app name and sign-out button

**Routes:**
```
/        → DashboardPage (protected)
/login   → LoginPage (public)
```

**Details:**
- `Layout` wraps protected routes with a consistent header
- Header shows user avatar/email and sign-out button
- Mobile-friendly responsive layout using Chakra UI v3 layout primitives

---

## Verification Checklist

- [x] `npm run dev` starts the Vite dev server and loads the app
- [x] Google sign-in works and creates a user session
- [x] Unauthenticated users are redirected to `/login`
- [ ] Firestore security rules reject access from other users
- [x] `fetchWeather` function fetches data from yr.no and caches it in Firestore
- [x] Dashboard displays the cached weather data correctly
- [x] Oslo Logic classification produces sensible condition types (`mild-damp`, 0–5.7°C)
- [x] Build succeeds: `npm run build` (frontend) and `npm run build` (functions)

## Implementation Notes

### Auth: `signInWithRedirect` instead of `signInWithPopup`

The plan specified popup-based sign-in. During implementation this was changed
to `signInWithRedirect` because Google's OAuth blocks sign-in from browsers
launched with `--remote-debugging-port` (which includes the Chrome MCP browser
and similar automation tools). The redirect flow avoids this restriction.

`LoginPage` was also updated to redirect already-authenticated users to `/`
(needed to complete the redirect flow after Google returns the user).

### Emulator-based local auth

Set `VITE_USE_EMULATORS=true` in `.env.local` to connect the frontend to local
emulators. `src/lib/firebase.ts` calls `connectAuthEmulator`,
`connectFirestoreEmulator`, and `connectFunctionsEmulator` when this flag is
set.

Test sign-in uses the Auth emulator's IDP widget — no real Google account
required. See `docs/DEPLOYMENT.md` → "Signing In with the Auth Emulator" for
the step-by-step flow.
