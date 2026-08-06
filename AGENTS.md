# onTrack agent guide

iOS-first, local-first daily-life Expo app (schedule, food, fitness, plants, travel, todos, vision board). Add-ons toggle without deleting data.

## Optimization mandate

Keep this repo optimized for future AI-agent token usage. When a change is in scope:

- Prefer shared helpers listed under **Shared patterns** — do not copy-paste ID, parse, image pick/persist, API fetch, vision transport, or destructive-confirm logic.
- Prefer editing the smallest feature entry file; extract presentational panels when a touched file would stay **>700 lines**.
- Keep **Feature entry points** as short pointers only. Put encyclopedic domain maps in `.cursor/skills/<domain>/` (travel, todos, workouts, vision-board) — do not grow always-on AGENTS.md with file dumps.
- Update the feature entry table (one-line pointer) when you add a new top-level entry module; update the domain skill/reference for fat domains.
- Follow `.cursor/rules/token-optimization.mdc` on every session.
- Follow `.cursor/rules/responsive-layout.mdc` on every UI change (mandatory for all agents).
- Follow `.cursor/rules/no-personal-identifiers.mdc` always — never hardcode personal emails/names; use `account_flags` / env for privileges and support contact.

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
| `supabase/` | Migrations / RLS — **auto-apply** with `supabase db push` after any change (see `.cursor/rules/auto-apply-migrations.mdc`) |

## Commands

- `npm start` — Metro + Expo dev client on **Node 24** via `scripts/start-metro.sh` (`--lan` bind + advertise `127.0.0.1`; Fast Refresh). Requires Node `<25` (see `.nvmrc`). **Human terminals only** — agents must not run this (Cursor aborts agent shells and kills Metro).
- `npm run packager:ensure` — check Metro, sync local API base URL, boot **iPhone 17 Pro** headless by default (only this device — peers shut down; no Simulator.app window), reconnect the dev client **only if** the app lost the packager (`scripts/ensure-packager.sh`; prefer `127.0.0.1`). Override device with `ONTRACK_IOS_SIMULATOR` / `ONTRACK_IOS_SIMULATOR_UDID`. GUI window: `ONTRACK_IOS_SIMULATOR_WINDOW=1`. Use `--metro-only` to keep Metro without booting a device (sessionStart does this).
- `npm run packager:ensure:start` — same; start Metro if down (detached session that survives agent-shell cleanup), or replace this repo’s IPv6-only Metro (`::1` up / `127.0.0.1` down)
- `npm run start:clear` — Metro with cache clear (only when the bundle is stuck/stale)
- `npm run ios` / `android` / `web` — Metro targeting that platform (no default cache clear)
- `npm run android:ensure` / `android:ensure:window` — boot preferred Android AVD (`Galaxy_S26`, headless by default; window opt-in like iOS). Override with `ONTRACK_ANDROID_AVD` / `ONTRACK_ANDROID_EMULATOR_WINDOW=1`
- `npm run android:ensure:start` / `packager:ensure:android` — Metro + Galaxy_S26 + Android reconnect (`AGENT_UI_PLATFORM=android`)
- `npm run android:run` — ensure Galaxy_S26 (window) + `expo run:android`
- Android agent-ui: export `AGENT_UI_PLATFORM=android` (or use `android:ensure:start` / `npm run android:travel-demo`) so commands pin to the emulator when iOS is also up. Optional `AGENT_UI_DEVICE=<adb-serial>`. Push photos with `npm run android:push-fixture -- path/to.png`. Prefer `verify`/`once` batches over solo ops.
- Dual close-out: `npm run agent-ui:verify-both -- --route <path> [--flow <name>] --exists <id> …` (iOS then Android).
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — Jest (`**/__tests__/**/*.test.ts`)
- `npm run lint` — ESLint

Prefer leaving Metro running so Fast Refresh updates the simulator without app relaunches. Do not kill Metro or pass `--clear` after routine JS/UI edits. Do not start Metro with Homebrew Node 25 ahead of nvm on `PATH`. **Agents:** always use `npm run packager:ensure:start` (never `npm start` in an agent shell). If the simulator shows the launcher / blank / LoadBundleFromServerError, run `npm run packager:ensure` before terminating the app.

