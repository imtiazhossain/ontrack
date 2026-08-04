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
  vehicles: {
    add: 'ontrack.vehicles.list.add',
    vehicle: (vehicleId: string) => `ontrack.vehicles.list.vehicle.${vehicleId}`,
    settings: 'ontrack.vehicles.detail.settings',
    section: (section: string) => `ontrack.vehicles.detail.section.${section}`,
    saveOdometer: 'ontrack.vehicles.detail.saveOdometer',
    overviewSettingsTip: (vehicleId: string) =>
      `ontrack.vehicles.detail.overviewSettingsTip.${vehicleId}`,
    expenses: {
      title: 'ontrack.vehicles.expenses.title',
      amount: 'ontrack.vehicles.expenses.amount',
      date: 'ontrack.vehicles.expenses.date',
      category: (category: string) => `ontrack.vehicles.expenses.category.${category}`,
      notes: 'ontrack.vehicles.expenses.notes',
      add: 'ontrack.vehicles.expenses.add',
      delete: (expenseId: string) => `ontrack.vehicles.expenses.delete.${expenseId}`,
      confirmDelete: 'ontrack.vehicles.expenses.confirmDelete',
    },
  },
  today: {
    prevDay: 'ontrack.today.prevDay',
    nextDay: 'ontrack.today.nextDay',
    weather: 'ontrack.today.weather',
    addActivity: 'ontrack.today.addActivity',
    emptyAddActivity: 'ontrack.today.emptyAddActivity',
    activity: (activityId: string) => `ontrack.today.activity.${activityId}`,
    activityToggle: (activityId: string) =>
      `ontrack.today.activityToggle.${activityId}`,
    location: {
      close: 'ontrack.today.location.close',
      useCurrent: 'ontrack.today.location.useCurrent',
      place: 'ontrack.today.location.place',
      save: 'ontrack.today.location.save',
      clear: 'ontrack.today.location.clear',
    },
  },
  calendar: {
    jumpToday: 'ontrack.calendar.jumpToday',
    prevMonth: 'ontrack.calendar.prevMonth',
    nextMonth: 'ontrack.calendar.nextMonth',
    openDay: 'ontrack.calendar.openDay',
    day: (dateKey: string) => `ontrack.calendar.day.${dateKey}`,
  },
  checklists: {
    editMode: 'ontrack.checklists.editMode',
    collaborators: 'ontrack.checklists.collaborators',
    newListName: 'ontrack.checklists.newListName',
    createList: 'ontrack.checklists.createList',
    list: (listId: string) => `ontrack.checklists.list.${listId}`,
    detail: {
      back: 'ontrack.checklists.detail.back',
      newTask: 'ontrack.checklists.detail.newTask',
      addTask: 'ontrack.checklists.detail.addTask',
      sort: 'ontrack.checklists.detail.sort',
      actions: 'ontrack.checklists.detail.actions',
      editMode: 'ontrack.checklists.detail.editMode',
      task: (taskId: string) => `ontrack.checklists.detail.task.${taskId}`,
    },
  },
  profile: {
    avatar: 'ontrack.profile.avatar',
    homeLocation: 'ontrack.profile.homeLocation',
    agents: 'ontrack.profile.agents',
    nutrition: 'ontrack.profile.nutrition',
    resetData: 'ontrack.profile.resetData',
    signOut: 'ontrack.profile.signOut',
    deleteAccount: 'ontrack.profile.deleteAccount',
    privacy: 'ontrack.profile.privacy',
    terms: 'ontrack.profile.terms',
    theme: (themeId: string) => `ontrack.profile.theme.${themeId}`,
  },
  auth: {
    apple: 'ontrack.auth.apple',
    google: 'ontrack.auth.google',
    privacy: 'ontrack.auth.privacy',
    terms: 'ontrack.auth.terms',
  },
  games: {
    balloonPopPlay: 'ontrack.games.balloonPop.play',
    balloon: (balloonId: string) => `ontrack.games.balloonPop.balloon.${balloonId}`,
  },
  prompt: {
    close: 'ontrack.prompt.close',
    action: (index: number) => `ontrack.prompt.action.${index}`,
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
    editTrip: {
      save: 'ontrack.travel.editTrip.save',
      cancel: 'ontrack.travel.editTrip.cancel',
    },
    planDetail: {
      weather: 'ontrack.travel.planDetail.weather',
      currency: 'ontrack.travel.planDetail.currency',
      addToTimeline: 'ontrack.travel.planDetail.addToTimeline',
      weatherCard: 'ontrack.travel.planDetail.weatherCard',
    },
    timelineAdd: {
      dismiss: 'ontrack.travel.timelineAdd.dismiss',
      close: 'ontrack.travel.timelineAdd.close',
      kind: (kind: string) => `ontrack.travel.timelineAdd.kind.${kind}`,
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
      submitExpense: 'ontrack.travel.expenses.submitExpense',
      saveExpense: 'ontrack.travel.expenses.saveExpense',
      deleteExpense: 'ontrack.travel.expenses.deleteExpense',
      deleteExpenseFooter: 'ontrack.travel.expenses.deleteExpenseFooter',
      confirmDelete: 'ontrack.travel.expenses.confirmDelete',
      close: 'ontrack.travel.expenses.close',
      row: (expenseId: string) => `ontrack.travel.expenses.row.${expenseId}`,
    },
    removeConfirm: {
      dismiss: 'ontrack.travel.removeConfirm.dismiss',
      close: 'ontrack.travel.removeConfirm.close',
      cancel: 'ontrack.travel.removeConfirm.cancel',
      confirm: 'ontrack.travel.removeConfirm.confirm',
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
  social: {
    header: {
      addFriend: 'ontrack.social.header.addFriend',
      messages: 'ontrack.social.header.messages',
    },
    friends: {
      close: 'ontrack.social.friends.close',
      signIn: 'ontrack.social.friends.signIn',
      seeAll: 'ontrack.social.friends.seeAll',
      add: 'ontrack.social.friends.add',
      friend: (friendId: string) => `ontrack.social.friends.friend.${friendId}`,
    },
    quickAction: (actionId: string) => `ontrack.social.quickAction.${actionId}`,
    upcoming: {
      seeAll: 'ontrack.social.upcoming.seeAll',
      empty: 'ontrack.social.upcoming.empty',
      trip: (tripId: string) => `ontrack.social.upcoming.trip.${tripId}`,
    },
    feedFilter: (filter: string) => `ontrack.social.feed.filter.${filter}`,
    feedItem: (itemId: string) => `ontrack.social.feed.item.${itemId}`,
    feedPollChoice: (itemId: string, choiceId: string) =>
      `ontrack.social.feed.poll.${itemId}.${choiceId}`,
    feedLoadMore: 'ontrack.social.feed.loadMore',
    actionModal: {
      close: 'ontrack.social.actionModal.close',
      primary: 'ontrack.social.actionModal.primary',
    },
    inviteSlug: 'ontrack.social.invite.slug',
    inviteSave: 'ontrack.social.invite.save',
    inviteCopy: 'ontrack.social.invite.copy',
    inviteShare: 'ontrack.social.invite.share',
    friendEmail: 'ontrack.social.friend.email',
    friendSend: 'ontrack.social.friend.send',
    requestAccept: (requestId: string) => `ontrack.social.request.accept.${requestId}`,
    requestDecline: (requestId: string) => `ontrack.social.request.decline.${requestId}`,
    requestCancel: (requestId: string) => `ontrack.social.request.cancel.${requestId}`,
    friendAddToTrip: (friendId: string) =>
      `ontrack.social.friend.addToTrip.${friendId}`,
    friendRemove: (friendId: string) => `ontrack.social.friend.remove.${friendId}`,
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
