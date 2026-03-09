# Deployment Guide

## Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Logged into Firebase CLI: `firebase login`
- Node.js 24+
- Firebase project `smart-display-172af` configured (see `.firebaserc`)

## Environment Setup

### Secrets Configuration

Set required secrets before deploying functions (one-time setup):

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

Verify the secret exists:

```bash
firebase functions:secrets:access GEMINI_API_KEY
```

### Regions

| Service          | Region        |
|------------------|---------------|
| Cloud Functions  | europe-west1  |
| Firestore        | eur3          |

---

## Pre-Deployment Checklist

Run all of the following before deploying. Fix any errors before proceeding.

### 1. Lint

```bash
# Frontend
npm run lint

# Cloud Functions
cd functions && npm run lint && cd ..
```

### 2. Test

```bash
# Frontend
npm test -- --run

# Backend unit tests
cd functions && npm run test:unit && cd ..
```

### 3. Build

```bash
# Frontend
npm run build

# Cloud Functions
cd functions && npm run build && cd ..
```

> **Note:** `VITE_USE_EMULATORS` is controlled by env files. `vite build` (production mode) automatically loads `.env.production` (committed, sets `VITE_USE_EMULATORS=false`). Local dev uses `.env.development.local` (gitignored, sets `VITE_USE_EMULATORS=true`). Do **not** put `VITE_USE_EMULATORS` in `.env.local` — that file loads in all modes and would override the production setting.

### 4. Remove deleted functions (if any)

If you removed a Cloud Function from the source code, Firebase will refuse to deploy in non-interactive mode unless you delete the old function first:

```bash
# Example — replace with actual function name and region
firebase functions:delete <functionName> --region <region>
```

To see what is currently deployed:

```bash
firebase functions:list
```

---

## Deploy Commands

### Deploy Everything

```bash
firebase deploy
```

### Deploy Specific Services

```bash
# Frontend only
firebase deploy --only hosting

# All Cloud Functions
firebase deploy --only functions

# Single function
firebase deploy --only functions:fetchWeather
firebase deploy --only functions:getDailySuggestion
firebase deploy --only functions:crawlProductUrl
firebase deploy --only functions:submitFeedback

# Firestore rules only
firebase deploy --only firestore:rules

# Firestore indexes
firebase deploy --only firestore:indexes

# Storage rules only
firebase deploy --only storage
```

---

## Full Production Deploy (step by step)

This is the complete sequence for a clean production deployment.

```bash
# 1. Lint
npm run lint
cd functions && npm run lint && cd ..

# 2. Test
npm test -- --run
cd functions && npm run test:unit && cd ..

# 3. Build
npm run build
cd functions && npm run build && cd ..

# 4. (If any functions were removed) Delete stale deployed functions
#    firebase functions:delete <name> --region <region>

# 5. Deploy
firebase deploy
```

---

## Post-Deployment Verification

1. Open the hosting URL and sign in with Google
2. Verify weather data loads on dashboard (trigger manually if needed)
3. Add a test wardrobe item (manual entry)
4. Request a daily suggestion
5. Submit feedback
6. Check Cloud Functions logs for errors:

```bash
firebase functions:log
```

## Function Configuration

Timeouts are set in each function's `onCall`/`onSchedule` options (not in `firebase.json`):

| Function             | Timeout |
|----------------------|---------|
| `fetchWeather`       | 30s     |
| `getDailySuggestion` | 60s     |
| `crawlProductUrl`    | 30s     |
| `submitFeedback`     | 10s     |

All functions run in `europe-west1` with `maxInstances: 10` (set via `setGlobalOptions` in `index.ts`).

---

## Firestore Indexes

Don't pre-define indexes. When queries require a composite index:

1. Check Cloud Functions logs: `firebase functions:log`
2. Find the error message containing an index creation URL
3. Click the URL to create the required composite index in the Firebase Console

## Local Development with Emulators

### Environment Variables

Two gitignored files are needed for local development:

**`.env.local`** — Firebase client config (same values for dev and prod):

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=smart-display-172af.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=smart-display-172af
VITE_FIREBASE_STORAGE_BUCKET=smart-display-172af.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

