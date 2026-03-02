# Smart Display

Personal clothing suggestion app for Oslo, Norway. Recommends outerwear/layering based on full-day weather forecast using Gemini AI.

## Tech Stack

- Frontend: React + Vite + Chakra UI v3 + TypeScript
- Backend: Firebase Cloud Functions (Node 24, TypeScript)
- Database: Firestore (region: eur3)
- Auth: Firebase Auth (Google sign-in)
- AI: Google Gemini API
- Weather: yr.no Locationforecast 2.0 (`complete` endpoint)
- Hosting: Firebase Hosting
- Firebase project: `smart-display-172af`

## Project Structure

- `functions/` — Cloud Functions (TypeScript, compiled to `lib/`)
- `src/` — React frontend (Vite, builds to `dist/`)
- `docs/` — project documentation
  - `docs/SPEC.md` — full project specification (data schema, API definitions, prompts, Oslo Logic)
  - `docs/DEPLOYMENT.md` — build, deploy, and emulator instructions
  - `docs/TESTING.md` — testing strategy, frameworks, coverage targets, manual checklists
  - `docs/plans/` — detailed phase implementation plans (phase-0 through phase-4)

## Key Design Decisions

- Single-user app (auth is for access control, not multi-tenancy)
- Oslo coordinates hardcoded: lat=59.9139, lon=10.7522
- Weather cache at top-level `weatherCache/{date}` (location-specific, not per-user). Written by Admin SDK, read-only for clients
- User data (wardrobe, suggestions, feedback) under `users/{userId}/...`
- Weather aggregated into 4 periods: morning (06-09), daytime (09-15), afternoon (15-18), evening (18-21)
- Oslo Logic classifies conditions (first match wins): warm, dry-mild, dry-cool, windy-cold, wet-slush, wet-cold, mild-damp, dry-cold
- Feels-like temp calculated using Environment Canada wind chill formula (yr.no doesn't provide it)
- Suggestions cached per day to avoid redundant Gemini calls
- Feedback stored per day, last 14 days fed into Gemini prompts

## Chakra UI v3

- Dependencies: `@chakra-ui/react` + `@emotion/react` only (no framer-motion, no @emotion/styled)
- Use the Chakra UI MCP server (`@chakra-ui/react-mcp`) for correct v3 component APIs during implementation
- Key v3 changes from v2: `FormControl` → `Field`, `useToast` → `toaster`, compound component patterns

## Gemini Integration

- Model: `gemini-2.0-flash` (structured JSON output via `responseMimeType: "application/json"`)
- Always validate Gemini responses: parse JSON in try/catch, retry once on failure, then graceful fallback
- For suggestions: validate `itemId` references exist in wardrobe; fallback to text-only advice if validation fails
- For product extraction: validate enum fields (`category`, `waterproof`), coerce or null invalid values

## Security

- SSRF prevention in `crawlProductUrl`: resolve DNS once and pin the result (prevent DNS rebinding), block RFC 1918, loopback, link-local, and GCP metadata (169.254.169.254) IPs; also block IPv6 loopback (`::1`), unique local (`fc00::/7`), and link-local (`fe80::/10`)
- Firestore rules: `weatherCache` read-only for clients; `users/{userId}/**` scoped to authenticated owner

## MCP Servers

- **Firebase** (`firebase@firebase` plugin) — Firestore queries, Auth management, Cloud Functions logs, project config, deploy operations
- **Chakra UI** (`@chakra-ui/react-mcp` via `.mcp.json`) — v3 component APIs, props reference, code examples, migration guidance from v2

## Testing

Full strategy in `docs/TESTING.md`. Summary:

- **Backend:** Jest + ts-jest + firebase-functions-test. Unit tests in `functions/test/unit/`, integration tests in `functions/test/integration/`
- **Frontend:** Vitest + React Testing Library. Tests co-located with source (`*.test.tsx`)
- **Integration tests** require Firebase emulators running (`firebase emulators:exec`)
- **Mocking:** yr.no via `jest.spyOn(globalThis, "fetch")` with fixture files; Gemini via SDK client mock; Firestore via emulator (not mocked)
- **Priority order:** Oslo Logic > aggregation/feels-like > Gemini validation > SSRF blocking > frontend components
- **Coverage targets:** 100% for Oslo Logic, SSRF, feels-like; >90% for aggregation, Gemini validation; >60% for frontend

## Conventions

- Cloud Functions region: `europe-west1`
- yr.no User-Agent: `SmartDisplay/1.0 github.com/ashenw/smart-display`
- yr.no timestamps are UTC — convert to `Europe/Oslo` timezone before grouping into periods
- yr.no: respect `Expires`/`Last-Modified` headers; use `If-Modified-Since` for conditional requests
- Firestore doc IDs for dated collections: `YYYY-MM-DD`
- Firestore indexes: don't pre-define — check Cloud Functions logs for "requires an index" errors and follow the provided link
- Node 24: use built-in `fetch` (no `node-fetch` needed)
