# Agent UI map

Stable `testID`s for AI agents driving the iOS Simulator. Prefer these over screenshot coordinates.

Convention: `ontrack.<feature>.<surface>.<control>`

## Host commands

```bash
# List currently registered elements (JSON; includes route)
./scripts/agent-ui-dump.sh
./scripts/agent-ui-dump.sh --prefix ontrack.today

# Invoke a control by id (no coordinates)
./scripts/agent-ui-tap.sh ontrack.tabs.travel

# Jump to a surface (prefer over tab-hopping)
./scripts/agent-ui-open.sh travel
./scripts/agent-ui-open.sh reset

# Wait until an id/prefix/route is ready
./scripts/agent-ui-wait.sh --prefix ontrack.checklists.
```

See also [`docs/agent-routes.md`](./agent-routes.md) for aliases and deep links.

Deep links (same ops):

- `ontrack:///agent/ui?op=dump`
- `ontrack:///agent/ui?op=tap&id=<testID>`
- `ontrack:///agent/ui?op=exists&id=<testID>`
- `ontrack:///agent/ui?op=goto&to=calendar`
- `ontrack:///agent/ui?op=reset`

(Use three slashes after `ontrack:` so the path is `/agent/ui`.)

Dump/status files live in the app Documents directory:

- `agent-ui-dump.json` (includes `route`)
- `agent-ui-status.json`

## Tabs

| testID | Label | Notes |
|--------|-------|-------|
| `ontrack.tabs.today` | Today | |
| `ontrack.tabs.calendar` | Calendar | |
| `ontrack.tabs.checklists` | Checklists | route `to-do` |
| `ontrack.tabs.social` | Social | |
| `ontrack.tabs.insights` | Insights | |
| `ontrack.tabs.profile` | Profile | |
| `ontrack.tabs.workouts` | Workout | addon |
| `ontrack.tabs.plants` | Plants | addon |
| `ontrack.tabs.travel` | Travel | addon |
| `ontrack.tabs.visionBoard` | Vision Board | addon |
| `ontrack.tabs.games` | Games | addon |
| `ontrack.tabs.vehicles` | Vehicles | addon |

Deep link example: `ontrack://travel` / Expo route `/(tabs)/travel`

## Today (`/(tabs)/` index)

| testID | Control |
|--------|---------|
| `ontrack.today.prevDay` | Previous day |
| `ontrack.today.nextDay` | Next day |
| `ontrack.today.weather` | Home weather / location |
| `ontrack.today.addActivity` | Add activity |
| `ontrack.today.emptyAddActivity` | Empty-state add |
| `ontrack.today.activity.<id>` | Activity card |
| `ontrack.today.activityToggle.<id>` | Activity complete toggle |
| `ontrack.today.location.close` | Location sheet close |
| `ontrack.today.location.useCurrent` | Use current location |
| `ontrack.today.location.place` | Place search field |
| `ontrack.today.location.save` | Save location |
| `ontrack.today.location.clear` | Clear location |

## Calendar (`/(tabs)/calendar`)

| testID | Control |
|--------|---------|
| `ontrack.calendar.jumpToday` | Jump to today |
| `ontrack.calendar.prevMonth` | Previous month |
| `ontrack.calendar.nextMonth` | Next month |
| `ontrack.calendar.openDay` | Open selected day |
| `ontrack.calendar.day.<YYYY-MM-DD>` | Month grid day cell |

## Checklists (`/(tabs)/to-do`)

| testID | Control |
|--------|---------|
| `ontrack.checklists.editMode` | Edit / Done lists |
| `ontrack.checklists.collaborators` | Collaborators |
| `ontrack.checklists.newListName` | New list name field |
| `ontrack.checklists.createList` | Create list |
| `ontrack.checklists.list.<listId>` | Open list card |
| `ontrack.checklists.detail.back` | Back to lists |
| `ontrack.checklists.detail.newTask` | New task field |
| `ontrack.checklists.detail.addTask` | Add task |
| `ontrack.checklists.detail.sort` | Sort menu |
| `ontrack.checklists.detail.actions` | List actions menu |
| `ontrack.checklists.detail.editMode` | Edit / Done tasks |
| `ontrack.checklists.detail.task.<taskId>` | Task row |

## Profile (`/(tabs)/profile`)

| testID | Control |
|--------|---------|
| `ontrack.profile.avatar` | Customize avatar |
| `ontrack.profile.theme.system` / `.light` / `.dark` | Theme segment |
| `ontrack.profile.homeLocation` | Home location |
| `ontrack.profile.agents` | Manage Agents |
| `ontrack.profile.nutrition` | Nutrition profiles |
| `ontrack.profile.privacy` | Privacy Policy |
| `ontrack.profile.terms` | Terms of Use |
| `ontrack.profile.signOut` | Sign Out of This Device (signed-in) |
| `ontrack.profile.deleteAccount` | Delete Account (signed-in) |
| `ontrack.profile.resetData` | Reset All Data |

