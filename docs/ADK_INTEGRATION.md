# Google Agent Development Kit (GADK) Integration

## Overview

> [!NOTE]
> **Phase 2 Development Only**
> This document outlines the integration strategy for the Google Agent Development Kit (GADK). This work is strictly slated for **Iteration 2 (Post-MVP)**. For the current MVP development phase, we are using the standard Firebase Vertex AI / Gemini SDK with monolithic prompts to prioritize velocity and validate core logic without aditional framework overhead.

The Google Agent Development Kit (GADK, `google/adk-js`) is a TypeScript-first framework for building AI agents. It shifts AI integration from monolithic prompt engineering to a "code-first" structure involving **Agents**, **Instructions**, and **Tools**.

While the MVP of the WeatherWear app uses the standard Firebase Vertex AI / Gemini SDK with monolithic prompts for speed to market and core logic validation, GADK is the recommended path for future iterations to improve maintainability, testing, and capability.

## Why GADK for Future Iterations?

1. **Type Safety & Structure**: Instead of manually parsing JSON strings from a Gemini response, GADK enforces strict TypeScript interfaces for agent outputs.
2. **Tool Use**: Agents can autonomously invoke tools (e.g., fetching weather, reading the Firestore wardrobe database) instead of the Cloud Function needing to pre-fetch all context and cram it into the prompt.
3. **Modularity**: It allows breaking down complex reasoning into smaller, specialized agents (e.g., an extraction agent, a styling agent, a feedback-learning agent) rather than maintaining 100-line prompts.

## Proposed Integration Points

### 1. The "Onboarding" Agent (`crawlProductUrl`)
**Current MVP**: Fetch HTML, strip it, send raw text to Gemini with an extraction prompt.
**GADK Approach**:
- **Agent**: `ProductExtractionAgent`
- **Instructions**: "You are an expert at extracting structured clothing metadata from e-commerce pages."
- **Tools**: Equip the agent with a `FetchWebpageTool`. The agent decides how to fetch and parse the URL dynamically.
- **Output**: Typed output generation directly into the `WardrobeItem` database schema.

### 2. The "Stylist" Agent (`getDailySuggestion`)
**Current MVP**: A single Cloud Function reads weather from cache, reads all wardrobe items from Firestore, evaluates the "Oslo Logic", and sends the entire state to Gemini in one massive prompt.
**GADK Approach**:
- **Agent**: `OsloStylistAgent`
- **State**: Pass the user's location and comfort tendency as structured state variables.
- **Tools**:
  - `GetWardrobeTool`: The agent queries Firestore directly for items it needs (e.g., "Find me waterproof jackets").
  - `GetWeatherTool`: The agent fetches the weather for the day.
  - `EvaluateOsloLogicTool`: The agent uses this to classify the weather conditions based on the Oslo Logic.
- **Output Validation**: Ensures the response strictly matches the `Suggestion` JSON schema.

## Migration Strategy (Post-MVP)

1. **Install Dependencies**: `npm install @google/adk` in the `functions/` directory.
2. **Refactor Extract**: Start by refactoring the `crawlProductUrl` function as it is stateless, less critical to the core loop, and easier to isolate.
3. **Refactor Suggestion**: Refactor the `getDailySuggestion` function once the MVP has stabilized the "Oslo Logic" and users have validated that the core prompt recommendations are accurate.
4. **Define Tools**: Implement robust TypeScript tools for Firestore and `yr.no` API access that the GADK agents can consume during their execution loop.
