# Smart Display - Project Specification

## Overview

Smart Display is a personal clothing suggestion app that recommends outerwear and layering choices each morning based on the full-day weather forecast in Oslo, Norway. Built as a hobby project for single-user use.

### Problem Statement

As someone who migrated from Sri Lanka to Oslo 3 years ago, deciding what jacket to wear, how many layers to put on, and what accessories to bring (gloves, hat, scarf) remains a daily challenge. Norwegian weather varies significantly and requires wardrobe decisions that aren't intuitive for someone from a tropical climate.

### Solution

A web app that:

1. Stores the user's wardrobe (jackets, sweaters, trousers, accessories) — with lazy onboarding via product URLs
2. Fetches the full-day weather forecast for Oslo from yr.no
3. Classifies weather conditions using Oslo-specific logic (dry cold, wet slush, etc.)
4. Uses Google Gemini to generate personalized outerwear/layering suggestions
5. Learns the user's personal temperature tolerance over time through a feedback loop

## Tech Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Frontend     | React (with Vite)                 |
| UI Library   | Chakra UI                         |
| Hosting      | Firebase Hosting                  |
| Backend      | Firebase Cloud Functions          |
| Database     | Firestore (region: eur3)          |
| Auth         | Firebase Auth (Google sign-in)    |
| AI           | Google Gemini API (via Firebase)  |
| Weather data | yr.no API (Locationforecast 2.0)  |

**Dev tooling:** Chakra UI MCP server is used during development for AI-assisted component generation and referencing Chakra's component API.

**Firebase project:** `smart-display-172af`

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React SPA                           │
│  (Firebase Hosting)                                     │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │Dashboard │  │ Wardrobe │  │ Add Item │  │ Login  │  │
│  │  View    │  │   List   │  │  (URL /  │  │(Google)│  │
│  │          │  │          │  │  Manual) │  │        │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬───┘  │
│       │              │             │              │      │
└───────┼──────────────┼─────────────┼──────────────┼──────┘
        │              │             │              │
        ▼              ▼             ▼              ▼
┌─────────────────────────────────────────────────────────┐
│              Firebase Cloud Functions                    │
│                                                         │
│  ┌──────────────────┐  ┌────────────────────────────┐   │
│  │  getDailySugges- │  │   crawlProductUrl          │   │
│  │  tion            │  │                            │   │
│  │                  │  │  1. Fetch URL HTML          │   │
│  │  1. Read weather │  │  2. Send to Gemini for     │   │
│  │  2. Classify     │  │     structured extraction  │   │
│  │     (Oslo Logic) │  │  3. Return item data       │   │
│  │  3. Read wardrobe│  │                            │   │
│  │  4. Read feedback│  │                            │   │
│  │     history      │  │                            │   │
│  │  5. Call Gemini  │  │                            │   │
│  │  6. Cache result │  └────────────────────────────┘   │
│  └──────────────────┘                                   │
│                                                         │
│  ┌──────────────────┐  ┌────────────────────────────┐   │
│  │  fetchWeather    │  │   submitFeedback           │   │
│  │  (Scheduled)     │  │                            │   │
│  │                  │  │  Records what user wore    │   │
│  │  Fetches yr.no   │  │  + comfort rating          │   │
│  │  hourly data,    │  │                            │   │
│  │  aggregates into │  │                            │   │
│  │  periods, caches │  │                            │   │
│  └──────────────────┘  └────────────────────────────┘   │
│                                                         │
└─────────────────────┬───────────────────────────────────┘
                      │
         ┌────────────┼────────────────┐
         ▼            ▼                ▼