## Agent close-out (required)

After **any** app-affecting change: run typecheck/tests for touched domains, keep Metro healthy, and **verify the changed surface on both iOS and Android** (dual-platform close-out — Android users are first-class). Prefer `./scripts/agent-ui-verify-both.sh` / `npm run agent-ui:verify-both`. See `.cursor/rules/verify-working-app.mdc` and `.cursor/rules/show-simulator-screenshot.mdc`.

When exercising UI, follow the **navigation decision tree** in `.cursor/rules/agent-ui-selectors.mdc`: stuck → config triage → app-up gate → **`agent-ui.sh verify`** (skips land when already on `--route`) → else `once` / named `agent-ui-flow.sh` → `agent-ui-open.sh` / batch → tap known ids → dump only if unknown → **assert** / `--color` and **STOP**. Pin Android with `AGENT_UI_PLATFORM=android`; clear sticky pins before iOS. Screenshot only when assert/`--color` cannot prove the claim — never a ritual handoff shot. Run typecheck/tests in parallel with the UI once-chain. **Every interactive control you create or edit must get an `ontrack.*` testID** in the same change.

If the change touches `supabase/migrations/` (or other DB schema), **auto-apply** with `supabase db push` in the same turn — never leave migrations pending. See `.cursor/rules/auto-apply-migrations.mdc` and the parent **Database Updates and Migrations Rule**.

## Non-negotiable UI rules

- **Safe area:** Routes stay inside `AppSafeArea`. Never put `insets.top` in scroll content containers. Native `Modal`s must pad a non-scrolling parent with `insets.top` first.
- **Responsive fit:** Chrome and controls must fit the screen. Use `useResponsive()` / scaled primitives; keep button/tab/field labels on one line with `AppText fit` (shrink, don’t wrap). See `.cursor/rules/responsive-layout.mdc`.
- **Field icons:** Leading icons in form fields must be vertically centered in the field row. Use `FieldLeadingIcon` + `fieldLeadingIconRowStyle` from `@/components/primitives/field-leading-icon` (or Input / DateField / TimeField). Never top-align or `paddingTop`-nudge the icon plate. See `.cursor/rules/field-icon-centering.mdc`.
- **Dates:** Editable calendar dates use design-system `DateField` only. Storage keys are local `YYYY-MM-DD` via `@/utils/date` (`toDateKey`, `todayKey`, `formatDueLabel`, …).
- **Prompts:** App alerts/sheets use `appPrompt` / `AppPromptHost`. Never RN `Alert` or `ActionSheetIOS` for app UI. Cancel/dismiss = top-right X, not a full-width cancel button.
- **No redundant actions:** One local outcome gets one control. If a row, card, image, or editable field already performs an action, do not add a nearby icon/button that performs the same action. See `.cursor/rules/no-redundant-actions.mdc`.

## Feature entry points

Short pointers only. For domain depth, use skills under `.cursor/skills/` (**travel**, **todos**, **workouts**, **vision-board**).

| Change | Start here |
|--------|------------|
| Checklist / todo list UI | `features/todos/todo-list-screen.tsx` → **todos** skill |
| Lists overview / create list | `features/todos/todo-lists-overview.tsx` |
| Grocery meals / combined view | `features/todos/grocery-list-screen.tsx` |
| Recipe import | `features/todos/recipe-import-screen.tsx` |
| Todo store / normalize | `store/todos.ts`, `store/todos-normalize.ts` → **todos** skill |
| Today / day timeline | `features/daily-tracking/day-view.tsx` |
| Activity add/edit | `app/activity-form.tsx` |
| Meal photo / link analysis | `app/detail/food/[id].tsx`, `services/nutrition/` |
| Plants | `app/(tabs)/plants.tsx`, `app/plants/`, `features/plants/` |
| Travel | `app/(tabs)/travel.tsx`, `features/travel/travel-plan-detail.tsx` → **travel** skill |
| Social / friends | `app/(tabs)/social.tsx`, `features/social/`, `services/friends`, `store/friends` |
| Vision board | `features/vision-board/` → **vision-board** skill |
| Workouts | `app/(tabs)/workouts.tsx` → **workouts** skill (+ Muscle Explorer under Shared patterns) |
| Vehicles | `app/(tabs)/vehicles.tsx`, `features/vehicles/`, `store/vehicles.ts`, `services/vehicles/` |
| Health / moods / Apple Health | `app/(tabs)/health.tsx`, `features/health/`, `store/health.ts` → **health** skill |
| Games | `app/(tabs)/games.tsx`, `features/games/` |
| Auth / guest | `features/auth/` |
| Profile avatar | `features/account/profile-avatar.tsx` |
| Dev Mode / developer access | `account_flags` (Supabase) → `services/cloud/account-flags.ts`, `dev-access.ts`, Developer Tools hub |
| Cloud sync | `services/cloud/sync.ts` |
| Design tokens / prompts / DateField | `design-system/`, `components/primitives/` |

