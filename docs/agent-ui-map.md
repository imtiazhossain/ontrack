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
| `ontrack.vehicles.list.add` | Vehicles | Add a vehicle |
| `ontrack.vehicles.list.vehicle.<vehicleId>` | Vehicles | Open a vehicle |
| `ontrack.vehicles.detail.settings` | Vehicle detail | Open vehicle settings |
| `ontrack.vehicles.detail.section.<section>` | Vehicle detail | Switch detail section (`overview`, `maintenance`, `mileage`, `expenses`, `parts`, `docs`, `activity`) |
| `ontrack.vehicles.detail.saveOdometer` | Vehicle detail | Save the current odometer value |
| `ontrack.vehicles.detail.overviewSettingsTip.<vehicleId>` | Vehicle detail | Open settings from the overview tip |
| `ontrack.vehicles.expenses.title` | Vehicle expenses | Expense description field |
| `ontrack.vehicles.expenses.amount` | Vehicle expenses | Expense amount field |
| `ontrack.vehicles.expenses.date` | Vehicle expenses | Expense date field |
| `ontrack.vehicles.expenses.category.<category>` | Vehicle expenses | Select expense category |
| `ontrack.vehicles.expenses.notes` | Vehicle expenses | Optional notes field |
| `ontrack.vehicles.expenses.add` | Vehicle expenses | Add expense |
| `ontrack.vehicles.expenses.delete.<expenseId>` | Vehicle expenses | Delete expense |
| `ontrack.vehicles.expenses.confirmDelete` | Vehicle expenses | Confirm expense deletion prompt |

## Social

| testID | Control |
|--------|---------|
| `ontrack.social.header.addFriend` | Open add-friend flow |
| `ontrack.social.header.messages` | Open Social messages |
| `ontrack.social.friends.close` | Close friend-management modal |
| `ontrack.social.friends.signIn` | Sign in from friend-management modal |
| `ontrack.social.friends.seeAll` | Open complete friends list |
| `ontrack.social.friends.add` | Open add-friend flow from Friends card |
| `ontrack.social.friends.friend.<friendId>` | Open a friend’s Social profile |
| `ontrack.social.quickAction.<actionId>` | Open a Social quick action |
| `ontrack.social.upcoming.seeAll` | Open all trips |
| `ontrack.social.upcoming.empty` | Create the first shared trip |
| `ontrack.social.upcoming.trip.<tripId>` | Open an upcoming shared trip |
| `ontrack.social.feed.filter.<all\|friends\|groups>` | Filter Social activity |
| `ontrack.social.feed.item.<itemId>` | Open a Social feed item |
| `ontrack.social.feed.poll.<itemId>.<choiceId>` | Vote in a Social poll |
| `ontrack.social.feed.loadMore` | Load more local Social activity |
| `ontrack.social.actionModal.close` | Close a Social empty-state flow |
| `ontrack.social.actionModal.primary` | Continue from a Social empty-state flow |
| `ontrack.social.invite.slug` | Invite link name input |
| `ontrack.social.invite.save` | Save invite link name |
| `ontrack.social.invite.copy` | Copy invite link |
| `ontrack.social.invite.share` | Share invite link |
| `ontrack.social.friend.email` | Friend email input |
| `ontrack.social.friend.send` | Send friend request |
| `ontrack.social.request.accept.<requestId>` | Accept incoming request |
| `ontrack.social.request.decline.<requestId>` | Decline incoming request |
| `ontrack.social.request.cancel.<requestId>` | Cancel outgoing request |
| `ontrack.social.friend.addToTrip.<friendId>` | Add a friend to a trip |
| `ontrack.social.friend.remove.<friendId>` | Remove a friend |

## Games

| testID | Control |
|--------|---------|
| `ontrack.games.balloonPop.play` | Start Balloon Pop |
| `ontrack.games.balloonPop.balloon.<id>` | Pop a balloon |

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
| `ontrack.checklists.listName.<listId>` | Editable checklist name |
| `ontrack.checklists.newListKind.<kind>` | Select checklist or grocery-list mode |
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
| `ontrack.auth.apple` | Continue with Apple |
| `ontrack.auth.google` | Continue with Google |
| `ontrack.auth.privacy` | Privacy Policy link |
| `ontrack.auth.terms` | Terms of Use link |
| `ontrack.prompt.close` | Prompt / alert dismiss (X) |
| `ontrack.prompt.action.<index>` | Prompt action by visible position |

