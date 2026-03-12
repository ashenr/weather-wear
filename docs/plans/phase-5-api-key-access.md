# Phase 5 — API Key Access (Thin Client Support)

**Goal:** Let users generate a personal API key and use it to fetch today's weather and clothing suggestion from a single public REST endpoint — with no browser, Firebase SDK, or OAuth flow required. The primary use case is thin clients such as e-ink displays (e.g., a Waveshare panel on a Raspberry Pi Zero) that pull a morning snapshot on a cron schedule.

**Depends on:** Phases 0–1 completed (weather cache, suggestion generation)

**Estimated scope:** ~12 files created/modified

---

## Step 1: `generateApiKey` Cloud Function

**What:** Generates (or regenerates) the user's personal API key. Stores only a SHA-256 hash; returns the raw key once.

**Files to create/modify:**
- `functions/src/apiKey/generateApiKey.ts` — main function logic
- `functions/src/apiKey/types.ts` — TypeScript interfaces
- `functions/src/index.ts` — export the new functions

**Function signature:**
```typescript
export const generateApiKey = onCall(
  { region: "europe-west1" },
  async (request): Promise<{ apiKey: string }> => { ... }
);
```

**Implementation details:**

### 1a. Key generation
- Use Node's `crypto.randomBytes(32)` to generate a cryptographically random 32-byte buffer
- Base64url-encode it to produce the raw key string (`rawKey`) — ~43 chars, URL-safe
- Compute `keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')`
- Derive `keySuffix` = last 4 characters of `rawKey` (for display in the UI)

### 1b. Firestore write
- Write (or overwrite) `users/{userId}/apiKey` document:
  ```typescript
  {
    keyHash: string;       // SHA-256 hex digest — never the raw key
    keySuffix: string;     // last 4 chars of rawKey for display
    active: true;
    createdAt: Timestamp;
    lastUsedAt: null;
  }
  ```
- This is a single document, not a subcollection — overwriting it atomically invalidates the previous key

### 1c. Response
- Return `{ apiKey: rawKey }` to the caller
- This is the **only time** the raw key is ever transmitted — the frontend must present it to the user immediately in a copy-to-clipboard dialog and never store it

### 1d. Authentication
- Reject unauthenticated calls with `unauthenticated` error code
- No input validation needed (takes no input)

---

## Step 2: `revokeApiKey` Cloud Function

**What:** Deactivates the user's API key without replacing it.

**Files to create/modify:**
- `functions/src/apiKey/revokeApiKey.ts`
- `functions/src/index.ts` — export

**Function signature:**
```typescript
export const revokeApiKey = onCall(
  { region: "europe-west1" },
  async (request): Promise<{ success: boolean }> => { ... }
);
```

**Implementation details:**

- Reject unauthenticated calls
- Update `users/{userId}/apiKey` → `{ active: false }` using Firestore `update()` (not `set()` — preserve all other fields)
- If the document doesn't exist (no key was ever generated), return `{ success: true }` silently — not an error
- Response: `{ success: true }`

---

## Step 3: `getSnapshot` HTTP Cloud Function

**What:** Public REST endpoint that validates an API key and returns today's weather summary and clothing suggestion. This is the only unauthenticated endpoint in the system.

**Files to create/modify:**
- `functions/src/apiKey/getSnapshot.ts`
- `functions/src/index.ts` — export

**Function signature:**
```typescript
export const getSnapshot = onRequest(
  { region: "europe-west1" },
  async (req, res) => { ... }
);
```

**URL:** `GET https://europe-west1-<project>.cloudfunctions.net/getSnapshot?key=<apiKey>`

**Implementation details:**

### 3a. Key validation
1. Extract `key` query parameter — return `401` with `{ "error": "missing_key" }` if absent or empty
2. Compute `candidateHash = crypto.createHash('sha256').update(key).digest('hex')`
3. Query Firestore: find a document in `users/*/apiKey` where `keyHash == candidateHash` AND `active == true`
   - Use a Firestore collection group query across all `apiKey` documents
   - Return `401` with `{ "error": "invalid_key" }` if no match found
