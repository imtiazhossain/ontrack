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
    completePlaybook: (id: string) =>
      `ontrack.health.playbookRun.${id}.complete`,
    cancelPlaybook: (id: string) => `ontrack.health.playbookRun.${id}.cancel`,
    call988: 'ontrack.health.support.call988',
    text988: 'ontrack.health.support.text988',
    emotion: (id: string) => `ontrack.health.checkIn.emotion.${id}`,
    intensity: (id: string, value: number) =>
      `ontrack.health.checkIn.intensity.${id}.${value}`,
    factor: (id: string) => `ontrack.health.checkIn.factor.${id}`,
    note: 'ontrack.health.checkIn.note',
    customEmotion: 'ontrack.health.checkIn.customEmotion',
    addCustomEmotion: 'ontrack.health.checkIn.addCustomEmotion',
    stateKind: (kind: string) => `ontrack.health.checkIn.stateKind.${kind}`,
    valence: (value: string) => `ontrack.health.checkIn.valence.${value}`,
    saveCheckIn: 'ontrack.health.checkIn.save',
    factorName: 'ontrack.health.factor.name',
    factorCategory: (category: string) =>
      `ontrack.health.factor.category.${category}`,
    factorEmotion: (id: string) => `ontrack.health.factor.emotion.${id}`,
    saveFactor: 'ontrack.health.factor.save',
    deleteFactor: 'ontrack.health.factor.delete',
    playbookName: 'ontrack.health.playbook.name',
    playbookEmotion: (group: string, id: string) =>
      `ontrack.health.playbook.${group}.${id}`,
    playbookSteps: 'ontrack.health.playbook.steps',
    playbookDuration: 'ontrack.health.playbook.duration',
    savePlaybook: 'ontrack.health.playbook.save',
    deletePlaybook: 'ontrack.health.playbook.delete',
    suggestPlaybook: 'ontrack.health.playbook.suggest',
    useSuggestion: (index: number) =>
      `ontrack.health.playbook.suggestion.${index}.use`,
    settingsConnect: 'ontrack.health.settings.connect',
    openAppleHealthSettings: 'ontrack.health.settings.openAppleHealth',
    stateSync: (value: string) => `ontrack.health.settings.stateSync.${value}`,
    reset: 'ontrack.health.settings.reset',
  },
  vehicles: {
    add: 'ontrack.vehicles.list.add',
    vehicle: (vehicleId: string) =>
      `ontrack.vehicles.list.vehicle.${vehicleId}`,
    settings: 'ontrack.vehicles.detail.settings',
    section: (section: string) => `ontrack.vehicles.detail.section.${section}`,
    saveOdometer: 'ontrack.vehicles.detail.saveOdometer',
    overviewSettingsTip: (vehicleId: string) =>
      `ontrack.vehicles.detail.overviewSettingsTip.${vehicleId}`,
    new: {
      nickname: 'ontrack.vehicles.new.nickname',
      year: 'ontrack.vehicles.new.year',
      make: 'ontrack.vehicles.new.make',
      model: 'ontrack.vehicles.new.model',
      vin: 'ontrack.vehicles.new.vin',
      odometer: 'ontrack.vehicles.new.odometer',
      save: 'ontrack.vehicles.new.save',
      cancel: 'ontrack.vehicles.new.cancel',
    },
    expenses: {
      title: 'ontrack.vehicles.expenses.title',
      amount: 'ontrack.vehicles.expenses.amount',
      date: 'ontrack.vehicles.expenses.date',
      category: (category: string) =>
        `ontrack.vehicles.expenses.category.${category}`,
      notes: 'ontrack.vehicles.expenses.notes',
      add: 'ontrack.vehicles.expenses.add',
      delete: (expenseId: string) =>
        `ontrack.vehicles.expenses.delete.${expenseId}`,
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
  grocery: {
    addRecipe: 'ontrack.grocery.detail.addRecipe',
    settings: 'ontrack.grocery.detail.settings',
    share: 'ontrack.grocery.detail.share',
    copy: 'ontrack.grocery.detail.copy',
    view: (view: string) => `ontrack.grocery.detail.view.${view}`,
    recipe: (recipeId: string) => `ontrack.grocery.detail.recipe.${recipeId}`,
    task: (taskId: string) => `ontrack.grocery.detail.task.${taskId}`,
    combinedItem: (groupId: string) =>
      `ontrack.grocery.detail.combined.${groupId}`,
  },
  recipeImport: {
    cancel: 'ontrack.recipeImport.cancel',
    stop: 'ontrack.recipeImport.stop',
    url: 'ontrack.recipeImport.url',
    analyze: 'ontrack.recipeImport.analyze',
    camera: 'ontrack.recipeImport.camera',
    library: 'ontrack.recipeImport.library',
    mealName: 'ontrack.recipeImport.mealName',
    sourceUrl: 'ontrack.recipeImport.sourceUrl',
    sourceServings: 'ontrack.recipeImport.sourceServings',
    targetServings: 'ontrack.recipeImport.targetServings',
    addIngredient: 'ontrack.recipeImport.ingredient.add',
    ingredientName: (ingredientId: string) =>
      `ontrack.recipeImport.ingredient.${ingredientId}.name`,
    removeIngredient: (ingredientId: string) =>
      `ontrack.recipeImport.ingredient.${ingredientId}.remove`,
    save: 'ontrack.recipeImport.save',
  },
  plants: {
    add: 'ontrack.plants.list.add',
    plant: (plantId: string) => `ontrack.plants.list.plant.${plantId}`,
    detail: {
      edit: 'ontrack.plants.detail.edit',
      amount: 'ontrack.plants.detail.amount',
      logWatering: 'ontrack.plants.detail.logWatering',
      adjustSchedule: 'ontrack.plants.detail.adjustSchedule',
      undoWatering: 'ontrack.plants.detail.undoWatering',
      checkIn: 'ontrack.plants.detail.checkIn',
      delete: 'ontrack.plants.detail.delete',
    },
    new: {
      camera: 'ontrack.plants.new.camera',
      library: 'ontrack.plants.new.library',
      analyze: 'ontrack.plants.new.analyze',
      confirmIdentity: 'ontrack.plants.new.confirmIdentity',
      nickname: 'ontrack.plants.new.nickname',
      buildCarePlan: 'ontrack.plants.new.buildCarePlan',
      save: 'ontrack.plants.new.save',
    },
  },
  peoplePicker: {
    close: 'ontrack.peoplePicker.close',
    search: 'ontrack.peoplePicker.search',
    friend: (friendId: string) => `ontrack.peoplePicker.friend.${friendId}`,
    confirm: 'ontrack.peoplePicker.confirm',
  },
  food: {
    analyze: 'ontrack.food.detail.analyze',
    link: 'ontrack.food.detail.link',
    findMeal: 'ontrack.food.detail.findMeal',
    candidate: (candidateId: string) =>
      `ontrack.food.detail.candidate.${candidateId}`,
    confirmSave: 'ontrack.food.detail.confirmSave',
    analyzeAnother: 'ontrack.food.detail.analyzeAnother',
    edit: 'ontrack.food.detail.edit',
    close: 'ontrack.food.detail.close',
  },
  workouts: {
    customPlanner: 'ontrack.workouts.header.customPlanner',
    planFromScratch: 'ontrack.workouts.today.planFromScratch',
    todayPlan: (activityId: string) =>
      `ontrack.workouts.todayPlan.${activityId}`,
    builderClear: 'ontrack.workouts.builder.clear',
    addToToday: 'ontrack.workouts.builder.addToToday',
    exerciseAdd: (exerciseId: string) =>
      `ontrack.workouts.exercise.${exerciseId}.add`,
    exercisePreview: (exerciseId: string) =>
      `ontrack.workouts.exercise.${exerciseId}.preview`,
    anatomySex: (sex: string) => `ontrack.workouts.explorer.anatomySex.${sex}`,
    bodyView: (view: string) => `ontrack.workouts.explorer.bodyView.${view}`,
    muscleChip: (muscleKey: string) =>
      `ontrack.workouts.explorer.muscle.${muscleKey}`,
    gym: {
      edit: 'ontrack.workouts.gym.edit',
      start: 'ontrack.workouts.gym.start',
      close: 'ontrack.workouts.gym.close',
      completeSet: 'ontrack.workouts.gymActive.completeSet',
      finish: 'ontrack.workouts.gymActive.finish',
    },
  },
  vision: {
    consolidatedCategory: (categoryId: string) =>
      `ontrack.vision.consolidated.category.${categoryId}`,
    categoryMode: 'ontrack.vision.category.mode',
    addImage: 'ontrack.vision.category.addImage',
    addAffirmation: 'ontrack.vision.category.addAffirmation',
    addGoal: 'ontrack.vision.category.addGoal',
    canvasItem: (itemId: string) =>
      `ontrack.vision.category.canvasItem.${itemId}`,
    selectionDeselect: 'ontrack.vision.category.selection.deselect',
    selectionEdit: 'ontrack.vision.category.selection.edit',
    selectionLayerBack: 'ontrack.vision.category.selection.layerBack',
    selectionLayerForward: 'ontrack.vision.category.selection.layerForward',
    selectionDelete: 'ontrack.vision.category.selection.delete',
    itemPrimary: 'ontrack.vision.itemEditor.primary',
    itemSecondary: 'ontrack.vision.itemEditor.secondary',
    itemSave: 'ontrack.vision.itemEditor.save',
    itemClose: 'ontrack.vision.itemEditor.close',
  },
  listSettings: {
    name: 'ontrack.listSettings.name',
    saveName: 'ontrack.listSettings.saveName',
  },
  profile: {
    avatar: 'ontrack.profile.avatar',
    homeLocation: 'ontrack.profile.homeLocation',
    agents: 'ontrack.profile.agents',
    nutrition: 'ontrack.profile.nutrition',
    designSystem: 'ontrack.profile.designSystem',
    apiUsage: 'ontrack.profile.apiUsage',
    developer: 'ontrack.profile.developer',
    usageAnalytics: 'ontrack.profile.usageAnalytics',
    resetData: 'ontrack.profile.resetData',
    signOut: 'ontrack.profile.signOut',
    deleteAccount: 'ontrack.profile.deleteAccount',
    privacy: 'ontrack.profile.privacy',
    terms: 'ontrack.profile.terms',
    tmdb: 'ontrack.profile.tmdb',
    theme: (themeId: string) => `ontrack.profile.theme.${themeId}`,
    addon: (addonId: string) => `ontrack.profile.addon.${addonId}`,
    section: {
      account: 'ontrack.profile.section.account',
      appearance: 'ontrack.profile.section.appearance',
      developer: 'ontrack.profile.section.developer',
      preferences: 'ontrack.profile.section.preferences',
      features: 'ontrack.profile.section.features',
      addons: 'ontrack.profile.section.addons',
      legal: 'ontrack.profile.section.legal',
      dangerZone: 'ontrack.profile.section.dangerZone',
      disclaimers: 'ontrack.profile.section.disclaimers',
    },
  },
  auth: {
    apple: 'ontrack.auth.apple',
    google: 'ontrack.auth.google',
    guest: 'ontrack.auth.guest',
    dismissError: 'ontrack.auth.dismissError',
    privacy: 'ontrack.auth.privacy',
    terms: 'ontrack.auth.terms',
  },
  games: {
    challengeFriend: 'ontrack.games.hub.challengeFriend',
    balloonPopCard: 'ontrack.games.hub.balloonPop',
    balloonPopPlay: 'ontrack.games.balloonPop.play',
    balloonPopRetry: 'ontrack.games.balloonPop.retry',
    balloonPopBack: 'ontrack.games.balloonPop.back',
    balloonPopClose: 'ontrack.games.balloonPop.close',
    balloon: (balloonId: string) =>
      `ontrack.games.balloonPop.balloon.${balloonId}`,
  },
  prompt: {
    close: 'ontrack.prompt.close',
    action: (index: number) => `ontrack.prompt.action.${index}`,
  },
  eventDetail: {
    edit: 'ontrack.eventDetail.edit',
    toggleComplete: 'ontrack.eventDetail.toggleComplete',
    close: 'ontrack.eventDetail.close',
    goBack: 'ontrack.eventDetail.goBack',
  },
  activityForm: {
    choice: (group: string, value: string) =>
      `ontrack.activityForm.choice.${group}.${value}`,
    category: (categoryId: string) =>
      `ontrack.activityForm.category.${categoryId}`,
    guidedTitle: 'ontrack.activityForm.guidedTitle',
    title: 'ontrack.activityForm.title',
    date: 'ontrack.activityForm.date',
    duration: 'ontrack.activityForm.duration',
    startTime: 'ontrack.activityForm.startTime',
    notes: 'ontrack.activityForm.notes',
    pickPhoto: 'ontrack.activityForm.pickPhoto',
    analyzePhoto: 'ontrack.activityForm.analyzePhoto',
    removePhoto: 'ontrack.activityForm.removePhoto',
    save: 'ontrack.activityForm.save',
    cancel: 'ontrack.activityForm.cancel',
    delete: 'ontrack.activityForm.delete',
  },
  apiUsage: {
    screen: 'ontrack.apiUsage.screen',
    back: 'ontrack.apiUsage.back',
    /** Reloads the integrations health snapshot. */
    sync: 'ontrack.apiUsage.sync',
    /** @deprecated Use `sync`. */
    refresh: 'ontrack.apiUsage.sync',
    retry: 'ontrack.apiUsage.retry',
    healthSummary: 'ontrack.apiUsage.healthSummary',
    /** Opens the sort dropdown sheet. */
    sort: 'ontrack.apiUsage.sort',
    sortOption: (mode: string) => `ontrack.apiUsage.sort.${mode}`,
    service: (serviceId: string) => `ontrack.apiUsage.service.${serviceId}`,
  },
  developer: {
    back: 'ontrack.developer.back',
    section: {
      navigate: 'ontrack.developer.section.navigate',
      insights: 'ontrack.developer.section.insights',
      runtime: 'ontrack.developer.section.runtime',
      diagnostics: 'ontrack.developer.section.diagnostics',
      tools: 'ontrack.developer.section.tools',
    },
    insights: 'ontrack.developer.insights',
    insightsLocal: 'ontrack.developer.insights.local',
    insightsProduct: 'ontrack.developer.insights.product',
    insightsRefresh: 'ontrack.developer.insights.refresh',
    devMode: 'ontrack.developer.devMode',
    designSystem: 'ontrack.developer.designSystem',
    apiUsage: 'ontrack.developer.apiUsage',
    env: 'ontrack.developer.env',
    overlay: 'ontrack.developer.overlay',
    sync: 'ontrack.developer.sync',
    seeds: 'ontrack.developer.seeds',
    seed: (name: string) => `ontrack.developer.seed.${name}`,
    routeInput: 'ontrack.developer.routeInput',
    routeGo: 'ontrack.developer.routeGo',
    storage: 'ontrack.developer.storage',
    storageRefresh: 'ontrack.developer.storageRefresh',
    rateLimitReset: 'ontrack.developer.rateLimitReset',
  },
  designSystem: {
    back: 'ontrack.designSystem.back',
    info: 'ontrack.designSystem.info',
    mode: (mode: string) => `ontrack.designSystem.mode.${mode}`,
    catalogView: (view: string) => `ontrack.designSystem.catalogView.${view}`,
    catalogGroup: (group: string) => `ontrack.designSystem.catalogGroup.${group}`,
    catalogFeature: (feature: string) => `ontrack.designSystem.catalogFeature.${feature}`,
    catalogFeatureElement: (feature: string, id: string) =>
      `ontrack.designSystem.catalogFeature.${feature}.element.${id}`,
    catalogElement: (id: string) => `ontrack.designSystem.catalogElement.${id}`,
    demo: (name: string) => `ontrack.designSystem.demo.${name}`,
    primary: 'ontrack.designSystem.primary',
    secondary: 'ontrack.designSystem.secondary',
    ghost: 'ontrack.designSystem.ghost',
    delete: 'ontrack.designSystem.delete',
    input: 'ontrack.designSystem.input',
    sheetClose: 'ontrack.designSystem.sheet.close',
    section: (scope: string) => `ontrack.designSystem.section.${scope}`,
    token: (scope: string, key: string) => `ontrack.designSystem.token.${scope}.${key}`,
    resetToken: (scope: string, key: string) => `ontrack.designSystem.resetToken.${scope}.${key}`,
    preset: (scope: string, key: string, hex: string) =>
      `ontrack.designSystem.preset.${scope}.${key}.${hex.replace('#', '').toLowerCase()}`,
    resetAll: 'ontrack.designSystem.resetAll',
    resetAllFooter: 'ontrack.designSystem.resetAll.footer',
    confirmRestoreDefaults: 'ontrack.designSystem.confirmRestoreDefaults',
    historySection: 'ontrack.designSystem.history',
    historyEntry: (id: string) => `ontrack.designSystem.history.entry.${id}`,
    clearHistory: 'ontrack.designSystem.history.clear',
    swatch: (scope: string, key: string) => `ontrack.designSystem.swatch.${scope}.${key}`,
    iconSection: (section: string) => `ontrack.designSystem.iconSection.${section}`,
    icon: (name: string) => `ontrack.designSystem.icon.${name}`,
    fontRole: (role: string) => `ontrack.designSystem.fontRole.${role}`,
    fontPreset: (role: string, id: string) => `ontrack.designSystem.fontPreset.${role}.${id}`,
    fontScale: 'ontrack.designSystem.fontScale',
    resetFonts: 'ontrack.designSystem.resetFonts',
    confirmRestoreFonts: 'ontrack.designSystem.confirmRestoreFonts',
  },
  travel: {
    chrome: {
      /** Layout anchor — itinerary flight-path flourish behind travel page titles. */
      flightPath: 'ontrack.travel.chrome.flightPath',
    },
    tripMode: (mode: string) => `ontrack.travel.tripMode.${mode}`,
    flight: {
      layoverDuration: 'ontrack.travel.flight.layoverDuration',
      connectionAirport: 'ontrack.travel.flight.connectionAirport',
      departureAirport: 'ontrack.travel.flight.departureAirport',
      arrivalAirport: 'ontrack.travel.flight.arrivalAirport',
      departureTerminal: 'ontrack.travel.flight.departureTerminal',
      arrivalTerminal: 'ontrack.travel.flight.arrivalTerminal',
      departureGate: 'ontrack.travel.flight.departureGate',
      arrivalGate: 'ontrack.travel.flight.arrivalGate',
      status: (itemId: string, legIndex: number) =>
        `ontrack.travel.flight.status.${itemId}.${legIndex}`,
      legStatus: (itemId: string, legIndex: number) =>
        `ontrack.travel.flight.legStatus.${itemId}.${legIndex}`,
      passenger: (itemId: string) =>
        `ontrack.travel.flight.passenger.${itemId}`,
      openConfirmation: (itemId: string) =>
        `ontrack.travel.flight.openConfirmation.${itemId}`,
    },
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
      distanceUnit: (unit: string) =>
        `ontrack.travel.transport.distanceUnit.${unit}`,
      fare: 'ontrack.travel.transport.fare',
      currency: 'ontrack.travel.transport.currency',
      addStop: 'ontrack.travel.transport.addStop',
      stopName: (id: string) => `ontrack.travel.transport.stop.${id}.name`,
      stopAddress: (id: string) =>
        `ontrack.travel.transport.stop.${id}.address`,
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
      importItinerary: 'ontrack.travel.newTrip.importItinerary',
      importScreenshots: 'ontrack.travel.newTrip.importScreenshots',
      importFile: 'ontrack.travel.newTrip.importFile',
      title: 'ontrack.travel.newTrip.title',
      destination: 'ontrack.travel.newTrip.destination',
      origin: 'ontrack.travel.newTrip.origin',
      dates: 'ontrack.travel.newTrip.dates',
      datesClose: 'ontrack.travel.newTrip.datesClose',
      datesSave: 'ontrack.travel.newTrip.datesSave',
      calendar: 'ontrack.travel.newTrip.calendar',
      notes: 'ontrack.travel.newTrip.notes',
      create: 'ontrack.travel.newTrip.create',
    },
    list: {
      cover: (tripId: string) => `ontrack.travel.list.cover.${tripId}`,
      collapse: (tripId: string) => `ontrack.travel.list.collapse.${tripId}`,
      editDates: (tripId: string) => `ontrack.travel.list.editDates.${tripId}`,
      searchFlights: (tripId: string) =>
        `ontrack.travel.list.searchFlights.${tripId}`,
      addTransport: (tripId: string) =>
        `ontrack.travel.list.addTransport.${tripId}`,
      searchStays: (tripId: string) =>
        `ontrack.travel.list.searchStays.${tripId}`,
      itinerary: (tripId: string) => `ontrack.travel.list.itinerary.${tripId}`,
      calendar: (tripId: string) => `ontrack.travel.list.calendar.${tripId}`,
      tripWeather: (tripId: string) =>
        `ontrack.travel.list.tripWeather.${tripId}`,
      currency: (tripId: string) => `ontrack.travel.list.currency.${tripId}`,
      expenses: (tripId: string) => `ontrack.travel.list.expenses.${tripId}`,
      groupChat: (tripId: string) => `ontrack.travel.list.groupChat.${tripId}`,
      coTravelers: (tripId: string) =>
        `ontrack.travel.list.coTravelers.${tripId}`,
      editTrip: (tripId: string) => `ontrack.travel.list.editTrip.${tripId}`,
      notesSection: (tripId: string) =>
        `ontrack.travel.list.notesSection.${tripId}`,
    },
    dates: {
      close: 'ontrack.travel.dates.close',
      start: 'ontrack.travel.dates.start',
      end: 'ontrack.travel.dates.end',
      calendar: 'ontrack.travel.dates.calendar',
      save: 'ontrack.travel.dates.save',
    },
    photoViewer: {
      dismiss: (tripId: string) =>
        `ontrack.travel.photoViewer.dismiss.${tripId}`,
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
      cancel: (itemId: string) =>
        `ontrack.travel.detailsEditor.cancel.${itemId}`,
      remove: (itemId: string) =>
        `ontrack.travel.detailsEditor.remove.${itemId}`,
    },
    friends: {
      close: 'ontrack.travel.friends.close',
      openInvite: 'ontrack.travel.friends.openInvite',
      cancelInvite: 'ontrack.travel.friends.cancelInvite',
      inviteName: 'ontrack.travel.friends.inviteName',
      inviteEmail: 'ontrack.travel.friends.inviteEmail',
      createInvite: 'ontrack.travel.friends.createInvite',
      leaveTrip: 'ontrack.travel.friends.leaveTrip',
      copyJoinLink: 'ontrack.travel.friends.copyJoinLink',
      shareJoinLink: 'ontrack.travel.friends.shareJoinLink',
    },
    currency: {
      close: 'ontrack.travel.currency.close',
      done: 'ontrack.travel.currency.done',
    },
    weather: {
      close: 'ontrack.travel.weather.close',
      done: 'ontrack.travel.weather.done',
    },
    friendRow: {
      action: (target: string, action: string) =>
        `ontrack.travel.friendRow.${target}.${action}`,
    },
    confirmation: {
      open: (kind: string) => `ontrack.travel.confirmation.open.${kind}`,
      close: 'ontrack.travel.confirmation.close',
      importAction: (kind: string) =>
        `ontrack.travel.confirmation.importAction.${kind}`,
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
      /** Unused — weather/currency live on the list card (`list.tripWeather` / `list.currency`). */
      weather: 'ontrack.travel.planDetail.weather',
      /** Unused — prefer `list.currency`. */
      currency: 'ontrack.travel.planDetail.currency',
      addToTimeline: 'ontrack.travel.planDetail.addToTimeline',
      transportSection: 'ontrack.travel.planDetail.section.transport',
      flightsSection: 'ontrack.travel.planDetail.section.flights',
      groundSection: 'ontrack.travel.planDetail.section.ground',
      staysSection: 'ontrack.travel.planDetail.section.stays',
      rentalsSection: 'ontrack.travel.planDetail.section.rentals',
      timelineSection: 'ontrack.travel.planDetail.section.timeline',
      notesSection: 'ontrack.travel.planDetail.section.notes',
      weatherCard: 'ontrack.travel.planDetail.weatherCard',
      addFlight: 'ontrack.travel.planDetail.addFlight',
      addTransport: 'ontrack.travel.planDetail.addTransport',
      addStay: 'ontrack.travel.planDetail.addStay',
      addRental: 'ontrack.travel.planDetail.addRental',
    },
    timelineAdd: {
      dismiss: 'ontrack.travel.timelineAdd.dismiss',
      close: 'ontrack.travel.timelineAdd.close',
      kind: (kind: string) => `ontrack.travel.timelineAdd.kind.${kind}`,
    },
    timelineDay: {
      toggle: (date: string) => `ontrack.travel.timelineDay.${date}`,
    },
    timeline: {
      progress: 'ontrack.travel.timeline.progress',
      progressBadge: 'ontrack.travel.timeline.progressBadge',
      progressMeta: 'ontrack.travel.timeline.progressMeta',
      traveler: 'ontrack.travel.timeline.traveler',
      now: 'ontrack.travel.timeline.now',
    },
    timelineItem: {
      toggle: (itemId: string, phase: string) =>
        `ontrack.travel.timelineItem.${itemId}.${phase}`,
      editFlight: (itemId: string) =>
        `ontrack.travel.timelineItem.${itemId}.editFlight`,
      openAddress: (itemId: string) =>
        `ontrack.travel.timelineItem.${itemId}.openAddress`,
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
      /** Stable wait target when the Expenses list sheet is open. */
      list: 'ontrack.travel.expenses.list',
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
      importScreenshots: 'ontrack.travel.itineraryAdd.importScreenshots',
      importDocument: 'ontrack.travel.itineraryAdd.importDocument',
      tripType: (value: 'one-way' | 'round-trip') =>
        `ontrack.travel.itineraryAdd.tripType.${value}`,
      title: 'ontrack.travel.itineraryAdd.title',
      date: 'ontrack.travel.itineraryAdd.date',
      time: 'ontrack.travel.itineraryAdd.time',
      endDate: 'ontrack.travel.itineraryAdd.endDate',
      endTime: 'ontrack.travel.itineraryAdd.endTime',
      returnTitle: 'ontrack.travel.itineraryAdd.returnTitle',
      returnDate: 'ontrack.travel.itineraryAdd.returnDate',
      returnTime: 'ontrack.travel.itineraryAdd.returnTime',
      returnEndDate: 'ontrack.travel.itineraryAdd.returnEndDate',
      returnEndTime: 'ontrack.travel.itineraryAdd.returnEndTime',
      returnAirline: 'ontrack.travel.itineraryAdd.returnAirline',
      returnFlightNumber: 'ontrack.travel.itineraryAdd.returnFlightNumber',
      returnFrom: 'ontrack.travel.itineraryAdd.returnFrom',
      returnTo: 'ontrack.travel.itineraryAdd.returnTo',
      returnLayoverDuration: 'ontrack.travel.itineraryAdd.returnLayoverDuration',
      returnConnectionAirport:
        'ontrack.travel.itineraryAdd.returnConnectionAirport',
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
    requestAccept: (requestId: string) =>
      `ontrack.social.request.accept.${requestId}`,
    requestDecline: (requestId: string) =>
      `ontrack.social.request.decline.${requestId}`,
    requestCancel: (requestId: string) =>
      `ontrack.social.request.cancel.${requestId}`,
    friendAddToTrip: (friendId: string) =>
      `ontrack.social.friend.addToTrip.${friendId}`,
    friendRemove: (friendId: string) =>
      `ontrack.social.friend.remove.${friendId}`,
  },
  chrome: {
    back: 'ontrack.chrome.back',
    headerBack: 'ontrack.chrome.headerBack',
  },
  agentUi: {
    /** __DEV__ overlay root — present when AgentUiOverlay is mounted. */
    overlayRoot: 'ontrack.agentUi.overlay.root',
    /** Floating per-page overlay toggle (Dev Mode). */
    overlayToggle: 'ontrack.agentUi.overlay.toggle',
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