**`.env.development.local`** — dev-only flag (loaded only by `vite`, not by `vite build`):

```bash
VITE_USE_EMULATORS=true
```

> `.env.production` (committed) sets `VITE_USE_EMULATORS=false` for production builds automatically. Do **not** put `VITE_USE_EMULATORS` in `.env.local` — it would override the production setting.

When `VITE_USE_EMULATORS=true`, `src/lib/firebase.ts` automatically connects
`auth`, `db`, `storage`, and `functions` to the local emulator ports.

### Start Emulators

Build functions first, then start emulators. Use the helper script to automatically persist data between runs:

```bash
cd functions && npm run build && cd ..
./emulators.sh
```

The script runs `firebase emulators:start --only auth,firestore,functions,storage` with `--import emulator-data --export-on-exit emulator-data`. Data is saved to `emulator-data/` on Ctrl+C and restored on the next run. The directory is gitignored.

To start fresh (discard saved data):

```bash
rm -rf emulator-data && ./emulators.sh
```

### Emulator Ports

| Service      | Port |
|--------------|------|
| Auth         | 9099 |
| Functions    | 5001 |
| Firestore    | 8080 |
| Storage      | 9199 |
| Hosting      | 5000 |
| Emulator UI  | 4000 |

### Frontend Dev Server

Run in a separate terminal:

```bash
npm run dev
```

The Vite dev server picks up `VITE_USE_EMULATORS=true` from `.env.local` and
the Firebase SDK connects to emulators automatically.

### Signing In with the Auth Emulator

The app uses `signInWithRedirect` (not popup) for Google sign-in. When
connected to the Auth emulator, clicking "Sign in with Google" redirects to
the emulator's test IDP page at `http://localhost:9099/emulator/auth/handler`.

**First-time setup:**

1. Click "Sign in with Google" on the login page
2. The emulator IDP page shows "No Google.com accounts exist"
3. Click **"Add new account"**
4. Click **"Auto-generate user information"** (or fill in an email)
5. Click **"Sign in with Google.com"**
6. You'll be redirected back to the dashboard as a signed-in user

**Subsequent sign-ins:**
The emulator remembers created accounts. On the IDP page, just select the
existing test account and sign in.

> **Note:** Google's real OAuth rejects automated/debugged browsers (e.g.
> Chrome with `--remote-debugging-port`). Always use the Auth emulator for
> local development and automated testing — it bypasses OAuth entirely.

### Testing Cloud Functions Locally

Functions are accessible via the emulator:

- Callable functions: invoked through the Firebase client SDK connected to the emulator
- Scheduled functions: can be triggered manually via the Emulator UI (http://localhost:4000)
- HTTP functions: accessible at `http://localhost:5001/smart-display-172af/europe-west1/{functionName}`

## Rollback

### Hosting

Roll back to a previous version via Firebase Console:

1. Navigate to: Hosting > Release History
2. Select the previous version
3. Click "Roll back"

### Cloud Functions

Re-deploy the previous version from git:

```bash
git checkout <previous-commit>
cd functions && npm run build
firebase deploy --only functions
```

## Running Tests

### Backend Unit Tests

```bash
cd functions && npm test              # all tests
cd functions && npm run test:unit     # unit tests only
cd functions && npm run test:watch    # watch mode (unit only)
cd functions && npm run test:coverage # with coverage report
```

### Backend Integration Tests (require emulators)

```bash
# Option 1: start emulators separately
firebase emulators:start --only firestore,auth
cd functions && npm run test:integration

# Option 2: one command
firebase emulators:exec --only firestore,auth \
  "cd functions && npm run test:integration" \
  --project smart-display-172af
```

### Frontend Tests

```bash
npm test               # run all tests
npm run test:watch     # watch mode
npm run test:coverage  # with coverage report
```

See `docs/TESTING.md` for full testing strategy.

## Useful Commands

```bash
# View deployed functions
firebase functions:list

# View function logs (last 50 entries)
firebase functions:log --limit 50

# View logs for a specific function
firebase functions:log --only fetchWeather

# Open Firebase Console
firebase open

# Check current project
firebase use
```
