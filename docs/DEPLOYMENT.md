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

### Start Emulators

```bash
firebase emulators:start
```

### Emulator Ports

| Service    | Port |
|------------|------|
| Auth       | 9099 |
| Functions  | 5001 |
| Firestore  | 8080 |
| Hosting    | 5000 |
| Emulator UI| 4000 |

### Frontend Dev Server

Run in a separate terminal alongside emulators:

```bash
npm run dev
```

The frontend Firebase SDK should be configured to connect to local emulators when running in development mode. See `src/lib/firebase.ts` for emulator connection setup.

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
