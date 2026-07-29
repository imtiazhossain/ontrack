# onTrack

iOS-first, local-first daily life app built with Expo. Schedule your day and turn food, fitness,
plant care, and travel modules on or off without deleting their data.

## Quick start

```bash
npm install
npm run ios
```

Local development uses Metro. TestFlight builds use the `testflight` EAS profile and embed the
JavaScript bundle, so testers do not need Metro, Expo Go, a QR code, or the developer computer.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run ios` | Clear Metro's cache, start Expo, and open iOS Simulator |
| `npm run typecheck` | TypeScript validation |
| `npm test` | Run unit tests |
| `npx eas-cli@latest build --platform ios --profile testflight` | Build the standalone TestFlight binary |

## Project structure

```text
src/
  addons/           Small first-party add-on catalog and visibility rules
  agents/           Agent manifests, permissions, provider and tool runtime
  app/              Expo Router screens
  components/       Reusable UI primitives and shared widgets
  design-system/    Tokens, themes, typography
  features/         Isolated feature UI, models, and provider interfaces
  services/         AI, cloud sync, provider, and storage adapters
  store/            Zustand persisted state
  types/            Shared TypeScript models
  utils/            Date, completion, haptics helpers
```

## Current milestone

- Onboarding, Today, Calendar, Insights, Profile tabs
- Daily timeline with completion ring and mock AI summaries
- Activity add/edit, long-press actions (skip, duplicate, move, delete)
- Food detail with photo picker and mock AI meal analysis
- Gym active workout mode with persisted set completion
- Work task checklist
- Local persistence via Zustand + AsyncStorage
- Plant identification, health check-ins, room-aware care plans, and local watering reminders
- Tester-controlled Food, Fitness, Plants, and Travel add-ons
- Travel plans, calendar dates, friend invites, flight search, and stay search
- Hosted install-or-open travel and checklist collaboration invitations at
  `ontrack--links.expo.app`
- Google/Apple SSO with local guest mode and guest-to-account data resolution
- Agent-ready catalog, permissions, install/remove state, provider runtime, and synced conversations
  (no concrete agents are included yet)
- One week of seed data on first launch

See [`docs/ADDONS.md`](docs/ADDONS.md) for the extension contract and cost controls.

## TestFlight and cloud sync

The `testflight` EAS profile is a store-distribution release build. Add
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the EAS `preview`
environment, then apply the Supabase migrations before inviting cross-device testers. If those
values are absent, the same binary runs in local test mode and never waits for a server.

The app uses one `app_state` row per account and data domain, private `app-media` storage, row-level
security, and debounced writes. Guests stay local until they choose Google or Apple; see
[`docs/AUTH_SETUP.md`](docs/AUTH_SETUP.md) for provider-console callbacks, Apple entitlement and
secret-rotation requirements, and release gates. No realtime, feature-flag, subscription, or plugin
vendor is required for the beta.

## Meal analysis

Meals support direct camera capture, photo-library input, restaurant/delivery links, manual correction,
full source nutrients, and target-aware Insights. Image and link analysis use guarded server routes with
OpenAI vision/web search and USDA FoodData Central grounding. Copy the nutrition variables from
`.env.example`; secrets must remain server-only. `CLINICAL_AI_ENABLED` defaults to `false` so no meal
photo is transmitted until the intended privacy configuration is explicitly enabled.

Youth, infant, and cloud-clinical flags default off. The Supabase migration in `supabase/migrations`
creates the private nutrition schema, RLS policies, clinician approval rules, audit immutability, and
private meal-photo bucket. Do not enable PHI processing until the required BAAs, high-compliance project
configuration, legal review, clinical review, and security review are complete.

For free local photo analysis during development, install Ollama and pull `qwen3-vl:2b`, then set
`MEAL_AI_PROVIDER=ollama` and `LOCAL_MEAL_AI_ENABLED=true` in `.env.local`. The Expo API route sends
the normalized image only to the loopback Ollama service; USDA grounding remains optional through
`USDA_FDC_API_KEY`. Restaurant-link analysis continues to require the guarded cloud provider.

## iOS notes

- Portrait iPhone only for this milestone
- Camera unavailable in Simulator; meal flow uses photo library picker
- Long-press an activity card for the action menu

## Plant analysis

Plants use guarded Expo Router API routes and the same free local Ollama vision model as meal photos
for confidence-gated identification, visible-health assessment, room-aware care guidance, and
follow-up check-ins. With the existing `MEAL_AI_PROVIDER=ollama` and `LOCAL_MEAL_AI_ENABLED=true`
setup, plants work without additional provider configuration. Alternatively set
`PLANT_AI_PROVIDER=ollama`, `LOCAL_PLANT_AI_ENABLED=true`, and optionally
`OLLAMA_PLANT_MODEL=qwen3-vl:2b`. Plant and check-in photos are normalized into the app documents directory; analysis
copies are resized and re-encoded to remove EXIF metadata. Optional room photos are sent only for
the loopback Ollama care-plan request and are not persisted by the app. General horticultural
reference links are attached by the server rather than invented by the local model.

Watering reminders are one-off local notifications. Each logged watering advances the next check
from the actual watering date and creates the next Today/Calendar activity. Guidance is an editable
starting range and soil check, not an exact requirement or plant-disease diagnosis.

## Movie search setup

Movie events use TMDB through server-side Expo Router API routes. Copy `.env.example` to
`.env.local` and set `TMDB_READ_ACCESS_TOKEN`. Local native development automatically uses the
current Expo CLI host. Set `EXPO_PUBLIC_API_BASE_URL` to the deployed API origin for production
native builds. Keep the TMDB token server-only.

The `npm run ios` development server handles local API routes while it remains running. For a
production-like local server, use `npx expo serve`. Deploy the web bundle and API routes together with
`npx expo export -p web` followed by `npx eas-cli@latest deploy`; configure the same environment
variables for preview and production in EAS.

## Live flight search

Flight results are rendered inside the Travel add-on through a server-side Amadeus Self-Service
adapter. Create an Amadeus application and configure `AMADEUS_CLIENT_ID`,
`AMADEUS_CLIENT_SECRET`, and `AMADEUS_ENVIRONMENT`. The `test` environment returns limited cached
sandbox data and is labeled **Test data** in the app. Set the environment to `production` only after
Amadeus enables production access; those results are labeled **Live prices**.

Keep both credentials server-only. For standalone and TestFlight builds,
`EXPO_PUBLIC_API_BASE_URL` must point to the deployed Expo API-route origin. Configure the Amadeus
secrets in the same EAS Hosting environment, never in `eas.json` or an `EXPO_PUBLIC_` variable.