┌──────────────┐ ┌──────────┐  ┌─────────────┐
│  Firestore   │ │  yr.no   │  │ Google      │
│              │ │  API     │  │ Gemini API  │
│  - wardrobe  │ │          │  │             │
│  - weather   │ │          │  │ - extract   │
│  - suggest.  │ │          │  │   product   │
│  - feedback  │ │          │  │ - generate  │
│              │ │          │  │   suggest.  │
└──────────────┘ └──────────┘  └─────────────┘
```

**Data flow for daily suggestion:**

1. Scheduled function fetches hourly forecast from yr.no → aggregates into time periods → caches in Firestore
2. User opens app → frontend calls `getDailySuggestion`
3. Function reads cached weather → classifies conditions (Oslo Logic) → reads wardrobe + feedback history → builds Gemini prompt → returns suggestion
4. User optionally submits feedback at end of day (what they wore, comfort rating)

---

## Core Features

### 1. Lazy Onboarding — URL-to-Item

Users can add clothing items to their wardrobe in two ways:

**URL-based entry (primary)** — User pastes a product URL (e.g., from Zalando, Norrøna, Uniqlo):

1. Cloud Function fetches the page HTML
2. The raw HTML/text is sent to Gemini with a structured extraction prompt
3. Gemini extracts: name, category, material/fabric, color, warmth characteristics, waterproof/windproof properties, temperature suitability, and product image URL
4. Extracted data is returned to the frontend for user review
5. User can adjust any fields before saving to Firestore

**Manual entry** — User fills in as much detail as they can provide:
- Name / description
- Category: jacket, sweater, fleece, base layer, trousers, hat, gloves, scarf, other
- Color
- Material / fabric
- Brand
- Warmth level (1–5 scale: 1 = light, 5 = heavy winter)
- Waterproof (yes / no / water-resistant)
- Windproof (yes / no)
- Temperature range suitability (e.g., "0 to -10°C")
- Photo upload
- Notes (free text)

Users can also edit and delete existing wardrobe items.

### 2. Weather-Driven Logic Engine

**Data collection:**
- Fetch hourly forecast from yr.no Locationforecast 2.0 API
- yr.no returns a timeseries with hourly `instant` data (temp, humidity, wind, pressure) and period summaries (`next_1_hours`, `next_6_hours`) with precipitation and weather symbol codes
- Aggregate hourly data into time periods:
  - Morning (06:00–09:00)
  - Daytime (09:00–15:00)
  - Afternoon (15:00–18:00)
  - Evening (18:00–21:00)
- For each period, derive: avg temperature, feels-like temperature, total precipitation, avg wind speed, max wind gust, humidity, weather symbol
- Derive daily summary: min/max temperature, total precipitation, max wind speed

**Weather condition classification — the "Oslo Logic":**

Norwegian weather isn't just about temperature. The same -5°C feels completely different depending on moisture and wind. The system classifies each day into a condition type:

| Condition | Criteria | Layering implication |
| --- | --- | --- |
| Dry Cold | Temp < 0°C, low precipitation, low humidity | Insulation priority — down jacket, wool layers |
| Wet Cold | Temp -5°C to 3°C, rain/sleet, high humidity | Waterproof shell essential, synthetic insulation |
| Wet Slush/Slaps | Temp 0°C to 5°C, rain/wet snow mix | Waterproof everything, layers for variable temp |
| Mild Damp | Temp 5°C to 12°C, overcast, light rain possible | Light waterproof layer, single mid-layer |
| Windy Cold | Any cold temp + wind speed > 8 m/s | Windproof outer, extra face/neck protection |
| Dry Mild | Temp 10°C to 20°C, low precipitation | Light jacket or sweater only |
| Warm | Temp > 20°C | Minimal layers |

This classification is passed to Gemini as context alongside the raw weather data, so the AI understands the practical feel of the conditions.

### 3. Daily Clothing Suggestion

- On opening the web app, the user sees today's outerwear/layering suggestion
- The suggestion is generated by sending to Gemini:
  - Full-day forecast (all time periods with weather data)
  - Oslo Logic condition classification
  - User's complete wardrobe
  - Feedback history (past comfort ratings and what was worn in similar conditions)
- The suggestion accounts for weather variations throughout the day:
  - Dress for the temperature range across all periods, not a single reading
  - Recommend layers that can be added/removed as conditions change (e.g., "bring your fleece for the cold morning, you can take it off by afternoon")
  - Factor in worst-case conditions for the day (e.g., rain expected in the evening → bring waterproof layer even if the morning is dry)
- Gemini produces a recommendation covering:
  - Base layer
  - Mid layer (sweater/fleece)
  - Outer layer (jacket)
  - Accessories (hat, gloves, scarf) if needed
- The suggestion includes reasoning tied to specific times of day
- Suggestions are cached for the day to avoid redundant API calls

### 4. Feedback Loop

At the end of the day (or next morning), the user can record what they actually wore and how comfortable they were:

- Select which wardrobe items they wore
- Rate comfort: too cold / slightly cold / just right / slightly warm / too warm
- Optional note (e.g., "was fine until the wind picked up in the evening")

This feedback is stored in Firestore and included in future Gemini prompts so the AI can learn the user's personal temperature tolerance. For example:

- "User reported being cold in a fleece + softshell at -3°C dry cold → suggest warmer options for similar conditions"
- "User consistently rates 'just right' with light down jacket at 0–5°C → this is their comfort baseline"

### 5. Authentication

- Google sign-in via Firebase Auth
- Single-user app — the auth is primarily to secure access, not for multi-tenancy
- Firestore security rules restrict data to the authenticated user

---

## Data Schema (Firestore)

```
users/{userId}
  │
  ├── profile (document)
  │     └── { displayName, email, location: "Oslo",
  │           coordinates: { lat: 59.9139, lon: 10.7522 } }
  │
  ├── wardrobe/{itemId} (subcollection)
  │     └── { name, category, color, material, brand,
  │           warmthLevel,          // 1–5
  │           waterproof,           // "yes" | "no" | "water-resistant"
  │           windproof,            // boolean
  │           temperatureRange,     // { min: -10, max: 5 }
  │           photoUrl, sourceUrl,
  │           notes,
  │           extractedByAI,        // boolean — true if from URL crawl
  │           createdAt, updatedAt }
  │
  ├── weatherCache/{date} (subcollection, doc ID e.g., "2026-03-01")
  │     └── { date, fetchedAt,
  │           conditionType,        // Oslo Logic classification
  │           periods: {
  │             morning:   { temp, feelsLike, precipitation,
  │                          wind, windGust, humidity, symbol },
  │             daytime:   { ... },
  │             afternoon: { ... },
  │             evening:   { ... }
  │           },
  │           summary: { minTemp, maxTemp,
  │                      totalPrecipitation, maxWind },
  │           rawTimeseries: [ ... ] // optional: raw hourly data
  │         }
  │
  ├── suggestions/{date} (subcollection, doc ID e.g., "2026-03-01")
  │     └── { date, generatedAt,
  │           conditionType,
  │           forecast,             // snapshot of weather used
  │           suggestion: {
  │             baseLayer:    { itemId, name, reasoning },
  │             midLayer:     { itemId, name, reasoning },
  │             outerLayer:   { itemId, name, reasoning },
  │             accessories:  [ { itemId, name, reasoning } ],
  │             overallAdvice: "..."
  │           },
  │           rawGeminiResponse }
  │
  └── feedback/{date} (subcollection, doc ID e.g., "2026-03-01")
        └── { date, submittedAt,
              itemsWorn: [ itemId, itemId, ... ],
              comfortRating,        // "too-cold" | "slightly-cold" |
                                    // "just-right" | "slightly-warm" | "too-warm"
              conditionType,        // Oslo Logic classification that day
              weatherSummary,       // snapshot of weather that day
              note }