## Shared patterns (prefer these)

- **IDs:** `@/utils/id` — `newId(prefix)` for local entities; `newUuid` / `newPrefixedUuid` for synced/collaborative keys. `store/schedule` re-exports `newId` for compatibility.
- **Parse:** `@/utils/parse` — `asString`, `asTrimmedString`, `asNonEmptyString`, `asFiniteNumber`, `formatCompactNumber`, `sanitizeNumericInput` / `numericOnChangeText` for number-only fields (see `.cursor/rules/numeric-input.mdc`; `Input` auto-sanitizes `decimal-pad` / `number-pad` / `numeric`).
- **Persist:** `@/services/storage` — `createPersistStorage` (MMKV on native with AsyncStorage migration/fallback).
- **List equality:** `@/utils/list-equality` — `listReferenceEquality` for Zustand selectors that filter arrays.
- **Idle deferral:** `@/utils/defer-until-idle` for post-paint startup work (migrations, notifications).
- **Muscle Explorer:** finished highlight JPGs in `assets/images/workouts/highlights/` (`FINISHED_ART.txt`). Male/Female toggle + Front/Side/Back views (`AnatomySex`, `BodyView`). Display via `muscle-highlight-plate`; taps via invisible hit boxes. One side plate (body treated as symmetrical).
- **API clients:** `@/services/http/api-url` (`resolveExpoApiUrl`) + `api-client` (`apiRequest`). Domain Error classes stay in each service.
- **Server vision AI:** `@/services/ai/vision-transport` — shared OpenAI Responses + loopback Ollama JSON chat used by `services/nutrition|plants|recipes/server.ts`. Keep domain prompts/schemas in those servers.
- **Images for APIs/docs:** `@/utils/image-persist` (`prepareJpegDataUrl`, `persistJpegToDocuments`). Domain wrappers remain in nutrition/recipes/plants/vision-board media modules.
- **Pick camera/library:** `@/utils/pick-image` — `pickCameraImage`, `pickLibraryImage`, `pickLibraryImages` (multi-select). Use `onDenied` when the screen shows its own error UI.
- **Destructive confirms:** `@/utils/confirm-destructive` (`confirmDestructiveAction`). Activity delete wraps it via `confirmDeleteActivity`.
- **Loading:** `LoadingBlock` in `components/primitives` for centered/inline spinners; prefer `EmptyState` for empty screens.
- **Dropdown menus:** `@/components/primitives` `Dropdown` — overlay Modal menu (never push layout). Use for selects; travel `CurrencyDropdown` / `ScrollableDropdown` wrap it.
- **Settings lists:** `SettingsGroup` + `SettingsRow` / `SettingsToggleRow` / `SettingsActionRow` (`grouped`) for dense iOS-style panels; use `SectionHeader flush` with `Screen contentStyle` gap.
- **Danger zone:** `DangerZone` + `DestructiveSection flush` for GitHub-style red-bordered irreversible actions (Profile reset/delete).
- **Status / meta chrome:** `StatusBadge`, `MetaList`, `ToolbarRow`, `ActionChip` / `ActionChipRow`, `PanelTitle` for diagnostic and card chrome.