## Travel list (`/(tabs)/travel`)

| testID | Control |
|--------|---------|
| `ontrack.travel.list.cover.<tripId>` | Expand a trip cover photo |
| `ontrack.travel.list.itinerary` | Open plan itinerary |
| `ontrack.travel.list.calendar` | Add trip to Calendar, or open Calendar when already added |
| `ontrack.travel.list.searchFlights` | Search Flights |
| `ontrack.travel.list.searchStays` | Search Stays |
| `ontrack.travel.list.tripWeather` | Trip Weather |
| `ontrack.travel.list.currency` | Open Currency Calculator |
| `ontrack.travel.list.expenses` | Open Expenses |
| `ontrack.travel.list.groupChat` | Open Group Chat |
| `ontrack.travel.list.coTravelers` | Open Co-Travelers |
| `ontrack.travel.photoViewer.dismiss.<tripId>` | Dismiss the expanded trip photo |
| `ontrack.travel.photoViewer.close.<tripId>` | Close the expanded trip photo |

### Travel canonical actions

| testID | Control |
|--------|---------|
| `ontrack.travel.newTrip.open` | Open the new-trip form |
| `ontrack.travel.newTrip.cancel` | Close the new-trip form |
| `ontrack.travel.newTrip.title` | New-trip title field |
| `ontrack.travel.newTrip.destination` | New-trip destination field |
| `ontrack.travel.newTrip.startDate` | New-trip departure date |
| `ontrack.travel.newTrip.endDate` | New-trip return date |
| `ontrack.travel.newTrip.notes` | New-trip notes field |
| `ontrack.travel.newTrip.create` | Create the trip |
| `ontrack.travel.editTrip.title` | Edit-trip title field |
| `ontrack.travel.editTrip.cover` | Change the edit-trip cover photo |
| `ontrack.travel.editTrip.destination` | Edit-trip destination field |
| `ontrack.travel.editTrip.startDate` | Edit-trip departure date |
| `ontrack.travel.editTrip.endDate` | Edit-trip return date |
| `ontrack.travel.editTrip.notes` | Edit-trip notes field |
| `ontrack.travel.detailsEditor.save.<itemId>` | Save itinerary details |
| `ontrack.travel.detailsEditor.cancel.<itemId>` | Cancel itinerary detail editing |
| `ontrack.travel.detailsEditor.remove.<itemId>` | Remove an itinerary item |
| `ontrack.travel.addPhotos.confirmRemovePhoto` | Confirm photo removal |
| `ontrack.travel.importResult.close` | Close an import result and return to the itinerary |
| `ontrack.travel.importResult.reviewExpense` | Review the expense related to an import |
| `ontrack.travel.friends.openInvite` | Open the friend invitation form |
| `ontrack.travel.friends.cancelInvite` | Close the friend invitation form |
| `ontrack.travel.friends.inviteName` | Friend invitation name |
| `ontrack.travel.friends.inviteEmail` | Friend invitation account email |
| `ontrack.travel.friends.createInvite` | Create a friend invitation |
| `ontrack.travel.friendRow.<target>.<action>` | Manage, rename, or remove a trip friend |
| `ontrack.travel.confirmation.open.<kind>` | Open uploaded confirmation images |
| `ontrack.travel.confirmation.close` | Close the confirmation viewer |
| `ontrack.travel.notes.open.<itemId>` | Open itinerary notes |
| `ontrack.travel.notes.close` | Close itinerary notes |
| `ontrack.travel.notes.composer` | Add or edit a note |
| `ontrack.travel.notes.submit` | Save or post a note |
| `ontrack.travel.notes.cancelEdit` | Cancel note editing |
| `ontrack.travel.notes.edit.<noteId>` | Edit a note |
| `ontrack.travel.notes.delete.<noteId>` | Request note deletion |
| `ontrack.travel.notes.confirmDelete` | Confirm note deletion |

## Design-system gallery

Deep link example: `ontrack://design-system` / Expo route `/design-system`

