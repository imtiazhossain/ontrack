# Agent routes

Stable deep links and aliases for jumping to onTrack surfaces in the iOS Simulator without tab-hopping or screenshot coordinates.

**Prefer these over tapping through the carousel** when you already know the destination.

## Fast path (use this)

```bash
# Fastest when you may already be on the surface (skips flow if route matches)
./scripts/agent-ui.sh verify --route /travel/trip-agent-ui-demo --flow travel-demo \
  --exists travel.planDetail.transportSection \
  --color travel.planDetail.transportSection '#2474A8'

# One-process once chain (flow/open + structural asserts)
./scripts/agent-ui.sh once --flow travel-demo \
  --assert-exists travel.planDetail.weather \
  --assert-route /travel/trip-agent-ui-demo

./scripts/agent-ui.sh once --flow travel-demo-add-flight \
  --assert-prefix travel.itineraryAdd.

# Named flow — seed + navigate + settle in one round trip
./scripts/agent-ui-flow.sh travel-demo
./scripts/agent-ui-flow.sh travel-demo-add-flight
./scripts/agent-ui-flow.sh open-new-trip
./scripts/agent-ui-flow.sh --list

# Structural asserts (Playwright-style — prefer over screenshots for route/id)
# IDs accept wire ontrack.* or AgentUiIds key paths (travel.planDetail.transportSection)
./scripts/agent-ui-assert.sh --exists travel.newTrip.open
./scripts/agent-ui-assert.sh --route /travel/trip-agent-ui-demo
./scripts/agent-ui-assert.sh --prefix travel.planDetail.
./scripts/agent-ui-assert.sh --color travel.planDetail.transportSection '#2474A8'

# Stable demo trip (id trip-agent-ui-demo) without wiping other trips
./scripts/agent-ui-seed.sh travel-demo

# One hop to a surface (in-app goto + wait)
./scripts/agent-ui-open.sh travel
./scripts/agent-ui-open.sh travel/trip-agent-ui-demo/add/flight
./scripts/agent-ui-open.sh health/mood

# Custom multi-step batch (waits settle in-app)
./scripts/agent-ui-batch.sh --seed travel-demo --goto travel/trip-agent-ui-demo --wait-prefix travel.planDetail.

# Cheap probes (no dump file)
./scripts/agent-ui-route.sh
./scripts/agent-ui-exists.sh travel.newTrip.open
```

Do **not** dump before every tap when the id is already in [`agent-ui-map.md`](./agent-ui-map.md). Prefer **assert** / **`--color`** for route/id/label/accent claims; screenshot only for broader visual/layout proof.

**Mandatory decision tree** (also in `.cursor/rules/agent-ui-selectors.mdc`): `verify` (skip land if on route) → `once`/flow → open/batch → known tap (wire id or `AgentUiIds` path) → dump only if unknown → assert/`--color` or one final screenshot. Budget: ≤1 dump; ≤1 screenshot and only for visual claims. Fail-fast when the daemon is warm (~2.5s simple / ~5s flow). Never re-run a flow just to re-check a screen you’re already on; never prophylactic Metro heal.

## Named flows

| Flow | What it does |
|------|----------------|
| `travel-demo` | Seed demo trip → open plan detail |
| `travel-demo-list` | Seed → travel list with demo itinerary button |
| `travel-demo-add-flight` | Seed → add-flight sheet |
| `travel-demo-add-flight-roundtrip` | Seed → Chase round-trip prefills → submit → expand outbound card (passenger ready) |
| `travel-demo-edit-flight` | Seed → open demo flight editor |
| `open-new-trip` | Travel list → New Trip sheet |
| `open-new-checklist` | Checklists → new-list name field ready |
| `travel-list` / `calendar` / `today` / `checklists` / `health` / `health-mood` / `health-settings` / `activity-form` / `profile` / `vehicles` / `vehicles-new` / `social` / `workouts` / `plants` / `plants-new` / `vision-board` / `games` | Goto + settle |

Demo IDs: `trip-agent-ui-demo`, `item-agent-ui-demo-flight`, `item-agent-ui-demo-chase-outbound`, `item-agent-ui-demo-chase-return` (`src/utils/agent-ui/fixtures.ts`).

Chase traveler-count proof (no dump — stable ids after submit):

```bash
./scripts/agent-ui.sh once --flow travel-demo-add-flight-roundtrip \
  --assert-contains ontrack.travel.flight.passenger.item-agent-ui-demo-chase-outbound "2 Travelers"
```

Host bridge notes:

- Persistent daemon: `scripts/lib/agent_ui_daemon.py` (auto-started) — Unix socket + HTTP `:8191` (`0.0.0.0`)
- App long-polls `http://<packager-host>:8191/next` and POSTs `/status` (Simulator → `127.0.0.1:8191`)
- Optional Metro `/__agent_ui` proxy when `enhanceMiddleware` is honored; not required
- Documents file poll remains as fallback if the daemon is down
- `agent_ui_bridge.py` prefers the daemon, caches the data container under `.cursor/agent-ui-data-dir`
- Prefer `agent-ui.sh once` / `flow` / `batch` / `assert` / in-app `wait`; one shell chain per verification; never mid-flow dump/screenshot; never prophylactic Metro heal
- Warm fail-fast budgets: `AGENT_UI_WARM_WAIT_SECS` (default 2.5) / `AGENT_UI_WARM_FLOW_WAIT_SECS` (default 5); in-app wait ceiling `AGENT_UI_WAIT_TIMEOUT_MS` (default 2000)

