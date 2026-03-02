# Phase 3 — Feedback Loop

**Goal:** Personalize suggestions over time. Users record what they wore each day and rate their comfort. This feedback is fed into future Gemini prompts to learn the user's temperature tolerance.

**Depends on:** Phase 1 completed (suggestion system, wardrobe)

**Estimated scope:** ~8 files created/modified

---

## Step 1: `submitFeedback` Cloud Function

**What:** Records the user's daily outfit feedback in Firestore.

**Files to create/modify:**
- `functions/src/feedback/submitFeedback.ts` — main function logic
- `functions/src/feedback/types.ts` — TypeScript interfaces for feedback data
- `functions/src/index.ts` — export the new function

**Function signature:**
```typescript
export const submitFeedback = onCall(
  { region: "europe-west1" },
  async (request) => { ... }
);
```

**Input schema:**
```typescript
{
  date: string;           // "YYYY-MM-DD"
  itemsWorn: string[];    // array of wardrobe item IDs
  comfortRating: 'too-cold' | 'slightly-cold' | 'just-right' | 'slightly-warm' | 'too-warm';
  note?: string;          // optional free text
}
```

**Implementation details:**

### 1a. Input validation
- `date` must be a valid date string, not in the future, not more than 7 days in the past
- `itemsWorn` must be non-empty, each ID must exist in `users/{userId}/wardrobe/`
- `comfortRating` must be one of the 5 valid values
- `note` optional, max 500 characters

### 1b. Snapshot weather data
- Read `weatherCache/{date}` (top-level collection) to get the weather conditions for that day
- If weather cache doesn't exist for that date, store `null` for weather fields (don't fail)

### 1c. Write feedback document
- Write to `users/{userId}/feedback/{date}`
- Document fields:
  ```typescript
  {
    date: string;
    submittedAt: Timestamp;
    itemsWorn: string[];
    comfortRating: string;
    conditionType: string | null;     // from weather cache
    weatherSummary: object | null;    // snapshot of weather summary
    note: string | null;
  }
  ```
- If feedback for this date already exists, overwrite it (user changed their mind)

---

## Step 2: Feedback Page (Frontend)

**What:** Build the feedback submission UI where users select what they wore and rate comfort.

**Files to create:**
- `src/pages/FeedbackPage.tsx` — feedback submission page
- `src/components/feedback/ComfortRatingSelector.tsx` — visual comfort rating picker
- `src/components/feedback/WornItemsSelector.tsx` — wardrobe item multi-select
- `src/lib/feedback.ts` — client-side function to call `submitFeedback`

**UI layout:**

### 2a. Date selector
- Default to today's date
- Allow selecting past dates (up to 7 days back) via date picker or "Yesterday" shortcut
- Show the weather conditions for the selected date if available (from Firestore cache)

### 2b. Worn items selector (`WornItemsSelector.tsx`)
- Load user's wardrobe items
- Display as a grid of selectable cards (similar to wardrobe list but with checkboxes/toggles)
- Group by category (jackets, sweaters, base layers, accessories)
- Selected items are visually highlighted
- At least one item must be selected to submit

### 2c. Comfort rating (`ComfortRatingSelector.tsx`)
- 5-option horizontal selector with labels and visual indicators:
  - Too cold (blue/cold icon)
  - Slightly cold
  - Just right (green/check icon)
  - Slightly warm
  - Too warm (red/warm icon)
- Required — must select one before submitting

### 2d. Optional note
- Textarea for free-text context
- Placeholder: "Any notes? e.g., 'was fine until the wind picked up'"
- Max 500 characters

### 2e. Submit flow
- "Submit Feedback" button
- Loading state while calling the function
- Success: toast notification + navigate to dashboard
- If feedback already exists for this date, show it pre-filled and allow updating

---

## Step 3: Integrate Feedback into Recommendation Prompt

**What:** Update the `getDailySuggestion` function to use feedback history for personalized suggestions.

**Files to modify:**
- `functions/src/suggestion/getDailySuggestion.ts` — read feedback history
- `functions/src/suggestion/buildPrompt.ts` — include feedback data and comfort tendency

**Implementation details:**

### 3a. Read recent feedback
- Query `users/{userId}/feedback/` for the last 14 days
- Sort by date descending
- This was stubbed in Phase 1 — now implement the actual read

### 3b. Derive comfort tendency
- Analyze the distribution of `comfortRating` values across recent feedback
- Logic:
  ```
  coldCount = count of 'too-cold' + 'slightly-cold'
  warmCount = count of 'too-warm' + 'slightly-warm'
  justRightCount = count of 'just-right'
  total = coldCount + warmCount + justRightCount

  if (total < 3) → "are still adapting to Nordic weather" (not enough data)
  if (coldCount / total > 0.5) → "feel the cold more than average"
  if (warmCount / total > 0.5) → "tend to run warm"
  else → "have well-calibrated cold tolerance"
  ```

### 3c. Format feedback for prompt
- For each feedback entry, include:
  - Date and condition type
  - What items were worn (resolve item IDs to names)
  - Comfort rating
  - User note if present
- Example format in prompt:
  ```
  - 2026-02-28 (Dry Cold, -4°C): Wore merino base + fleece + down jacket.
    Rating: slightly-cold. Note: "wind was brutal in the evening"
  - 2026-02-27 (Wet Cold, 1°C): Wore wool base + softshell.
    Rating: too-cold.
  ```

### 3d. Update the prompt
- Insert comfort tendency string into the prompt template
- Insert formatted feedback entries into the `PAST FEEDBACK` section
- The prompt already has placeholders for these from the spec — now fill them with real data

---

## Step 4: Update App Routing & Navigation

**What:** Add the feedback route and navigation entry point.

**Files to modify:**
- `src/App.tsx` — add feedback route
- `src/components/Layout.tsx` or `Header.tsx` — add feedback link/button

**New route:**
```
/feedback → FeedbackPage (protected)
```

**Navigation details:**
- Add a "Log Feedback" button/link in the navigation
- Optionally show a subtle prompt on the dashboard: "How was yesterday's outfit?" with a link to feedback page
- Show a badge or indicator if today's feedback hasn't been submitted yet

---

## Verification Checklist

- [ ] Can submit feedback selecting worn items and comfort rating
- [ ] Feedback is stored correctly in Firestore with weather snapshot
- [ ] Can update feedback for a date that already has feedback
- [ ] Feedback page loads existing feedback for editing
- [ ] Past 14 days of feedback appear in the Gemini prompt
- [ ] Comfort tendency is derived correctly from feedback distribution
- [ ] Suggestions change meaningfully when feedback indicates cold/warm tendency
- [ ] Date selector allows going back up to 7 days
- [ ] Empty feedback state (no wardrobe items) shows helpful message
- [ ] Build succeeds for both frontend and functions
- [ ] Check Firebase Cloud Functions logs for Firestore index errors — feedback queries (last 14 days, ordered by date) may require a composite index. Follow the link in the error message to create it