| testID | Control |
|--------|---------|
| `ontrack.profile.designSystem` | Open the development gallery from Profile |
| `ontrack.designSystem.info` | Open the canonical sheet example |
| `ontrack.designSystem.mode.<mode>` | Switch gallery section |
| `ontrack.designSystem.primary` | Primary action example |
| `ontrack.designSystem.secondary` | Secondary action example |
| `ontrack.designSystem.ghost` | Ghost action example |
| `ontrack.designSystem.delete` | Destructive action example |
| `ontrack.designSystem.input` | Form field example |
| `ontrack.designSystem.sheet.close` | Close the canonical sheet |

## Activity form

| testID | Control |
|--------|---------|
| `ontrack.activityForm.choice.<group>.<value>` | Select a meal, workout, or priority option |

## Travel plan detail

| testID | Control |
|--------|---------|
| `ontrack.travel.planDetail.weather` | Weather |
| `ontrack.travel.planDetail.currency` | Currency |
| `ontrack.travel.planDetail.addToTimeline` | Add to Timeline |
| `ontrack.travel.planDetail.section.transport` | Expand/collapse transport group |
| `ontrack.travel.planDetail.section.ground` | Expand/collapse ground and transit items |
| `ontrack.travel.timelineAdd.close` | Kind picker close |
| `ontrack.travel.timelineAdd.kind.<kind>` | Timeline kind choice |
| `ontrack.travel.timelineItem.<itemId>.<phase>` | Expand/collapse an itinerary marker or structured card |
| `ontrack.travel.itineraryAdd.title` | Itinerary item name |
| `ontrack.travel.itineraryAdd.date` | Itinerary departure/start date |
| `ontrack.travel.itineraryAdd.time` | Itinerary departure/start time |
| `ontrack.travel.itineraryAdd.submit` | Save the itinerary item |
| `ontrack.travel.tripMode.<mode>` | Choose the trip's primary travel mode |
| `ontrack.travel.newTrip.origin` | Optional new-trip starting point |
| `ontrack.travel.editTrip.origin` | Optional edited-trip starting point |
| `ontrack.travel.list.addTransport` | Add transport from a non-flight trip card |
| `ontrack.travel.transport.mode.<mode>` | Choose driving, rail, transit, rideshare, taxi, ferry, shuttle, or other |
| `ontrack.travel.transport.origin` | Transport origin or pick-up |
| `ontrack.travel.transport.destination` | Transport destination or drop-off |
| `ontrack.travel.transport.arrivalDate` | Transport arrival date |
| `ontrack.travel.transport.arrivalTime` | Transport arrival time |
| `ontrack.travel.transport.addStop` | Add a road-trip route stop |
| `ontrack.travel.transport.stop.<id>.*` | Edit or remove a route stop |
| `ontrack.travel.transport.attachDocument` | Attach a ticket document |
| `ontrack.travel.transport.attachScreenshots` | Attach ticket screenshots |
| `ontrack.travel.transport.<id>.openMaps` | Open a driving route in Maps |
| `ontrack.travel.transport.<id>.edit` | Edit structured transport details |

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
| `ontrack.travel.addPhotos.close` | Close X |
| `ontrack.travel.addPhotos.takePhoto` | Take Photo |
| `ontrack.travel.addPhotos.chooseFromPhotos` | Choose from Photos |
| `ontrack.travel.addPhotos.removePhoto` | Remove Photo (optional) |
| `ontrack.travel.editTrip.save` | Save edited trip details |
| `ontrack.travel.editTrip.cancel` | Cancel editing a trip |
| `ontrack.travel.calendarUpdated.dismiss` | Close X and return to Travel |
| `ontrack.travel.calendarUpdated.goToCalendar` | Go to Calendar |
| `ontrack.travel.itineraryAdd.close` | Close add-to-timeline sheet |
| `ontrack.travel.expenses.paidBy.<personId>` | Paid By person avatar (`self`, `host`, `member:…`, …) |
| `ontrack.travel.expenses.splitWith.<personId>` | Split With person avatar |
| `ontrack.travel.expenses.addExpense` | Add Expense (list footer) |
| `ontrack.travel.expenses.submitExpense` | Add Expense submit (editor) |
| `ontrack.travel.expenses.saveExpense` | Save Expense submit (editor) |
| `ontrack.travel.expenses.deleteExpense` | Delete expense (legacy editor button) |
| `ontrack.travel.expenses.deleteExpenseFooter` | Delete expense (editor footer) |
| `ontrack.travel.expenses.confirmDelete` | Confirm expense deletion prompt |
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
