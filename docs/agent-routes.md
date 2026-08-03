# Agent routes

Stable deep links and aliases for jumping to onTrack surfaces in the iOS Simulator without tab-hopping or screenshot coordinates.

Prefer these over tapping through the carousel when you already know the destination.

## Host commands

```bash
# Named surface (waits for a sensible ID prefix when known)
./scripts/agent-ui-open.sh today
./scripts/agent-ui-open.sh calendar
./scripts/agent-ui-open.sh checklists
./scripts/agent-ui-open.sh travel
./scripts/agent-ui-open.sh profile

# Reset to Today (known-good state)
./scripts/agent-ui-open.sh reset

# Nested path
./scripts/agent-ui-open.sh travel/<planId>
./scripts/agent-ui-open.sh travel/<planId>/flights

# Wait helpers
./scripts/agent-ui-wait.sh --prefix ontrack.today.
./scripts/agent-ui-wait.sh --route /calendar
./scripts/agent-ui-wait.sh ontrack.checklists.detail.back

# Filtered dump (includes dump.route)
./scripts/agent-ui-dump.sh --prefix ontrack.travel
```

Packager health (reconnect only when needed):

```bash
npm run packager:ensure
# or
./scripts/ensure-packager.sh --start
```

## In-app agent ops (dev)

Same destinations without leaving the JS runtime:

- `ontrack:///agent/ui?op=reset`
- `ontrack:///agent/ui?op=goto&to=calendar`
- `ontrack:///agent/ui?op=goto&to=travel/<planId>`

Dump JSON includes `"route": "<pathname>"` so hosts know where they landed.

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
| `agents` | `/agents` | `ontrack:///agents` |
| `nutrition` | `/nutrition-profile` | `ontrack:///nutrition-profile` |
| `activityForm` | `/activity-form` | `ontrack:///activity-form` |
| `privacy` | `/privacy` | `ontrack:///privacy` |
| `terms` | `/terms` | `ontrack:///terms` |

Raw paths also work: `./scripts/agent-ui-open.sh /todos/<listId>/settings`

## Source of truth

Aliases live in [`src/utils/agent-ui/route.ts`](../src/utils/agent-ui/route.ts). Interactive control IDs remain in [`docs/agent-ui-map.md`](./agent-ui-map.md) + [`src/utils/agent-ui/ids.ts`](../src/utils/agent-ui/ids.ts).