## Host commands

```bash
./scripts/agent-ui-open.sh today
./scripts/agent-ui-open.sh calendar
./scripts/agent-ui-open.sh checklists
./scripts/agent-ui-open.sh travel
./scripts/agent-ui-open.sh profile
./scripts/agent-ui-open.sh health
./scripts/agent-ui-open.sh design-system
./scripts/agent-ui-open.sh reset

# Nested shortcuts
./scripts/agent-ui-open.sh travel/<planId>
./scripts/agent-ui-open.sh travel/<planId>/flights
./scripts/agent-ui-open.sh travel/<planId>/add/flight
./scripts/agent-ui-open.sh travel/<planId>/add/stay
./scripts/agent-ui-open.sh travel/<planId>/add/timeline
./scripts/agent-ui-open.sh travel/<planId>/import
./scripts/agent-ui-open.sh travel/<planId>/expense
./scripts/agent-ui-open.sh travel/<planId>/stay-booking
./scripts/agent-ui-open.sh health/mood
./scripts/agent-ui-open.sh health/settings
./scripts/agent-ui-open.sh plants/new
./scripts/agent-ui-open.sh vehicles/new
./scripts/agent-ui-open.sh checklists/<listId>

./scripts/agent-ui-goto.sh calendar
./scripts/agent-ui-wait.sh --prefix ontrack.today.
./scripts/agent-ui-wait.sh --route /calendar
./scripts/agent-ui-dump.sh --prefix ontrack.travel   # discover only
```

Packager health (reconnect only when needed):

```bash
npm run packager:ensure
# or
npm run packager:ensure:start
```

## In-app agent ops (dev)

- `op=reset` / `op=goto&to=…` / `op=route` / `op=prefix&prefix=…` / `op=exists&id=…` / `op=tap&id=…` / `op=dump`
- `op=assert` — structural checks (`id` / `missing` / `prefix` / `to` route / `contains` label); prefer over screenshots for these claims
- `op=wait` — settle (`ms`) and/or poll until `id` / `prefix` / route (`to`) within `timeoutMs` (default 2000)
- `op=seed&to=travel-demo` — upsert stable demo trip
- `op=flow&to=travel-demo` — expand named recipe
- `op=batch` with `ops: […]` — run steps in one command

Tap/goto no longer rewrite the dump by default.

## Nested shortcuts

| Shortcut | Resolves to |
|----------|-------------|
| `travel/<id>/add/flight` (also stay, rental, transport, activity, moment, timeline) | `/travel/<id>?add=<kind>` |
| `travel/<id>/import` | `/travel/<id>?previewModal=import` |
| `travel/<id>/expense` | `/travel/<id>?previewModal=expense` (opens Expenses sheet) |
| `travel/<id>/expense-saved` | `/travel/<id>?previewModal=expense-saved` (import success modal QA) |
| `travel/<id>/stay-booking` | `/travel/<id>?openStayBooking=1` |
| `travel/<id>/flights` / `stays` / `chat` | nested routes |
| `health/mood` | `/health/mood-check-in` |
| `health/settings` | `/health/settings` |
| `health/playbook` | `/health/playbook-editor` |
| `plants/new` / `vehicles/new` | create screens |
| `checklists/<id>` | `/to-do/<id>` |
| `checklists/<id>/settings` | `/todos/<id>/settings` |

## Alias → Expo path → deep link

| Alias | Path | Deep link |
|-------|------|-----------|
| `today` / `home` / `reset` | `/` | `ontrack:///` |
| `calendar` | `/calendar` | `ontrack:///calendar` |
| `checklists` / `todos` / `to-do` | `/to-do` | `ontrack:///to-do` |
| `social` | `/social` | `ontrack:///social` |
| `insights` | `/insights` | `ontrack:///insights` |
| `profile` | `/profile` | `ontrack:///profile` |
| `workouts` | `/workouts` | `ontrack:///workouts` |
| `plants` | `/plants` | `ontrack:///plants` |
| `travel` | `/travel` | `ontrack:///travel` |
| `visionBoard` / `vision-board` | `/vision-board` | `ontrack:///vision-board` |
| `games` | `/games` | `ontrack:///games` |
| `vehicles` | `/vehicles` | `ontrack:///vehicles` |
| `health` | `/health` | `ontrack:///health` |
| `agents` | `/agents` | `ontrack:///agents` |
| `designSystem` / `design-system` | `/design-system` | `ontrack:///design-system` |
| `nutrition` | `/nutrition-profile` | `ontrack:///nutrition-profile` |
| `activityForm` / `activity` | `/activity-form` | `ontrack:///activity-form` |
| `privacy` | `/privacy` | `ontrack:///privacy` |
| `terms` | `/terms` | `ontrack:///terms` |

Raw paths also work: `./scripts/agent-ui-open.sh /todos/<listId>/settings`

## Source of truth

Aliases + shortcuts: [`src/utils/agent-ui/route.ts`](../src/utils/agent-ui/route.ts).  
Fixtures + flows: [`fixtures.ts`](../src/utils/agent-ui/fixtures.ts), [`flows.ts`](../src/utils/agent-ui/flows.ts).  
Control IDs: [`docs/agent-ui-map.md`](./agent-ui-map.md) + [`ids.ts`](../src/utils/agent-ui/ids.ts).