- **Responsive sizing:** `@/hooks/use-responsive` (`useResponsive`) + `@/design-system/responsive` (`scaleSize` / `moderateScale`). Prefer `AppText` with `fit` for chrome labels; Button/Input/Screen/DateField already scale.
- **Field leading icons:** `@/components/primitives/field-leading-icon` — `FieldLeadingIcon` + `fieldLeadingIconRowStyle` (`field-leading-icon-style.ts`) so icon plates stay vertically centered in every field (see `.cursor/rules/field-icon-centering.mdc`).
- **Agent UI selectors:** `@/utils/agent-ui` (`AgentUiIds`, `useAgentUiTarget`, `testID` on Button/Input/DateField/…) + `scripts/agent-ui.sh once` / `agent-ui-flow.sh` / `agent-ui-assert.sh` / `agent-ui-seed.sh` / `agent-ui-open.sh` / `agent-ui-batch.sh` / `agent-ui-tap.sh` / `agent-ui-scroll.sh` / `agent-ui-wait.sh` (+ dump only to discover) + `docs/agent-ui-map.md` + `docs/agent-routes.md`. **Off-screen:** `once --scroll <id>` scrolls the in-app `ScrollView` — never host mouse / CGEvent swipes on the Simulator window. **Screenshot → code:** `agent-ui-source.sh` / `agent-ui-hit.sh` / `agent-ui-overlay.sh` + `docs/agent-ui-sources.json` (see `.cursor/rules/screenshot-triage.mdc`). **Always stamp `testID` on interactive controls you add or edit** (and `AgentTestId` anchors on major sections); prefer `once`/flows + assert-first over screenshots/tab-hopping; never screenshot coordinates (see `.cursor/rules/agent-ui-selectors.mdc`).
- **Status-bar wash:** `@/components/primitives` `useSafeAreaChrome(color)` (or `<SafeAreaChrome color={…} />`) so a page header wash continues behind the clock / Dynamic Island. `AppSafeArea` paints the focused route’s chrome color; default is `theme.backgroundPrimary`. Travel uses `travelSafeAreaBackground`; Today uses `timeOfDaySafeAreaBackground`.
- **Typography:** `@/design-system` `typeConfig` + `appTextStyle(variant, { bold? })`. One UI font app-wide; default weight is regular — only pass `bold` / `{ bold: true }` when emphasis is explicit. Prefer `AppText` (optional `bold` prop) over raw `Text` / ad-hoc `fontFamily` / `fontWeight`.
- **Pull-to-refresh:** Scrollable `Screen`s refresh by default via `usePullToRefresh` / `refreshAppData` (cloud pull + shared todos/vehicles + friends). List screens that use `scroll={false}` should attach `refreshControl` from `usePullToRefresh()`. Set `refresh={false}` on dense editors/forms.
- **Server HTTP:** auth/rate-limit/cors/compression live under `src/services/http/`.

## State & sync

- Local-first Zustand stores; guests stay local until Google/Apple SSO.
- Cloud sync is debounced per account/domain (`services/cloud/sync.ts`). `startCloudSync` is a no-op stub for old shells — do not revive polling hooks.
- Secrets stay server-side / EAS env. Never put OpenAI/USDA keys in the client bundle.

## Testing notes

- Prefer focused unit tests next to the module (`__tests__/`).
- Existing rule tests encode safe-area, DateField, appPrompt, keyboard, and auth navigation constraints — keep them green when touching those surfaces.
- Always test after changes: typecheck/tests for touched domains, then verify in the iOS Simulator. Leave the sim on the changed surface; prove with assert/`--color` by default (screenshot only for visual claims — see `.cursor/rules/verify-working-app.mdc` and `.cursor/rules/show-simulator-screenshot.mdc`).

## Pitfalls

- Do not persist image-picker cache URIs; always re-encode into documents via the image helpers.
- Recipe/meal source URLs must be `https:` when normalized for sync.
- Plant/travel entity IDs should use `@/utils/id` (or schedule’s re-export), not ad-hoc generators.
- Platform extension files (`*.ios.tsx`, `*.android.tsx`, `*.web.tsx`) are resolved by Metro — do not delete because imports look unused.
- **Avatar initials:** never use `AppText fit` / shrink-to-fit inside `ProfileAvatar` — use fixed `Text` + `avatarInitialsFontSize()` (see `profile-avatar-initials` tests).
- Travel-specific pitfalls (sheet chrome, stay confirmation addresses, etc.) live in the **travel** skill.