```

---

## API Endpoints / Cloud Function Definitions

### `fetchWeather` — Scheduled (daily at 05:00 CET)

Pre-fetches and caches the day's weather forecast.

- **Trigger:** Firebase scheduled function (pubsub cron)
- **Process:**
  1. Call yr.no API: `GET https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=59.9139&lon=10.7522`
  2. Filter timeseries to today's hours (06:00–21:00)
  3. Aggregate into 4 time periods (morning, daytime, afternoon, evening)
  4. Classify condition type using Oslo Logic rules
  5. Write to `users/{userId}/weatherCache/{date}`
- **Headers:** `User-Agent: SmartDisplay/1.0 github.com/ashenw/smart-display`
- **Error handling:** Retry once on failure; log error if retry fails

### `getDailySuggestion` — Callable

Returns today's clothing suggestion, generating it if not cached.

- **Trigger:** `onCall` (authenticated)
- **Input:** none (uses authenticated user's ID)
- **Process:**
  1. Check `suggestions/{today}` — return cached if exists
  2. Read `weatherCache/{today}` — if missing, fetch weather on-demand
  3. Read all docs from `wardrobe/` subcollection
  4. Read recent `feedback/` docs (last 14 days)
  5. Build Gemini prompt (see Prompt Engineering section)
  6. Call Gemini API
  7. Parse structured response
  8. Cache in `suggestions/{today}`
  9. Return suggestion to client
- **Response:**

  ```json
  {
    "date": "2026-03-01",
    "conditionType": "wet-cold",
    "forecast": { "periods": { ... }, "summary": { ... } },
    "suggestion": {
      "baseLayer": { "itemId": "...", "name": "Merino wool base", "reasoning": "..." },
      "midLayer": { "itemId": "...", "name": "Fleece jacket", "reasoning": "..." },
      "outerLayer": { "itemId": "...", "name": "Gore-Tex shell", "reasoning": "..." },
      "accessories": [ { "itemId": "...", "name": "Wool beanie", "reasoning": "..." } ],
      "overallAdvice": "It's a wet cold day (-2°C with sleet). Your Gore-Tex shell over the fleece will keep you dry and warm. Bring gloves — the wind picks up after 15:00."
    }
  }
  ```

### `crawlProductUrl` — Callable

Extracts clothing item data from a product page URL.

- **Trigger:** `onCall` (authenticated)
- **Input:** `{ url: string }`
- **Process:**
  1. Validate URL (must be HTTP/HTTPS)
  2. Fetch page HTML (with timeout, max body size)
  3. Strip scripts/styles, extract text content and meta tags
  4. Send to Gemini with extraction prompt (see Prompt Engineering section)
  5. Return structured item data
- **Response:**

  ```json
  {
    "name": "Norrøna Falketind Gore-Tex Jacket",
    "category": "jacket",
    "color": "blue",
    "material": "Gore-Tex 3-layer",
    "brand": "Norrøna",
    "warmthLevel": 3,
    "waterproof": "yes",
    "windproof": true,
    "temperatureRange": { "min": -10, "max": 10 },
    "photoUrl": "https://...",
    "sourceUrl": "https://original-url.com/..."
  }
  ```

### `submitFeedback` — Callable

Records the user's daily outfit feedback.

- **Trigger:** `onCall` (authenticated)
- **Input:**

  ```json
  {
    "date": "2026-03-01",
    "itemsWorn": ["itemId1", "itemId2"],
    "comfortRating": "slightly-cold",
    "note": "optional note"
  }
  ```
- **Process:**
  1. Read `weatherCache/{date}` to snapshot weather conditions
  2. Write to `feedback/{date}`
- **Response:** `{ "success": true }`

---

## Prompt Engineering Strategy

### Onboarding Prompt — Product URL Extraction

Used in `crawlProductUrl` when Gemini processes scraped page content.

```
You are a clothing product data extractor. Given the raw text content
from a product web page, extract the following structured information
about the clothing item.

