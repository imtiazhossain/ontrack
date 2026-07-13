# onTrack

iOS-first daily life-tracking app built with Expo. Schedule your day, track meals, workouts, and work — with mock AI-assisted insights.

## Quick start

```bash
npm install
npx expo start --ios
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run ios` | Start Expo and open iOS Simulator |
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

## Mock AI

All AI features use `src/services/ai/mock-provider.ts` behind the `AIProvider` interface. Replace `aiProvider` in `src/services/ai/index.ts` with a real backend client when ready.

## iOS notes

- Portrait iPhone only for this milestone
- Camera unavailable in Simulator; meal flow uses photo library picker
- Long-press an activity card for the action menu

## Movie search setup

Movie events use TMDB through server-side Expo Router API routes. Copy `.env.example` to
`.env.local` and set `TMDB_READ_ACCESS_TOKEN`. Local native development automatically uses the
current Expo CLI host. Set `EXPO_PUBLIC_API_BASE_URL` to the deployed API origin for production
native builds. Keep the TMDB token server-only.

Run API routes locally with `npx expo serve`. Deploy the web bundle and API routes together with
`npx expo export -p web` followed by `npx eas-cli@latest deploy`; configure the same environment
variables for preview and production in EAS.