## Auth (`/welcome`, `/account`)

| testID | Control |
|--------|---------|
| `ontrack.auth.privacy` | Privacy Policy link |
| `ontrack.auth.terms` | Terms of Use link |
| `ontrack.prompt.close` | Prompt / alert dismiss (X) |

## Travel list (`/(tabs)/travel`)

| testID | Control |
|--------|---------|
| `ontrack.travel.list.itinerary` | Open plan itinerary |
| `ontrack.travel.list.addToCalendar` | Add to Calendar |
| `ontrack.travel.list.searchFlights` | Search Flights |
| `ontrack.travel.list.searchStays` | Search Stays |
| `ontrack.travel.list.tripWeather` | Trip Weather |
| `ontrack.travel.list.expenses` | Open Expenses |

## Travel plan detail

| testID | Control |
|--------|---------|
| `ontrack.travel.planDetail.weather` | Weather |
| `ontrack.travel.planDetail.currency` | Currency |
| `ontrack.travel.planDetail.addToTimeline` | Add to Timeline |
| `ontrack.travel.timelineAdd.dismiss` | Kind picker scrim |
| `ontrack.travel.timelineAdd.close` | Kind picker close |
| `ontrack.travel.timelineAdd.kind.<kind>` | Timeline kind choice |

Deep link: `ontrack://travel/<planId>` → `/travel/[id]`

## Flight search (`/travel/[id]/flights`)

| testID | Control |
|--------|---------|
| `ontrack.travel.flightSearch.back` | Back to trip |
| `ontrack.travel.flightSearch.from` | From |
| `ontrack.travel.flightSearch.to` | To |
| `ontrack.travel.flightSearch.departure` | Departure date |
| `ontrack.travel.flightSearch.return` | Return date |
| `ontrack.travel.flightSearch.travelers` | Travelers |
| `ontrack.travel.flightSearch.currency` | Currency |
| `ontrack.travel.flightSearch.searchLive` | Live Search Flights (when flag on) |
| `ontrack.travel.flightSearch.compareGoogle` | Compare on Google Flights |

## Stay search (`/travel/[id]/stays`)

| testID | Control |
|--------|---------|
| `ontrack.travel.staySearch.back` | Back to trip |
| `ontrack.travel.staySearch.provider.booking` | Booking.com |
| `ontrack.travel.staySearch.provider.airbnb` | Airbnb |
| `ontrack.travel.staySearch.provider.hostelworld` | Hostelworld |

## Modals / sheets

| testID | Control |
|--------|---------|
| `ontrack.travel.addPhotos.dismiss` | Scrim dismiss |
| `ontrack.travel.addPhotos.close` | Close X |
| `ontrack.travel.addPhotos.takePhoto` | Take Photo |
| `ontrack.travel.addPhotos.chooseFromPhotos` | Choose from Photos |
| `ontrack.travel.addPhotos.removePhoto` | Remove Photo (optional) |
| `ontrack.travel.calendarUpdated.dismiss` | Scrim dismiss |
| `ontrack.travel.calendarUpdated.goToCalendar` | Go to Calendar |
| `ontrack.travel.calendarUpdated.backToTravel` | Back to Travel |
| `ontrack.travel.itineraryAdd.close` | Close add-to-timeline sheet |
| `ontrack.travel.expenses.paidBy.<personId>` | Paid By person avatar (`self`, `host`, `member:…`, …) |
| `ontrack.travel.expenses.splitWith.<personId>` | Split With person avatar |
| `ontrack.travel.expenses.addExpense` | Add Expense (list footer) |
| `ontrack.travel.expenses.submitExpense` | Add Expense submit (editor) |
| `ontrack.travel.expenses.saveExpense` | Save Expense submit (editor) |
| `ontrack.travel.expenses.deleteExpense` | Delete expense (legacy editor button) |
| `ontrack.travel.expenses.deleteExpenseFooter` | Delete expense (editor footer) |
| `ontrack.travel.expenses.close` | Close Expenses sheet |
| `ontrack.travel.expenses.row.<expenseId>` | Expense list row (edit) |

## Group chat (`/travel/[id]/chat`)

| testID | Control |
|--------|---------|
| `ontrack.travel.chat.close` | Close Group Chat |
| `ontrack.travel.chat.enableNotifications` | Turn On notifications |
| `ontrack.travel.chat.composer` | Message composer |
| `ontrack.travel.chat.send` | Send message |

Deep link: `ontrack://travel/<planId>/chat` → `/travel/[id]/chat`

## Chrome

| testID | Control |
|--------|---------|
| `ontrack.chrome.back` | `BackButton` default |
| `ontrack.chrome.headerBack` | `HeaderBackButton` default |

## Source of truth

IDs are defined in [`src/utils/agent-ui/ids.ts`](../src/utils/agent-ui/ids.ts). **When creating or editing an interactive control, always add an ID there, stamp `testID` on the control, and update this map in the same change.** An ID should never be “missing” for a tappable control — that is a defect, not a reason to use coordinates.