Return a JSON object with these fields:
- name: Product name
- category: One of [jacket, sweater, fleece, base-layer, trousers,
  hat, gloves, scarf, other]
- color: Primary color
- material: Main fabric/material (e.g., "Gore-Tex", "merino wool",
  "polyester fleece")
- brand: Brand name
- warmthLevel: Integer 1–5 based on the product description and
  material (1 = ultralight summer, 2 = light spring/fall,
  3 = moderate cold, 4 = cold winter, 5 = extreme cold)
- waterproof: One of ["yes", "no", "water-resistant"]
- windproof: boolean
- temperatureRange: { min: number, max: number } in Celsius —
  estimate the comfortable temperature range based on the product
  type and materials
- photoUrl: Main product image URL if found in the page

If any field cannot be determined from the page content, set it to null.

PAGE CONTENT:
{scraped_text}
```

### Recommendation Prompt — Daily Suggestion

Used in `getDailySuggestion` when Gemini generates the outfit recommendation.

```
You are a personal clothing advisor for someone living in Oslo, Norway
who moved from Sri Lanka 3 years ago. They are still adapting to
Nordic weather and tend to {comfort_tendency} based on past feedback.

TODAY'S WEATHER IN OSLO:
Condition type: {condition_type} (e.g., "Wet Cold", "Dry Cold")
Morning (06–09):   {morning_temp}°C (feels like {morning_feels}°C),
                   {morning_precip}mm precip, wind {morning_wind} m/s
Daytime (09–15):   {daytime_data}
Afternoon (15–18): {afternoon_data}
Evening (18–21):   {evening_data}
Summary: {min_temp}°C to {max_temp}°C, total {total_precip}mm precipitation

THEIR WARDROBE:
{wardrobe_items_json}

PAST FEEDBACK (last 14 days):
{feedback_entries}

Based on the full-day forecast, recommend what to wear today.
Consider that they will be outside during transitions between periods
(commute, errands) and should be prepared for the worst conditions
of the day.

Return a JSON object:
{
  "baseLayer":    { "itemId": "...", "reasoning": "..." },
  "midLayer":     { "itemId": "...", "reasoning": "..." },
  "outerLayer":   { "itemId": "...", "reasoning": "..." },
  "accessories":  [{ "itemId": "...", "reasoning": "..." }],
  "overallAdvice": "2–3 sentence summary explaining the recommendation
                    with references to specific times of day"
}

Important:
- Only recommend items that exist in their wardrobe
- If the wardrobe is missing an essential item for today's conditions,
  mention this in overallAdvice
