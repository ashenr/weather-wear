# Phase 4 — Polish (v1.0)

**Goal:** Make the app reliable and pleasant to use daily. Improve UI/UX, add photo uploads, category filters, comprehensive error handling, and deploy to production.

**Depends on:** Phases 0–3 completed

**Estimated scope:** ~15 files created/modified

---

## Step 1: Responsive UI & Loading States

**What:** Ensure the app works well on mobile (primary use case — checking your phone in the morning) and has polished loading/empty/error states everywhere.

**Files to modify:**
- `src/pages/DashboardPage.tsx` — responsive layout, skeleton loading
- `src/pages/WardrobePage.tsx` — responsive grid, skeleton loading
- `src/pages/AddItemPage.tsx` — loading states for URL extraction
- `src/pages/FeedbackPage.tsx` — loading states
- `src/components/Layout.tsx` — mobile navigation (hamburger menu or bottom nav)

**Details:**

### 1a. Mobile-first dashboard
- Stack weather and suggestion cards vertically on mobile
- Use Chakra's responsive props: `columns={{ base: 1, md: 2 }}`
- Ensure touch targets are at least 44px
- Suggestion text should be readable without horizontal scrolling

### 1b. Skeleton loading states
- `DashboardPage`: skeleton cards matching weather + suggestion layout
- `WardrobePage`: skeleton card grid while items load
- `AddItemPage`: extraction progress indicator with stage labels
- Use Chakra v3 `Skeleton` components — refer to Chakra UI MCP server for correct APIs

### 1c. Empty states
- Dashboard with no weather data: "Weather data not available yet. Check back soon."
- Dashboard with no suggestion (empty wardrobe): "Add some items to your wardrobe to get clothing suggestions!" with link to wardrobe
- Wardrobe with no items: illustration/icon + "Your wardrobe is empty" + CTA button
- Feedback with no items to select: redirect to wardrobe

### 1d. Error states
- Generic error boundary component wrapping each page
- Network errors: "Unable to connect. Please check your internet connection."
- Function errors: show user-friendly message based on error code
- Retry buttons where appropriate

---

## Step 2: Wardrobe Photo Upload

**What:** Allow users to upload photos of their clothing items using Firebase Storage.

**Files to create/modify:**
- `src/components/wardrobe/PhotoUpload.tsx` — photo upload component
- `src/components/wardrobe/ItemForm.tsx` — integrate photo upload into the form
- `src/components/wardrobe/ItemCard.tsx` — display photo thumbnail

**Firebase Storage setup:**
- Create storage rules allowing authenticated users to upload to their own path
- Storage path: `users/{userId}/wardrobe/{itemId}/{filename}`
- Max file size: 5MB
- Allowed types: image/jpeg, image/png, image/webp

