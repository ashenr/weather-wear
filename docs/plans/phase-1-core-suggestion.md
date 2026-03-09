# Phase 1 — Core Suggestion (MVP)

**Goal:** Get daily clothing suggestions working. Users can manually add wardrobe items and receive AI-generated layering recommendations based on the day's weather.

**Depends on:** Phase 0 completed (auth, weather pipeline, dashboard shell)

**Estimated scope:** ~12 files created/modified

---

## Step 1: Wardrobe Firestore CRUD Helpers

**What:** Create data access functions for wardrobe items in Firestore.

**Files to create:**
- `src/lib/wardrobe.ts` — Firestore CRUD operations for wardrobe items
- `src/types/wardrobe.ts` — TypeScript interfaces for wardrobe items

**TypeScript interfaces (`types/wardrobe.ts`):**
```typescript
interface WardrobeItem {
  id?: string;
  name: string;
  category: 'jacket' | 'sweater' | 'fleece' | 'base-layer' | 'trousers' | 'hat' | 'gloves' | 'scarf' | 'other';
  color: string;
  material: string;
  brand: string;
  warmthLevel: 1 | 2 | 3 | 4 | 5;
  waterproof: 'yes' | 'no' | 'water-resistant';
  windproof: boolean;
  temperatureRange: { min: number; max: number };
  photoUrl: string;
  sourceUrl: string;
  notes: string;
  extractedByAI: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**CRUD functions (`lib/wardrobe.ts`):**
- `addWardrobeItem(userId, item)` → add doc to `users/{userId}/wardrobe`
- `updateWardrobeItem(userId, itemId, updates)` → update doc
- `deleteWardrobeItem(userId, itemId)` → delete doc
- `getWardrobeItems(userId)` → get all docs from subcollection
- `getWardrobeItem(userId, itemId)` → get single doc

---

## Step 2: Manual Wardrobe Entry Form

**What:** Build the form for manually adding clothing items.

**Files to create:**
- `src/pages/AddItemPage.tsx` — add item page with manual entry form
- `src/components/wardrobe/ItemForm.tsx` — reusable form component for wardrobe item fields

**Form fields (matching `WardrobeItem` schema):**
- Name (text input, required)
- Category (select dropdown, required)
- Color (text input)
- Material / fabric (text input)
- Brand (text input)
- Warmth level (1–5 slider or radio group)
- Waterproof (select: yes / no / water-resistant)
- Windproof (checkbox)
- Temperature range (two number inputs: min °C, max °C)
- Notes (textarea)

**Details:**
- Use Chakra UI v3 form components — refer to Chakra UI MCP server for correct v3 APIs (v2's `FormControl` is now `Field` in v3, etc.)
- Validate required fields (name, category) before submission
- On submit: call `addWardrobeItem()`, set `extractedByAI: false`, navigate to `/wardrobe`
- Show success toast on save

---

## Step 3: Wardrobe List Page

**What:** Display all wardrobe items in a browsable list.

**Files to create:**
- `src/pages/WardrobePage.tsx` — wardrobe list page
- `src/components/wardrobe/ItemCard.tsx` — card component for displaying a single wardrobe item

**Details:**
- Fetch all items using `getWardrobeItems(userId)`
- Display as a responsive grid of cards (use Chakra v3 `SimpleGrid` or equivalent)
- Each card shows: name, category badge, warmth level indicator, waterproof/windproof icons
- Click a card → navigate to `/wardrobe/:id` (edit/detail view)
- "Add Item" button at the top → navigates to `/wardrobe/add`
- Empty state: friendly message encouraging user to add their first item
- Loading state: skeleton cards while data loads

---

## Step 4: Wardrobe Item Detail / Edit Page

**What:** View and edit an existing wardrobe item.

**Files to create:**
- `src/pages/ItemDetailPage.tsx` — item detail/edit page

**Details:**
- Load item by ID from URL param using `getWardrobeItem(userId, itemId)`
- Reuse `ItemForm` component, pre-populated with existing data
- "Save" button calls `updateWardrobeItem()`
- "Delete" button with confirmation dialog calls `deleteWardrobeItem()`
- Navigate back to `/wardrobe` after save or delete

---

## Step 5: `getDailySuggestion` Cloud Function

**What:** The core AI function — reads weather + wardrobe, builds Gemini prompt, returns clothing suggestion.

**Files to create/modify:**
- `functions/src/suggestion/getDailySuggestion.ts` — main function logic
- `functions/src/suggestion/buildPrompt.ts` — constructs the Gemini prompt
- `functions/src/suggestion/types.ts` — TypeScript interfaces for suggestion data
- `functions/src/index.ts` — export the new function

**Dependencies to add to `functions/package.json`:**
```
@google/generative-ai  (or Firebase AI SDK)
```

**Function signature:**
```typescript
export const getDailySuggestion = onCall(
  { region: "europe-west1" },
  async (request) => { ... }
);
```

**Implementation details:**

### 5a. Check for cached suggestion
- Read `users/{userId}/suggestions/{today}` from Firestore
- If exists and not stale, return it immediately

### 5b. Read weather data
- Read `weatherCache/{today}` (top-level collection)
- If missing, call the weather fetching logic on-demand (reuse from Phase 0)

### 5c. Read wardrobe
- Read all docs from `users/{userId}/wardrobe/`
- If wardrobe is empty, return an error message telling user to add items first

### 5d. Read recent feedback (stubbed for Phase 1)
- Read last 14 days of `users/{userId}/feedback/` docs
- In Phase 1, this will likely be empty — handle gracefully
- Pass empty array to prompt builder if no feedback exists

### 5e. Build Gemini prompt (`buildPrompt.ts`)
- Use the recommendation prompt template from the spec
- Substitute in:
  - Weather data (all periods + condition type)
  - Wardrobe items (serialized as JSON array)
  - Feedback entries (empty for now)
  - Comfort tendency: default to `"are still adapting to Nordic weather"` when no feedback exists
- Include the structured JSON output format instruction

### 5f. Call Gemini API
- Use `gemini-2.5-flash-lite` model (fast, cost-effective for this use case)
- Set `responseMimeType: "application/json"` for structured output
- Parse and validate response with retry:
  1. Parse JSON in a try/catch — if invalid JSON, retry once with a stricter prompt ("You MUST return valid JSON only")
  2. Validate that all `itemId` values exist in the user's wardrobe
  3. Validate required fields: `baseLayer`, `midLayer`, `outerLayer`, `overallAdvice`
  4. If validation fails after retry, return a graceful fallback: text-only `overallAdvice` without item references, with a note that specific item matching failed

### 5g. Cache and return
- Write suggestion to `users/{userId}/suggestions/{today}`
- Only cache if validation passed (don't cache fallback responses)
- Return the suggestion object to the client

---

## Step 6: Dashboard Suggestion Display

**What:** Update the dashboard to show the daily clothing suggestion alongside weather.

**Files to create/modify:**
- `src/pages/DashboardPage.tsx` — add suggestion section
- `src/components/SuggestionCard.tsx` — displays the layering recommendation
- `src/lib/suggestion.ts` — client-side function to call `getDailySuggestion`

**Details:**
- On dashboard load:
  1. Fetch weather data from Firestore cache (already done in Phase 0)
  2. Call `getDailySuggestion` callable function
  3. Display suggestion below weather card
- `SuggestionCard` displays:
  - Each layer (base, mid, outer) with item name and reasoning
  - Accessories list if any
  - Overall advice text
  - Condition type badge matching the weather
- Loading state: skeleton while suggestion generates (may take a few seconds for Gemini call)
- Error state: friendly message if suggestion fails

---

## Step 7: Schedule `fetchWeather` Daily

**What:** Configure the weather function to run automatically at 05:00 CET daily.

**File to modify:**
- `functions/src/weather/fetchWeather.ts` — add scheduled trigger variant

**Details:**
- Add a scheduled function using `onSchedule`:
  ```typescript
  export const scheduledFetchWeather = onSchedule(
    { schedule: "0 5 * * *", timeZone: "Europe/Oslo", region: "europe-west1" },
    async (event) => { ... }
  );
  ```
- Weather cache is now top-level (`weatherCache/{date}`), so the scheduled function simply writes there using Admin SDK — no need to discover user IDs
- Keep the callable version for manual triggers from the dashboard

---

## Step 8: Update App Routing

**What:** Add the new wardrobe and add-item routes.

**File to modify:**
- `src/App.tsx` — add new routes

**New routes:**
```
/wardrobe      → WardrobePage (protected)
/wardrobe/add  → AddItemPage (protected)
/wardrobe/:id  → ItemDetailPage (protected)
```

**Also update:**
- `src/components/Header.tsx` or `Layout.tsx` — add navigation links to Dashboard and Wardrobe

---

## Verification Checklist

- [ ] Can add a wardrobe item via the manual form and see it in Firestore
- [ ] Wardrobe list page shows all items with correct data
- [ ] Can edit and delete wardrobe items
- [ ] `getDailySuggestion` returns a valid suggestion with real wardrobe items
- [ ] Gemini prompt produces sensible layering recommendations
- [ ] Suggestion is cached — second call returns cached result without hitting Gemini
- [ ] Dashboard displays both weather and suggestion data
- [ ] Scheduled weather function deploys and triggers correctly
- [ ] Empty wardrobe shows a helpful message instead of crashing
- [ ] Build succeeds for both frontend and functions
- [ ] Check Firebase Cloud Functions logs for Firestore index errors — if any queries fail with "requires an index" errors, follow the link in the error message to create the needed composite index
