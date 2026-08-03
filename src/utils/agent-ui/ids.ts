/** Stable agent-facing testIDs. Convention: ontrack.<feature>.<surface>.<control> */

export const AgentUiIds = {
  tabs: {
    today: 'ontrack.tabs.today',
    calendar: 'ontrack.tabs.calendar',
    checklists: 'ontrack.tabs.checklists',
    social: 'ontrack.tabs.social',
    insights: 'ontrack.tabs.insights',
    profile: 'ontrack.tabs.profile',
    workouts: 'ontrack.tabs.workouts',
    plants: 'ontrack.tabs.plants',
    travel: 'ontrack.tabs.travel',
    visionBoard: 'ontrack.tabs.visionBoard',
    games: 'ontrack.tabs.games',
    vehicles: 'ontrack.tabs.vehicles',
  },
  travel: {
    list: {
      searchFlights: 'ontrack.travel.list.searchFlights',
      searchStays: 'ontrack.travel.list.searchStays',
      itinerary: 'ontrack.travel.list.itinerary',
      addToCalendar: 'ontrack.travel.list.addToCalendar',
      tripWeather: 'ontrack.travel.list.tripWeather',
      expenses: 'ontrack.travel.list.expenses',
      editTrip: 'ontrack.travel.list.editTrip',
    },
    planDetail: {
      weather: 'ontrack.travel.planDetail.weather',
      currency: 'ontrack.travel.planDetail.currency',
    },
    flightSearch: {
      back: 'ontrack.travel.flightSearch.back',
      from: 'ontrack.travel.flightSearch.from',
      to: 'ontrack.travel.flightSearch.to',
      departure: 'ontrack.travel.flightSearch.departure',
      return: 'ontrack.travel.flightSearch.return',
      travelers: 'ontrack.travel.flightSearch.travelers',
      currency: 'ontrack.travel.flightSearch.currency',
      searchLive: 'ontrack.travel.flightSearch.searchLive',
      compareGoogle: 'ontrack.travel.flightSearch.compareGoogle',
    },
    staySearch: {
      back: 'ontrack.travel.staySearch.back',
      provider: (providerId: string) =>
        `ontrack.travel.staySearch.provider.${providerId}`,
    },
    addPhotos: {
      dismiss: 'ontrack.travel.addPhotos.dismiss',
      close: 'ontrack.travel.addPhotos.close',
      takePhoto: 'ontrack.travel.addPhotos.takePhoto',
      chooseFromPhotos: 'ontrack.travel.addPhotos.chooseFromPhotos',
      removePhoto: 'ontrack.travel.addPhotos.removePhoto',
    },
    calendarUpdated: {
      dismiss: 'ontrack.travel.calendarUpdated.dismiss',
      goToCalendar: 'ontrack.travel.calendarUpdated.goToCalendar',
      backToTravel: 'ontrack.travel.calendarUpdated.backToTravel',
    },
    expenses: {
      paidBy: 'ontrack.travel.expenses.paidBy',
      splitWith: 'ontrack.travel.expenses.splitWith',
      addExpense: 'ontrack.travel.expenses.addExpense',
      close: 'ontrack.travel.expenses.close',
      row: (expenseId: string) => `ontrack.travel.expenses.row.${expenseId}`,
    },
    removeConfirm: {
      dismiss: 'ontrack.travel.removeConfirm.dismiss',
      close: 'ontrack.travel.removeConfirm.close',
      cancel: 'ontrack.travel.removeConfirm.cancel',
      confirm: 'ontrack.travel.removeConfirm.confirm',
      /** Triggers that open the shared remove dialog (first visible wins for taps). */
      open: 'ontrack.travel.removeConfirm.open',
    },
    itineraryAdd: {
      close: 'ontrack.travel.itineraryAdd.close',
    },
    chat: {
      close: 'ontrack.travel.chat.close',
      enableNotifications: 'ontrack.travel.chat.enableNotifications',
      composer: 'ontrack.travel.chat.composer',
      send: 'ontrack.travel.chat.send',
    },
  },
  chrome: {
    back: 'ontrack.chrome.back',
    headerBack: 'ontrack.chrome.headerBack',
  },
} as const;

export function tabTestIdForRoute(routeName: string): string | undefined {
  switch (routeName) {
    case 'index':
      return AgentUiIds.tabs.today;
    case 'calendar':
      return AgentUiIds.tabs.calendar;
    case 'to-do':
      return AgentUiIds.tabs.checklists;
    case 'social':
      return AgentUiIds.tabs.social;
    case 'insights':
      return AgentUiIds.tabs.insights;
    case 'profile':
      return AgentUiIds.tabs.profile;
    case 'workouts':
      return AgentUiIds.tabs.workouts;
    case 'plants':
      return AgentUiIds.tabs.plants;
    case 'travel':
      return AgentUiIds.tabs.travel;
    case 'vision-board':
      return AgentUiIds.tabs.visionBoard;
    case 'games':
      return AgentUiIds.tabs.games;
    case 'vehicles':
      return AgentUiIds.tabs.vehicles;
    default:
      return undefined;
  }
}