**Storage rules (`storage.rules`):**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/wardrobe/{allPaths=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId
                         && request.resource.size < 5 * 1024 * 1024
                         && request.resource.contentType.matches('image/.*');
    }
  }
}
```

**Implementation details:**

### 2a. `PhotoUpload` component
- Drag-and-drop zone + click to browse
- Image preview before upload
- Upload progress bar
- Compress/resize client-side before upload (max 1200px width, JPEG 80% quality)
- Use Firebase Storage `uploadBytesResumable` for progress tracking
- After upload, get download URL and store in the wardrobe item's `photoUrl` field

### 2b. Integration with item form
- Show existing photo if editing an item with `photoUrl`
- Allow replacing the photo
- When saving an item for the first time, upload photo first, then save item with the URL
- When deleting an item, also delete the associated photo from Storage

### 2c. Display in wardrobe
- `ItemCard` shows photo as card header image if available
- Fallback to category icon if no photo
- Use Chakra v3 `Image` with lazy loading and placeholder

---

## Step 3: Wardrobe Category Filters & Search

**What:** Add filtering and search to the wardrobe page so users can quickly find items.

**Files to modify:**
- `src/pages/WardrobePage.tsx` — add filter bar and search
- `src/components/wardrobe/FilterBar.tsx` — filter/search controls

**Details:**

### 3a. Category filter
- Horizontal scrollable chips/tabs for each category
- "All" tab selected by default
- Categories: All, Jackets, Sweaters, Fleece, Base Layers, Trousers, Hats, Gloves, Scarves, Other
- Filter is client-side (all items already loaded)

### 3b. Search
- Text search input above the grid
- Filters items by name, brand, material, notes (case-insensitive substring match)
- Debounced input (300ms) to avoid excessive re-renders
- Client-side filtering (wardrobe size is small enough)

### 3c. Sort options
- Sort by: recently added, name (A-Z), warmth level, category
- Default: recently added (by `createdAt` descending)

---

## Step 4: Comprehensive Error Handling

**What:** Add error handling throughout the Cloud Functions and frontend for all failure scenarios.

**Files to modify:**
- All Cloud Functions — add try/catch, structured error responses
- Frontend pages — handle function errors gracefully

**Scenarios to handle:**

### 4a. Cloud Function errors
| Scenario | Handling |
|---|---|
| yr.no API down | Return cached data if available, otherwise return error with message |
| yr.no rate limited | Respect `Retry-After` header, return cached data |
| Gemini API error | Return error, suggest user try again later |
| Gemini returns invalid JSON | Log the raw response, retry once, then return error |
| Firestore write fails | Retry once, then return error |
| User not authenticated | Return `unauthenticated` error code |
| Invalid input data | Return `invalid-argument` with field-specific error message |

### 4b. Frontend error handling
- Wrap each page in an error boundary
- Show user-friendly error messages (not raw error strings)
- Add retry buttons for transient errors
- Log errors to console for debugging (consider adding Firebase Crashlytics later)
- Handle offline state: show cached data when available, indicate when data is stale

### 4c. Function timeout handling
- Set appropriate timeouts for each function:
  - `fetchWeather`: 30s (yr.no can be slow)
  - `getDailySuggestion`: 60s (Gemini call)
  - `crawlProductUrl`: 30s (page fetch + Gemini extraction)
  - `submitFeedback`: 10s (simple write)

---

## Step 5: UI/UX Refinements

**What:** Small but impactful improvements to make the app feel polished.

**Details:**

### 5a. Dashboard improvements
- Show the date prominently: "Monday, March 2, 2026"
- Weather icons for each period (map yr.no symbol codes to icons)
- Color-code temperature (blue for cold, orange for warm)
- Animate suggestion card entrance
- "Refresh" button to regenerate suggestion (invalidates cache)

### 5b. Navigation improvements
- Bottom navigation bar on mobile (Dashboard, Wardrobe, Feedback)
- Active state indicators on nav items
- Breadcrumbs on detail pages (Wardrobe > Item Name)

### 5c. Toast notifications
- Success: "Item saved!", "Feedback submitted!", "Weather updated!"
- Error: descriptive error message with action suggestion
- Use Chakra v3 toast API (v3 uses `toaster` from `@chakra-ui/react`, not the v2 `useToast` hook)

### 5d. Theme and branding
- App color scheme: cool blues/grays reflecting Nordic weather
- App icon and name in the header
- PWA manifest for "Add to Home Screen" on mobile

---

## Step 6: Production Deployment

**What:** Deploy the complete app to Firebase production.

**Steps:**

### 6a. Environment configuration
- Set Gemini API key in Firebase Functions secrets: `firebase functions:secrets:set GEMINI_API_KEY`
- Verify all environment variables are set
- Set appropriate function memory and timeout limits

### 6b. Build and deploy
```bash
# Build frontend
npm run build

# Deploy everything
firebase deploy
```

This deploys:
- Hosting (React app)
- Cloud Functions (all functions)
- Firestore rules
- Firestore indexes (if any)
- Storage rules

### 6c. Post-deployment verification
- Sign in with Google on the production URL
- Verify weather fetch works
- Add a test wardrobe item
- Get a daily suggestion
- Submit feedback
- Check Cloud Functions logs for errors

### 6d. Firebase Hosting configuration
- Set up custom domain (optional)
- Configure caching headers for static assets
- Ensure SPA fallback (`rewrites` to `index.html`) is working

---

## Verification Checklist

- [ ] App works well on mobile (responsive layout, touch-friendly)
- [ ] All pages have loading, empty, and error states
- [ ] Photo upload works — can upload, preview, and display photos
- [ ] Photos are deleted from Storage when wardrobe items are deleted
- [ ] Category filters work correctly on the wardrobe page
- [ ] Search filters items by name, brand, material
- [ ] Cloud Functions handle all error scenarios gracefully
- [ ] Frontend shows user-friendly error messages
- [ ] App deployed to production Firebase
- [ ] Production sign-in, weather, suggestion, and feedback all work
- [ ] Storage security rules restrict access to the authenticated user
- [ ] No console errors in production build
- [ ] PWA manifest configured for mobile "Add to Home Screen"