4. Extract `userId` from the matched document's path (`path.split('/')[1]`)
5. Update `lastUsedAt` on the matched document non-blocking (do not `await` — don't slow the response)

### 3b. Timing-safe key comparison
- Always compute the full SHA-256 hash of the candidate before comparing — never short-circuit on prefix
- Firestore query equality is sufficient here since we are comparing hashes, not the raw key; no additional constant-time comparison is needed at the application layer

### 3c. Weather data
- Read `weatherCache/{today}` where `today` is the current date in `Europe/Oslo` timezone formatted as `YYYY-MM-DD`
- Return `503` with `{ "error": "weather_unavailable" }` if the document does not exist

### 3d. Suggestion data
- Read `users/{userId}/suggestions/{today}`
- If the suggestion document doesn't exist, invoke the suggestion generation logic inline (same logic as `getDailySuggestion`) and cache the result before returning
- If generation fails (e.g., empty wardrobe, Gemini error), return the weather data with `suggestion: null` and a descriptive `suggestionError` field rather than failing the whole request

### 3e. Response shape
```typescript
{
  date: string;                  // "YYYY-MM-DD"
  weather: {
    conditionType: string;
    windWarning: boolean;
    periods: {
      morning:   WeatherPeriod;
      daytime:   WeatherPeriod;
      afternoon: WeatherPeriod;
      evening:   WeatherPeriod;
    };
    summary: {
      minTemp: number;
      maxTemp: number;
      totalPrecipitation: number;
      maxWind: number;
    };
  };
  suggestion: {
    baseLayer:    { itemId: string; name: string; reasoning: string } | null;
    midLayer:     { itemId: string; name: string; reasoning: string } | null;
    outerLayer:   { itemId: string; name: string; reasoning: string } | null;
    accessories:  { itemId: string; name: string; reasoning: string }[];
    overallAdvice: string;
  } | null;
  suggestionError?: string;      // present only if suggestion could not be generated
}
```

### 3f. Security & rate limiting
- Set CORS headers to `*` (the endpoint is public by design — API key is the auth mechanism)
- Only accept `GET` requests — return `405` for other methods
- Do **not** expose `keyHash`, raw wardrobe item details, feedback, or any PII beyond what is listed in the response shape above
- Rate limiting (to be implemented as a follow-up per IDEAS.md): track per-key request count; a key-level limit of 10 req/hour is appropriate for the thin-client use case

---

## Step 4: Firestore Security Rules

**What:** Add rules for the new `apiKey` document. The `getSnapshot` function uses the Admin SDK and bypasses client rules, but the callable functions are invoked as the authenticated user.

**Files to modify:**
- `firestore.rules`

**Rules to add:**
```
// API key document — owner read/write only; never readable by other users
match /users/{userId}/apiKey {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

**Notes:**
- The `getSnapshot` function uses the Admin SDK, so it can query across all `users/*/apiKey` documents regardless of these rules
- Clients should only be able to read their own `apiKey` document (to check status/suffix — never the hash)
- The `keyHash` field must never be returned to the frontend; the frontend callable functions (`generateApiKey`, `revokeApiKey`) only return `apiKey` (raw key, once) or `{ success: true }`, not the hash

---

## Step 5: Account Page — Frontend

**What:** New `/account` page accessible by clicking the user's avatar in the header. Allows the user to view their API key status, generate/regenerate a key, and revoke it.

**Files to create/modify:**
- `src/pages/AccountPage.tsx` — new page
- `src/lib/apiKey.ts` — Firebase callable function wrappers
- `src/App.tsx` — add `/account` route
- `src/components/Header.tsx` — make avatar clickable, navigate to `/account`

### 5a. `src/lib/apiKey.ts`

Thin wrappers around the callable functions:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(undefined, 'europe-west1');

export async function generateApiKey(): Promise<string> {
  const fn = httpsCallable<void, { apiKey: string }>(functions, 'generateApiKey');
  const result = await fn();
  return result.data.apiKey;
}

export async function revokeApiKey(): Promise<void> {
  const fn = httpsCallable<void, { success: boolean }>(functions, 'revokeApiKey');
  await fn();
}
```

### 5b. Account page layout

The page has three states:

**No key generated:**
- Message: "You haven't generated an API key yet."
- "Generate API key" button

**Key active:**
- Status badge: `Active`
- Key display: `••••••••••••••••••••••••••••••••••••••<suffix>` (masked with last 4 chars visible)
- Created date: "Generated on 12 Mar 2026"
- Last used: "Last used: never" / "Last used: 11 Mar 2026"
- "Regenerate" button
- "Revoke" button

**Key revoked (was generated but now inactive):**
- Status badge: `Revoked`
- "Generate new key" button

### 5c. Generate / Regenerate flow
1. User clicks "Generate API key" or "Regenerate"
2. If regenerating: show a confirmation dialog — "This will immediately invalidate your current key. Any devices using the old key will stop working. Continue?"
3. Call `generateApiKey()` callable
4. Show a modal dialog with the raw key in a monospace text box and a "Copy to clipboard" button
5. Display a prominent warning: "This key will only be shown once. Store it somewhere safe before closing this dialog."
6. After closing the dialog, the page updates to show the `Active` state with the masked key suffix

### 5d. Revoke flow
1. User clicks "Revoke"
2. Show a confirmation dialog — "Revoke your API key? Any devices using this key will immediately lose access."
3. Call `revokeApiKey()` callable
4. Page updates to show the `Revoked` state

### 5e. Header avatar
- Wrap the existing avatar in a `<Link>` (or `onClick` handler) pointing to `/account`
- Show a tooltip on hover: "Account"

---

## Step 6: Unit Tests

**What:** Test the key generation hashing logic and `getSnapshot` key validation.

**Files to create:**
- `functions/test/unit/apiKey.test.ts`

**Tests to write:**

### generateApiKey
- Generated `rawKey` is a valid base64url string (no `+`, `/`, or `=` chars)
- `rawKey` length is at least 40 characters (32 bytes base64url-encoded)
- `keyHash` is a valid 64-char hex string (SHA-256)
- `keySuffix` equals the last 4 chars of `rawKey`
- Calling generate twice produces different keys

### getSnapshot key validation
- Missing `key` query param → 401 with `{ error: "missing_key" }`
- Unknown key (hash not in Firestore) → 401 with `{ error: "invalid_key" }`
- Revoked key (`active: false`) → 401 with `{ error: "invalid_key" }`
- Valid key → 200 with correct response shape
- Non-GET request → 405

---

## Verification Checklist

- [x] `generateApiKey` returns a base64url key and stores only the SHA-256 hash in Firestore
- [x] Calling `generateApiKey` twice invalidates the first key (old hash is replaced)
- [x] `revokeApiKey` sets `active: false`; subsequent `/snapshot` calls with the old key return 401
- [x] `getSnapshot` returns 401 for missing, invalid, and revoked keys
- [x] `getSnapshot` returns correct weather + suggestion JSON for a valid key
- [ ] `getSnapshot` returns `suggestion: null` with `suggestionError` if wardrobe is empty (not a 500)
- [ ] `getSnapshot` returns 503 if `weatherCache/{today}` is missing
- [ ] Firestore rules prevent users from reading each other's `apiKey` documents
- [x] `keyHash` is never sent to the frontend
- [x] Account page shows correct state: none / active / revoked
- [x] Raw key is shown exactly once in a copy-to-clipboard dialog after generation
- [x] Regenerate confirmation dialog is shown before overwriting an active key
- [x] Revoke confirmation dialog is shown before deactivating a key
- [x] Avatar in the header navigates to `/account`
- [x] Unit tests pass for key generation and `getSnapshot` validation logic
