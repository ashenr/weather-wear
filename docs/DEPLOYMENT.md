# Deployment Guide

## Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Logged into Firebase CLI: `firebase login`
- Node.js 24+
- Firebase project `smart-display-172af` configured (see `.firebaserc`)

## Environment Setup

### Secrets Configuration

Set required secrets before deploying functions:

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

### Regions

| Service          | Region        |
|------------------|---------------|
| Cloud Functions  | europe-west1  |
| Firestore        | eur3          |

## Linting

**Frontend:**

```bash
npm run lint
```

**Cloud Functions:**

```bash
cd functions && npm run lint
```

## Build

### Frontend (React + Vite)

```bash
npm run build
```

Output: `dist/` directory

### Cloud Functions

```bash
cd functions && npm run build
```

Output: `functions/lib/` directory

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

# Storage rules only
firebase deploy --only storage:rules

# Firestore indexes
firebase deploy --only firestore:indexes
```

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

## Firestore Indexes

Don't pre-define indexes. When queries require a composite index:

1. Check Cloud Functions logs: `firebase functions:log`
2. Find the error message containing an index creation URL
3. Click the URL to create the required composite index in the Firebase Console

## Local Development with Emulators

### Environment Variables

Create `.env.local` in the project root (gitignored):

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=smart-display-172af.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=smart-display-172af
VITE_FIREBASE_STORAGE_BUCKET=smart-display-172af.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_USE_EMULATORS=true        # connects frontend SDK to local emulators
```

When `VITE_USE_EMULATORS=true`, `src/lib/firebase.ts` automatically connects
`auth`, `db`, and `functions` to the local emulator ports. Remove or set to
`false` to use production Firebase.

### Start Emulators

Build functions first, then start emulators:

```bash
cd functions && npm run build && cd ..
firebase emulators:start --only auth,firestore,functions
```

### Emulator Ports

| Service      | Port |
|--------------|------|
| Auth         | 9099 |
| Functions    | 5001 |
| Firestore    | 8080 |
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
