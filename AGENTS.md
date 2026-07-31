# onTrack agent guide

iOS-first, local-first daily-life Expo app (schedule, food, fitness, plants, travel, todos, vision board). Add-ons toggle without deleting data.

## Optimization mandate

Keep this repo optimized for future AI-agent token usage. When a change is in scope:

- Prefer shared helpers listed under **Shared patterns** — do not copy-paste ID, parse, image pick/persist, API fetch, vision transport, or destructive-confirm logic.
- Prefer editing the smallest feature entry file; extract presentational panels when a touched file would stay **>700 lines**.
- Update the feature entry table when you add a new module agents should start from.
- Follow `.cursor/rules/token-optimization.mdc` on every session.

## Stack

- Expo SDK 57 / Expo Router / React Native 0.86 / React 19
- Zustand + AsyncStorage persistence (`src/store/`)
- Supabase optional cloud sync (`src/services/cloud/`)
- Design system: `src/design-system/` + primitives in `src/components/primitives/`
- Path alias: `@/*` → `src/*`

Read Expo docs for **v57.0.0** only: https://docs.expo.dev/versions/v57.0.0/

## Layout

| Path | Role |
|------|------|
| `src/app/` | Expo Router screens + API routes (`*+api.ts`) |
| `src/features/` | Feature UI/models (todos, travel, vision-board, auth, …) |
| `src/store/` | Zustand stores; todo normalize helpers in `todos-normalize.ts` |
| `src/services/` | AI, cloud, nutrition/plants/recipes clients, HTTP helpers |
| `src/utils/` | Dates, IDs, parse helpers, image persist, haptics |
| `src/addons/` | First-party add-on catalog |
| `supabase/` | Migrations / RLS — apply before cross-device testing |

## Commands

- `npm run ios` / `android` / `web` — Metro (clears cache)
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — Jest (`**/__tests__/**/*.test.ts`)
- `npm run lint` — ESLint

## Non-negotiable UI rules

- **Safe area:** Routes stay inside `AppSafeArea`. Never put `insets.top` in scroll content containers. Native `Modal`s must pad a non-scrolling parent with `insets.top` first.
- **Dates:** Editable calendar dates use design-system `DateField` only. Storage keys are local `YYYY-MM-DD` via `@/utils/date` (`toDateKey`, `todayKey`, `formatDueLabel`, …).
- **Prompts:** App alerts/sheets use `appPrompt` / `AppPromptHost`. Never RN `Alert` or `ActionSheetIOS` for app UI. Cancel/dismiss = top-right X, not a full-width cancel button.

## Feature entry points

| Change | Start here |
|--------|------------|
| Checklist / todo list UI | `features/todos/todo-list-screen.tsx` (+ `todo-sort`, `todo-empty-state`, `todo-row`) |
| Lists overview / create list | `features/todos/todo-lists-overview.tsx` (+ `todo-list-card`, `empty-checklists`) |
| Grocery meals / combined view | `features/todos/grocery-list-screen.tsx` (+ `grocery-rows`, `grocery-utils`) |
| Recipe import | `features/todos/recipe-import-screen.tsx` (+ `recipe-ingredient-editor`) |
| Todo store / normalize | `store/todos.ts`, `store/todos-normalize.ts` |
| Today / day timeline | `features/daily-tracking/day-view.tsx` |
| Activity add/edit | `app/activity-form.tsx` (+ `activity-form-editors.tsx`) |
| Meal photo / link analysis | `app/detail/food/[id].tsx`, `services/nutrition/` |
| Plants list / detail / new | `app/(tabs)/plants.tsx`, `app/plants/` |
| Travel plans | `app/(tabs)/travel.tsx`, `features/travel/travel-plan-detail.tsx` (+ `travel-itinerary-*`, `travel-plan-actions`) |
| Vision board | `features/vision-board/` (`vision-board-consolidated` + `consolidated-model` / `consolidated-card`) |
| Workouts tab | `app/(tabs)/workouts.tsx` (+ `workout-session-builder`, `workout-today-plan`, `generic-anatomy-figure`) |
| Auth / guest | `features/auth/` |
| Cloud sync | `services/cloud/sync.ts` |
| Design tokens / prompts / DateField | `design-system/`, `components/primitives/` |

## Shared patterns (prefer these)

- **IDs:** `@/utils/id` — `newId(prefix)` for local entities; `newUuid` / `newPrefixedUuid` for synced/collaborative keys. `store/schedule` re-exports `newId` for compatibility.
- **Parse:** `@/utils/parse` — `asString`, `asTrimmedString`, `asNonEmptyString`, `asFiniteNumber`, `formatCompactNumber`.
- **API clients:** `@/services/http/api-url` (`resolveExpoApiUrl`) + `api-client` (`apiRequest`). Domain Error classes stay in each service.
- **Server vision AI:** `@/services/ai/vision-transport` — shared OpenAI Responses + loopback Ollama JSON chat used by `services/nutrition|plants|recipes/server.ts`. Keep domain prompts/schemas in those servers.
- **Images for APIs/docs:** `@/utils/image-persist` (`prepareJpegDataUrl`, `persistJpegToDocuments`). Domain wrappers remain in nutrition/recipes/plants/vision-board media modules.
- **Pick camera/library:** `@/utils/pick-image` — `pickCameraImage`, `pickLibraryImage`, `pickLibraryImages` (multi-select). Use `onDenied` when the screen shows its own error UI.
- **Destructive confirms:** `@/utils/confirm-destructive` (`confirmDestructiveAction`). Activity delete wraps it via `confirmDeleteActivity`.
- **Loading:** `LoadingBlock` in `components/primitives` for centered/inline spinners; prefer `EmptyState` for empty screens.
- **Server HTTP:** auth/rate-limit/cors/compression live under `src/services/http/`.

## State & sync

- Local-first Zustand stores; guests stay local until Google/Apple SSO.
- Cloud sync is debounced per account/domain (`services/cloud/sync.ts`). `startCloudSync` is a no-op stub for old shells — do not revive polling hooks.
- Secrets stay server-side / EAS env. Never put OpenAI/USDA keys in the client bundle.

## Testing notes

- Prefer focused unit tests next to the module (`__tests__/`).
- Existing rule tests encode safe-area, DateField, appPrompt, keyboard, and auth navigation constraints — keep them green when touching those surfaces.

## Pitfalls

- Do not persist image-picker cache URIs; always re-encode into documents via the image helpers.
- Recipe/meal source URLs must be `https:` when normalized for sync.
- Plant/travel entity IDs should use `@/utils/id` (or schedule’s re-export), not ad-hoc generators.
- Platform extension files (`*.ios.tsx`, `*.android.tsx`, `*.web.tsx`) are resolved by Metro — do not delete because imports look unused.
