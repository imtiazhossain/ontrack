# onTrack

iOS-first daily life-tracking app built with Expo. Schedule your day, track meals, workouts, and work — with mock AI-assisted insights.

## Quick start

```bash
npm install
npm run ios
```

Keep that terminal running while using the app. Local movie and TV search uses an API route served
by Expo; if the server stops, the app will show a message telling you to run `npm run ios`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run ios` | Clear Metro's cache, start Expo, and open iOS Simulator |
| `npm run typecheck` | TypeScript validation |
| `npm test` | Run unit tests |

## Project structure

```text
src/
  app/              Expo Router screens
  components/       Reusable UI primitives and shared widgets
  design-system/    Tokens, themes, typography
  features/         Feature-specific UI (calendar, daily tracking)
  services/         AI and storage adapters
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
- One week of seed data on first launch

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

## Movie search setup

Movie events use TMDB through server-side Expo Router API routes. Copy `.env.example` to
`.env.local` and set `TMDB_READ_ACCESS_TOKEN`. Local native development automatically uses the
current Expo CLI host. Set `EXPO_PUBLIC_API_BASE_URL` to the deployed API origin for production
native builds. Keep the TMDB token server-only.

The `npm run ios` development server handles local API routes while it remains running. For a
production-like local server, use `npx expo serve`. Deploy the web bundle and API routes together with
`npx expo export -p web` followed by `npx eas-cli@latest deploy`; configure the same environment
variables for preview and production in EAS.