- Reference specific times of day in your reasoning
- Account for the user's comfort tendency from feedback history
```

**Comfort tendency derivation:** Before building the prompt, the function analyzes recent feedback to determine a tendency string:

- Mostly "too-cold" / "slightly-cold" → `"feel the cold more than average"`
- Mostly "just-right" → `"have well-calibrated cold tolerance"`
- Mostly "too-warm" / "slightly-warm" → `"tend to run warm"`

---

## Web App Pages

| Page              | Description                                                       |
|-------------------|-------------------------------------------------------------------|
| `/`               | Dashboard — today's weather summary + clothing suggestion         |
| `/wardrobe`       | List all wardrobe items with filters by category                  |
| `/wardrobe/add`   | Add item — URL input with auto-extract, or manual form            |
| `/wardrobe/:id`   | Edit/view item detail                                             |
| `/feedback`       | Submit today's feedback (what you wore + comfort rating)          |
| `/login`          | Google sign-in                                                    |

---

## MVP Roadmap

### Phase 0 — Experiment (foundation)

**Goal:** Prove the concept works end-to-end with minimal UI.

- [ ] Set up React + Vite project with Firebase SDK
- [ ] Implement Firebase Auth (Google sign-in)
- [ ] Set up Firestore security rules
- [ ] Build `fetchWeather` Cloud Function — fetch yr.no data, aggregate into periods, classify with Oslo Logic, cache in Firestore
- [ ] Build a minimal dashboard page that displays cached weather data
- [ ] Test yr.no API integration and verify data model

### Phase 1 — Core Suggestion (MVP)

**Goal:** Get daily clothing suggestions working.

- [ ] Build manual wardrobe entry form + Firestore CRUD
- [ ] Build wardrobe list page
- [ ] Build `getDailySuggestion` Cloud Function — read weather + wardrobe, call Gemini, return suggestion
- [ ] Design and iterate on the recommendation prompt
- [ ] Build dashboard suggestion display — show layering recommendation with reasoning
- [ ] Schedule `fetchWeather` to run daily at 05:00 CET

### Phase 2 — Lazy Onboarding

**Goal:** Make it easy to populate the wardrobe.

- [ ] Build `crawlProductUrl` Cloud Function — fetch URL, extract with Gemini
- [ ] Design and iterate on the extraction prompt
- [ ] Build URL-based add item flow in frontend — paste URL → preview extracted data → edit → save
- [ ] Handle edge cases (invalid URLs, pages that block crawling, missing data)

### Phase 3 — Feedback Loop

**Goal:** Personalize suggestions over time.

- [ ] Build `submitFeedback` Cloud Function
- [ ] Build feedback page in frontend — select items worn, rate comfort
- [ ] Integrate feedback history into the recommendation prompt
- [ ] Derive and apply comfort tendency analysis

### Phase 4 — Polish (v1.0)

**Goal:** Make it reliable and pleasant to use daily.

- [ ] Improve UI/UX — responsive design, loading states, error handling
- [ ] Add wardrobe photo upload (Firebase Storage)
- [ ] Add wardrobe category filters and search
- [ ] Handle edge cases — empty wardrobe, missing weather data, API failures
- [ ] Deploy to production Firebase

---

## Future Enhancements (Out of Scope for v1)

- **Push notifications / email** — morning notification with the daily suggestion
- **Activity-based suggestions** — input daily plans (outdoor activity, office, commute) to refine recommendations
- **Full outfit suggestions** — expand beyond outerwear to suggest complete outfits (tops, trousers, shoes)
- **Multiple users** — support household members with separate wardrobes

---

## External API Notes

### yr.no Locationforecast 2.0
- Endpoint: `https://api.met.no/weatherapi/locationforecast/2.0/complete`
- Oslo coordinates: lat=59.9139, lon=10.7522
- Returns hourly timeseries with `instant` parameters (temp, humidity, wind, pressure) and period summaries (`next_1_hours`, `next_6_hours`) with precipitation amount and weather symbol codes
- Requires `User-Agent` header (e.g., `SmartDisplay/1.0 github.com/ashenw/smart-display`)
- Terms: https://developer.yr.no/doc/TermsOfService/
- Free, no API key required

### Google Gemini API
- Accessed via Firebase AI / Vertex AI SDK or `@google/generative-ai` package
- API key stored in Firebase environment config / Secret Manager
- Used for two distinct tasks: product data extraction (onboarding) and outfit recommendation (daily suggestion)
