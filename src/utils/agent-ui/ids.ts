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
    health: 'ontrack.tabs.health',
  },
  health: {
    settings: 'ontrack.health.settings',
    section: (section: string) => `ontrack.health.section.${section}`,
    connect: 'ontrack.health.body.connect',
    refresh: 'ontrack.health.body.refresh',
    openAppleHealth: 'ontrack.health.body.openAppleHealth',
    sleepHandoff: 'ontrack.health.body.sleepHandoff',
    range: (days: number) => `ontrack.health.body.range.${days}`,
    checkIn: 'ontrack.health.mind.checkIn',
    addFactor: 'ontrack.health.mind.addFactor',
    moodEntry: (id: string) => `ontrack.health.mind.entry.${id}`,
    editFactor: (id: string) => `ontrack.health.mind.factor.${id}.edit`,
    addPlaybook: 'ontrack.health.mind.addPlaybook',
    editPlaybook: (id: string) => `ontrack.health.playbook.${id}.edit`,
    startPlaybook: (id: string) => `ontrack.health.playbook.${id}.start`,
    completePlaybook: (id: string) => `ontrack.health.playbookRun.${id}.complete`,
    cancelPlaybook: (id: string) => `ontrack.health.playbookRun.${id}.cancel`,
    call988: 'ontrack.health.support.call988',
    text988: 'ontrack.health.support.text988',
    emotion: (id: string) => `ontrack.health.checkIn.emotion.${id}`,
    intensity: (id: string, value: number) => `ontrack.health.checkIn.intensity.${id}.${value}`,
    factor: (id: string) => `ontrack.health.checkIn.factor.${id}`,
    note: 'ontrack.health.checkIn.note',
    customEmotion: 'ontrack.health.checkIn.customEmotion',
    addCustomEmotion: 'ontrack.health.checkIn.addCustomEmotion',
    stateKind: (kind: string) => `ontrack.health.checkIn.stateKind.${kind}`,
    valence: (value: string) => `ontrack.health.checkIn.valence.${value}`,
    saveCheckIn: 'ontrack.health.checkIn.save',
    factorName: 'ontrack.health.factor.name',
    factorCategory: (category: string) => `ontrack.health.factor.category.${category}`,
    factorEmotion: (id: string) => `ontrack.health.factor.emotion.${id}`,
    saveFactor: 'ontrack.health.factor.save',
    deleteFactor: 'ontrack.health.factor.delete',
    playbookName: 'ontrack.health.playbook.name',
    playbookEmotion: (group: string, id: string) => `ontrack.health.playbook.${group}.${id}`,
    playbookSteps: 'ontrack.health.playbook.steps',
    playbookDuration: 'ontrack.health.playbook.duration',
    savePlaybook: 'ontrack.health.playbook.save',
    deletePlaybook: 'ontrack.health.playbook.delete',
    suggestPlaybook: 'ontrack.health.playbook.suggest',
    useSuggestion: (index: number) => `ontrack.health.playbook.suggestion.${index}.use`,
    settingsConnect: 'ontrack.health.settings.connect',
    openAppleHealthSettings: 'ontrack.health.settings.openAppleHealth',
    stateSync: (value: string) => `ontrack.health.settings.stateSync.${value}`,
    reset: 'ontrack.health.settings.reset',
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
    newListKind: (kind: string) => `ontrack.checklists.newListKind.${kind}`,
    list: (listId: string) => `ontrack.checklists.list.${listId}`,
    listName: (listId: string) => `ontrack.checklists.listName.${listId}`,
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
    designSystem: 'ontrack.profile.designSystem',
    resetData: 'ontrack.profile.resetData',
    signOut: 'ontrack.profile.signOut',
    deleteAccount: 'ontrack.profile.deleteAccount',
    privacy: 'ontrack.profile.privacy',
    terms: 'ontrack.profile.terms',
    theme: (themeId: string) => `ontrack.profile.theme.${themeId}`,
    addon: (addonId: string) => `ontrack.profile.addon.${addonId}`,
  },
  auth: {
    apple: 'ontrack.auth.apple',
    google: 'ontrack.auth.google',
    guest: 'ontrack.auth.guest',
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
  activityForm: {
    choice: (group: string, value: string) => `ontrack.activityForm.choice.${group}.${value}`,
  },
  designSystem: {
    info: 'ontrack.designSystem.info',
    mode: (mode: string) => `ontrack.designSystem.mode.${mode}`,
    primary: 'ontrack.designSystem.primary',
    secondary: 'ontrack.designSystem.secondary',
    ghost: 'ontrack.designSystem.ghost',
    delete: 'ontrack.designSystem.delete',
    input: 'ontrack.designSystem.input',
    sheetClose: 'ontrack.designSystem.sheet.close',
  },
  travel: {
    tripMode: (mode: string) => `ontrack.travel.tripMode.${mode}`,
    transport: {
      mode: (mode: string) => `ontrack.travel.transport.mode.${mode}`,
      origin: 'ontrack.travel.transport.origin',
      destination: 'ontrack.travel.transport.destination',
      arrivalDate: 'ontrack.travel.transport.arrivalDate',
      arrivalTime: 'ontrack.travel.transport.arrivalTime',
      operator: 'ontrack.travel.transport.operator',
      serviceNumber: 'ontrack.travel.transport.serviceNumber',
      platform: 'ontrack.travel.transport.platform',
      seat: 'ontrack.travel.transport.seat',
      vehicle: 'ontrack.travel.transport.vehicle',
      confirmationCode: 'ontrack.travel.transport.confirmationCode',
      attachDocument: 'ontrack.travel.transport.attachDocument',
      attachScreenshots: 'ontrack.travel.transport.attachScreenshots',
      distance: 'ontrack.travel.transport.distance',
      distanceUnit: (unit: string) => `ontrack.travel.transport.distanceUnit.${unit}`,
      fare: 'ontrack.travel.transport.fare',
      currency: 'ontrack.travel.transport.currency',
      addStop: 'ontrack.travel.transport.addStop',
      stopName: (id: string) => `ontrack.travel.transport.stop.${id}.name`,
      stopAddress: (id: string) => `ontrack.travel.transport.stop.${id}.address`,
      stopDate: (id: string) => `ontrack.travel.transport.stop.${id}.date`,
      stopTime: (id: string) => `ontrack.travel.transport.stop.${id}.time`,
      stopNotes: (id: string) => `ontrack.travel.transport.stop.${id}.notes`,
      removeStop: (id: string) => `ontrack.travel.transport.stop.${id}.remove`,
      openMaps: (id: string) => `ontrack.travel.transport.${id}.openMaps`,
      edit: (id: string) => `ontrack.travel.transport.${id}.edit`,
      editDepartureDate: 'ontrack.travel.transport.edit.departureDate',
      editDepartureTime: 'ontrack.travel.transport.edit.departureTime',
      editArrivalDate: 'ontrack.travel.transport.edit.arrivalDate',
      editArrivalTime: 'ontrack.travel.transport.edit.arrivalTime',
      removeKeepExpense: 'ontrack.travel.transport.remove.keepExpense',
      removeWithExpense: 'ontrack.travel.transport.remove.withExpense',
    },
    newTrip: {
      open: 'ontrack.travel.newTrip.open',
      cancel: 'ontrack.travel.newTrip.cancel',
      title: 'ontrack.travel.newTrip.title',
      destination: 'ontrack.travel.newTrip.destination',
      origin: 'ontrack.travel.newTrip.origin',
      startDate: 'ontrack.travel.newTrip.startDate',
      endDate: 'ontrack.travel.newTrip.endDate',
      notes: 'ontrack.travel.newTrip.notes',
      create: 'ontrack.travel.newTrip.create',
    },
    list: {
      cover: (tripId: string) => `ontrack.travel.list.cover.${tripId}`,
      editDates: (tripId: string) => `ontrack.travel.list.editDates.${tripId}`,
      searchFlights: (tripId: string) => `ontrack.travel.list.searchFlights.${tripId}`,
      addTransport: (tripId: string) => `ontrack.travel.list.addTransport.${tripId}`,
      searchStays: (tripId: string) => `ontrack.travel.list.searchStays.${tripId}`,
      itinerary: (tripId: string) => `ontrack.travel.list.itinerary.${tripId}`,
      calendar: (tripId: string) => `ontrack.travel.list.calendar.${tripId}`,
      tripWeather: (tripId: string) => `ontrack.travel.list.tripWeather.${tripId}`,
      currency: (tripId: string) => `ontrack.travel.list.currency.${tripId}`,
      expenses: (tripId: string) => `ontrack.travel.list.expenses.${tripId}`,
      groupChat: (tripId: string) => `ontrack.travel.list.groupChat.${tripId}`,
      coTravelers: (tripId: string) => `ontrack.travel.list.coTravelers.${tripId}`,
      editTrip: (tripId: string) => `ontrack.travel.list.editTrip.${tripId}`,
    },
    dates: {
      close: 'ontrack.travel.dates.close',
      start: 'ontrack.travel.dates.start',
      end: 'ontrack.travel.dates.end',
      calendar: 'ontrack.travel.dates.calendar',
      save: 'ontrack.travel.dates.save',
    },
    photoViewer: {
      dismiss: (tripId: string) => `ontrack.travel.photoViewer.dismiss.${tripId}`,
      close: (tripId: string) => `ontrack.travel.photoViewer.close.${tripId}`,
    },
    editTrip: {
      save: 'ontrack.travel.editTrip.save',
      cancel: 'ontrack.travel.editTrip.cancel',
      cover: 'ontrack.travel.editTrip.cover',
      title: 'ontrack.travel.editTrip.title',
      destination: 'ontrack.travel.editTrip.destination',
      origin: 'ontrack.travel.editTrip.origin',
      startDate: 'ontrack.travel.editTrip.startDate',
      endDate: 'ontrack.travel.editTrip.endDate',
      notes: 'ontrack.travel.editTrip.notes',
    },
    detailsEditor: {
      save: (itemId: string) => `ontrack.travel.detailsEditor.save.${itemId}`,
      cancel: (itemId: string) => `ontrack.travel.detailsEditor.cancel.${itemId}`,
      remove: (itemId: string) => `ontrack.travel.detailsEditor.remove.${itemId}`,
    },
    friends: {
      openInvite: 'ontrack.travel.friends.openInvite',
      cancelInvite: 'ontrack.travel.friends.cancelInvite',
      inviteName: 'ontrack.travel.friends.inviteName',
      inviteEmail: 'ontrack.travel.friends.inviteEmail',
      createInvite: 'ontrack.travel.friends.createInvite',
    },
    friendRow: {
      action: (target: string, action: string) =>
        `ontrack.travel.friendRow.${target}.${action}`,
    },
    confirmation: {
      open: (kind: string) => `ontrack.travel.confirmation.open.${kind}`,
      close: 'ontrack.travel.confirmation.close',
    },
    notes: {
      open: (itemId: string) => `ontrack.travel.notes.open.${itemId}`,
      close: 'ontrack.travel.notes.close',
      composer: 'ontrack.travel.notes.composer',
      submit: 'ontrack.travel.notes.submit',
      cancelEdit: 'ontrack.travel.notes.cancelEdit',
      edit: (noteId: string) => `ontrack.travel.notes.edit.${noteId}`,
      delete: (noteId: string) => `ontrack.travel.notes.delete.${noteId}`,
      confirmDelete: 'ontrack.travel.notes.confirmDelete',
    },
    planDetail: {
      weather: 'ontrack.travel.planDetail.weather',
      currency: 'ontrack.travel.planDetail.currency',
      addToTimeline: 'ontrack.travel.planDetail.addToTimeline',
      transportSection: 'ontrack.travel.planDetail.section.transport',
      flightsSection: 'ontrack.travel.planDetail.section.flights',
      groundSection: 'ontrack.travel.planDetail.section.ground',
      staysSection: 'ontrack.travel.planDetail.section.stays',
      rentalsSection: 'ontrack.travel.planDetail.section.rentals',
      weatherCard: 'ontrack.travel.planDetail.weatherCard',
    },
    timelineAdd: {
      dismiss: 'ontrack.travel.timelineAdd.dismiss',
      close: 'ontrack.travel.timelineAdd.close',
      kind: (kind: string) => `ontrack.travel.timelineAdd.kind.${kind}`,
    },
    timelineItem: {
      toggle: (itemId: string, phase: string) =>
        `ontrack.travel.timelineItem.${itemId}.${phase}`,
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
      confirmRemovePhoto: 'ontrack.travel.addPhotos.confirmRemovePhoto',
    },
    calendarUpdated: {
      dismiss: 'ontrack.travel.calendarUpdated.dismiss',
      goToCalendar: 'ontrack.travel.calendarUpdated.goToCalendar',
      backToTravel: 'ontrack.travel.calendarUpdated.backToTravel',
    },
    importResult: {
      close: 'ontrack.travel.importResult.close',
      reviewExpense: 'ontrack.travel.importResult.reviewExpense',
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
      title: 'ontrack.travel.itineraryAdd.title',
      date: 'ontrack.travel.itineraryAdd.date',
      time: 'ontrack.travel.itineraryAdd.time',
      endDate: 'ontrack.travel.itineraryAdd.endDate',
      endTime: 'ontrack.travel.itineraryAdd.endTime',
      details: 'ontrack.travel.itineraryAdd.details',
      bookingUrl: 'ontrack.travel.itineraryAdd.bookingUrl',
      submit: 'ontrack.travel.itineraryAdd.submit',
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
    case 'health':
      return AgentUiIds.tabs.health;
    default:
      return undefined;
  }
}
