# Agent routes

Stable deep links and aliases for jumping to onTrack surfaces in the iOS Simulator without tab-hopping or screenshot coordinates.

**Prefer these over tapping through the carousel** when you already know the destination.

## Fast path (use this)

```bash
# Named flow — seed + navigate + settle in one round trip
./scripts/agent-ui-flow.sh travel-demo
./scripts/agent-ui-flow.sh travel-demo-add-flight
./scripts/agent-ui-flow.sh open-new-trip
./scripts/agent-ui-flow.sh --list

# Stable demo trip (id trip-agent-ui-demo) without wiping other trips
./scripts/agent-ui-seed.sh travel-demo

# One hop to a surface (in-app goto + wait)
./scripts/agent-ui-open.sh travel
./scripts/agent-ui-open.sh travel/trip-agent-ui-demo/add/flight
./scripts/agent-ui-open.sh health/mood

# Custom multi-step batch (waits settle in-app)
./scripts/agent-ui-batch.sh --seed travel-demo --goto travel/trip-agent-ui-demo --wait-prefix ontrack.travel.planDetail.

# Cheap probes (no dump file)
./scripts/agent-ui-route.sh
./scripts/agent-ui-exists.sh ontrack.travel.newTrip.open
```

Do **not** dump before every tap when the id is already in [`agent-ui-map.md`](./agent-ui-map.md). Screenshot only for final proof.

**Mandatory decision tree** (also in `.cursor/rules/agent-ui-selectors.mdc`): flow → open/batch → known tap → dump only if unknown → one final screenshot. Budget: ≤1 dump and ≤1 screenshot per verification unless the first attempt fails.

## Named flows

| Flow | What it does |
|------|----------------|
| `travel-demo` | Seed demo trip → open plan detail |
| `travel-demo-list` | Seed → travel list with demo itinerary button |
| `travel-demo-add-flight` | Seed → add-flight sheet |
| `travel-demo-add-flight-roundtrip` | Seed → add-flight sheet prefilled from Chase round-trip fixture (`?importFlight=roundtrip`) |
| `travel-demo-edit-flight` | Seed → open demo flight editor |
| `open-new-trip` | Travel list → New Trip sheet |
| `travel-list` / `calendar` / `today` / `checklists` / `health` / `health-mood` / `activity-form` | Goto + settle |

Demo IDs: `trip-agent-ui-demo`, `item-agent-ui-demo-flight` (`src/utils/agent-ui/fixtures.ts`).

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
- `op=wait` — settle (`ms`) and/or poll until `id` / `prefix` / route (`to`) within `timeoutMs`
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
