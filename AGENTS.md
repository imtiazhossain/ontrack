# onTrack agent guide

iOS-first, local-first daily-life Expo app (schedule, food, fitness, plants, travel, todos, vision board). Add-ons toggle without deleting data.

**Token mandate:** keep always-on context slim; put domain depth in `.cursor/skills/<domain>/`; prefer Shared patterns over copies; extract when a touched file would stay **>700 lines**. Session essentials: `.cursor/rules/ontrack-core.mdc`. App UI / simulator: **read `.cursor/skills/agent-ui/SKILL.md` before verifying**.

## Stack

- Expo SDK 57 / Expo Router / React Native 0.86 / React 19
- Zustand + AsyncStorage (`src/store/`); optional Supabase (`src/services/cloud/`)
- Design system: `src/design-system/` + `src/components/primitives/`; alias `@/*` → `src/*`
- Expo docs **v57.0.0** only: https://docs.expo.dev/versions/v57.0.0/

## Layout

| Path | Role |
|------|------|
| `src/app/` | Expo Router screens + API routes (`*+api.ts`) |
| `src/features/` | Feature UI/models |
| `src/store/` | Zustand; todo normalize in `todos-normalize.ts` |
| `src/services/` | AI, cloud, domain clients, HTTP |
| `src/utils/` | Dates, IDs, parse, image persist, agent-ui |
| `src/addons/` | First-party add-on catalog |
| `supabase/` | Migrations / RLS — `supabase db push` after changes |

## Commands (agents)

- Metro: `npm run packager:ensure` / `packager:ensure:start` — **never** `npm start` in agent shells (Cursor kills it). Node 24 (`.nvmrc`).
- Android packager+emu: `packager:ensure:android` / `android:ensure:start` (Galaxy_S26).
- Dual verify: `npm run agent-ui:verify-both -- --route … --exists …`
- `npm run typecheck` · `npm test` · `npm run lint`

Prefer leaving Metro up for Fast Refresh. Details: agent-ui skill + `package.json` scripts.

## Agent close-out

App-affecting change → typecheck/tests + **dual iOS/Android** verify via agent-ui skill (`verify` if on route, else `once`/`flow`; assert/`--color`; no ritual screenshot). Stamp `ontrack.*` testIDs on new/edited interactive controls. Migrations → `supabase db push` same turn.

## Non-negotiable UI

- **Safe area:** `AppSafeArea`; never `insets.top` in scroll content; native Modals pad non-scrolling parent with `insets.top`.
- **Responsive:** `useResponsive()` + `AppText fit` — `.cursor/rules/responsive-layout.mdc`.
- **Field icons:** `FieldLeadingIcon` + `fieldLeadingIconRowStyle` — vertically centered.
- **Dates:** `DateField`; keys `YYYY-MM-DD` via `@/utils/date`.
- **Prompts:** `appPrompt` only — never RN `Alert` / `ActionSheetIOS`. Cancel = top-right X.
- **No redundant actions:** one local outcome → one control.

## Feature entry points

Domain depth → `.cursor/skills/` (**travel**, **todos**, **workouts**, **vision-board**, **health**, **agent-ui**).

| Change | Start here |
|--------|------------|
| Checklist / todo list UI | `features/todos/todo-list-screen.tsx` → **todos** |
| Lists overview / create list | `features/todos/todo-lists-overview.tsx` |
| Grocery meals / combined | `features/todos/grocery-list-screen.tsx` |
| Recipe import | `features/todos/recipe-import-screen.tsx` |
| Todo store / normalize | `store/todos.ts`, `store/todos-normalize.ts` → **todos** |
| Today / day timeline | `features/daily-tracking/day-view.tsx` |
| Activity add/edit | `app/activity-form.tsx` |
| Meal photo / link analysis | `app/detail/food/[id].tsx`, `services/nutrition/` |
| Plants | `app/(tabs)/plants.tsx`, `app/plants/`, `features/plants/` |
| Travel | `app/(tabs)/travel.tsx`, `features/travel/travel-plan-detail.tsx` → **travel** |
| Social / friends | `app/(tabs)/social.tsx`, `features/social/`, `services/friends`, `store/friends` |
| Vision board | `features/vision-board/` → **vision-board** |
| Workouts | `app/(tabs)/workouts.tsx` → **workouts** |
| Vehicles | `app/(tabs)/vehicles.tsx`, `features/vehicles/`, `store/vehicles.ts` |
| Health | `app/(tabs)/health.tsx`, `features/health/`, `store/health.ts` → **health** |
| Games | `app/(tabs)/games.tsx`, `features/games/` |
| Auth / guest | `features/auth/` |
| Profile avatar | `features/account/profile-avatar.tsx` |
| Dev Mode | `account_flags` → `services/cloud/account-flags.ts`, `dev-access.ts` |
| Cloud sync | `services/cloud/sync.ts` |
| Design tokens / DateField | `design-system/`, `components/primitives/` |

## Shared patterns (prefer these)

- **IDs:** `@/utils/id` — `newId` / `newUuid` / `newPrefixedUuid`
- **Parse / numeric:** `@/utils/parse` (`sanitizeNumericInput`, …); see `numeric-input.mdc`
- **Persist:** `@/services/storage` `createPersistStorage`
- **List equality / idle:** `@/utils/list-equality`, `@/utils/defer-until-idle`
- **API / vision:** `@/services/http/api-url` + `api-client`; `@/services/ai/vision-transport`
- **Images:** `@/utils/image-persist`, `@/utils/pick-image`
- **Destructive:** `@/utils/confirm-destructive`
- **UI primitives:** `LoadingBlock`, `EmptyState`, `Dropdown`, `SettingsGroup`/`SettingsRow`, `DangerZone`, `StatusBadge`, `MetaList`, `ActionChip`, `useSafeAreaChrome`
- **Responsive / field icons:** `useResponsive`, `AppText fit`, `FieldLeadingIcon` + `fieldLeadingIconRowStyle`
- **Agent UI:** `@/utils/agent-ui` + scripts — **agent-ui** skill (navigation decision tree: `verify` → flow/open → tap → one dump → assert; never re-run a flow just to re-check a screen you’re already on)
- **Typography:** `typeConfig` / `appTextStyle` / `AppText` (bold only when explicit)
- **Pull-to-refresh:** `usePullToRefresh` / `refreshAppData` (default on `Screen`; `refresh={false}` on dense editors)
- **Muscle Explorer:** `assets/images/workouts/highlights/` — male/female × front/side/back; `muscle-highlight-plate` + hit boxes

## State & sync

Local-first Zustand; guests local until SSO. Cloud sync debounced (`services/cloud/sync.ts`). `startCloudSync` is a no-op stub — do not revive polling. Secrets server-side / EAS only.

## Pitfalls

- Never persist image-picker cache URIs — re-encode via image helpers.
- Recipe/meal source URLs must be `https:` when normalized for sync.
- Entity IDs via `@/utils/id` — no ad-hoc generators.
- Keep platform extensions (`*.ios.tsx`, …) — Metro resolves them.
- **Avatar initials:** fixed `Text` + `avatarInitialsFontSize()` — never `AppText fit` inside `ProfileAvatar`.
- Travel pitfalls → **travel** skill.
