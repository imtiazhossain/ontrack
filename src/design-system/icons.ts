import type { SymbolViewProps } from 'expo-symbols';

/** `{ ios, android, web }` symbol-name object accepted by `expo-symbols`. */
export type PlatformIconNames = Extract<SymbolViewProps['name'], { ios?: unknown }>;

/**
 * Application-owned semantic icon names mapped to platform symbol names.
 * iOS uses SF Symbols; Android and web use Material Symbols.
 *
 * Screens and stored data should reference these semantic keys instead of
 * raw platform symbol strings.
 */
export const appIcons = {
  // Categories
  food: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  gym: { ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' },
  work: { ios: 'laptopcomputer', android: 'computer', web: 'computer' },
  movie: { ios: 'film.fill', android: 'movie', web: 'movie' },
  sleep: { ios: 'moon.zzz.fill', android: 'bedtime', web: 'bedtime' },
  water: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  personal: { ios: 'person.fill', android: 'person', web: 'person' },
  mindfulness: { ios: 'leaf.fill', android: 'self_improvement', web: 'self_improvement' },
  learning: { ios: 'book.fill', android: 'menu_book', web: 'menu_book' },
  appointment: { ios: 'calendar.badge.clock', android: 'calendar_clock', web: 'calendar_clock' },
  habit: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  plant: { ios: 'leaf.fill', android: 'potted_plant', web: 'potted_plant' },
  insights: { ios: 'chart.line.uptrend.xyaxis', android: 'monitoring', web: 'monitoring' },
  'vision-board': { ios: 'square.grid.2x2.fill', android: 'dashboard', web: 'dashboard' },
  tasks: { ios: 'checklist', android: 'checklist', web: 'checklist' },
  groceries: { ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' },
  maintenance: {
    ios: 'wrench.and.screwdriver.fill',
    android: 'handyman',
    web: 'handyman',
  },

  // Travel
  flight: { ios: 'airplane', android: 'flight', web: 'flight' },
  lodging: { ios: 'bed.double.fill', android: 'hotel', web: 'hotel' },
  building: { ios: 'building.2.fill', android: 'apartment', web: 'apartment' },
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  weather: { ios: 'cloud.sun.fill', android: 'partly_cloudy_day', web: 'partly_cloudy_day' },
  people: { ios: 'person.2.fill', android: 'group', web: 'group' },
  invite: { ios: 'person.badge.plus', android: 'person_add', web: 'person_add' },
  agents: { ios: 'person.2.badge.gearshape', android: 'manage_accounts', web: 'manage_accounts' },
  'scan-document': { ios: 'doc.text.viewfinder', android: 'document_scanner', web: 'document_scanner' },

  // Navigation and actions
  today: { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' },
  profile: { ios: 'person.fill', android: 'person', web: 'person' },
  list: { ios: 'list.bullet', android: 'list', web: 'list' },
  filter: {
    ios: 'line.3.horizontal.decrease',
    android: 'filter_alt',
    web: 'filter_alt',
  },
  sort: { ios: 'arrow.up.arrow.down', android: 'sort', web: 'sort' },
  more: { ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' },
  gallery: { ios: 'rectangle.grid.2x2.fill', android: 'grid_view', web: 'grid_view' },
  undo: { ios: 'arrow.uturn.backward', android: 'undo', web: 'undo' },
  redo: { ios: 'arrow.uturn.forward', android: 'redo', web: 'redo' },
  'layer-forward': { ios: 'rectangle.stack.fill', android: 'flip_to_front', web: 'flip_to_front' },
  'layer-back': { ios: 'rectangle.stack', android: 'flip_to_back', web: 'flip_to_back' },
  background: { ios: 'paintpalette.fill', android: 'palette', web: 'palette' },
  copy: { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },
  smart: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  'arrow-down': { ios: 'arrow.down', android: 'arrow_downward', web: 'arrow_downward' },
  alphabetical: { ios: 'textformat', android: 'sort_by_alpha', web: 'sort_by_alpha' },
  photo: { ios: 'photo', android: 'image', web: 'image' },
  location: { ios: 'location.fill', android: 'my_location', web: 'my_location' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  'open-external': { ios: 'arrow.up.forward.app', android: 'open_in_new', web: 'open_in_new' },
  chat: { ios: 'message.fill', android: 'chat', web: 'chat' },
  send: { ios: 'paperplane.fill', android: 'send', web: 'send' },
  currency: { ios: 'dollarsign.circle', android: 'attach_money', web: 'attach_money' },
  clock: { ios: 'clock', android: 'schedule', web: 'schedule' },
  download: { ios: 'square.and.arrow.down', android: 'download', web: 'download' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  important: { ios: 'star', android: 'star', web: 'star' },
  'important-filled': { ios: 'star.fill', android: 'star', web: 'star' },
  'minus-circle': { ios: 'minus.circle.fill', android: 'do_not_disturb_on', web: 'remove_circle' },
  'plus-circle': { ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  'chevron-left': { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  'chevron-right': { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  'chevron-down': { ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' },
  'chevron-up': { ios: 'chevron.up', android: 'keyboard_arrow_up', web: 'keyboard_arrow_up' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  add: { ios: 'plus', android: 'add', web: 'add' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  delete: { ios: 'trash', android: 'delete', web: 'delete' },
  camera: { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  'calendar-add': { ios: 'calendar.badge.plus', android: 'calendar_add_on', web: 'calendar_add_on' },
  health: { ios: 'heart.text.square.fill', android: 'monitor_heart', web: 'monitor_heart' },
  favorite: { ios: 'heart', android: 'favorite_border', web: 'favorite_border' },
  'nutrition-profiles': { ios: 'heart.text.clipboard', android: 'clinical_notes', web: 'clinical_notes' },
  play: { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' },
  pause: { ios: 'pause.fill', android: 'pause', web: 'pause' },
  tip: { ios: 'lightbulb.max.fill', android: 'lightbulb', web: 'lightbulb' },
  target: { ios: 'scope', android: 'center_focus_strong', web: 'center_focus_strong' },
  layers: { ios: 'square.stack.3d.up', android: 'layers', web: 'layers' },
  repeat: { ios: 'repeat', android: 'repeat', web: 'repeat' },
  timer: { ios: 'timer', android: 'timer', web: 'timer' },
  'arrow-up': { ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' },

  // Activity status
  'status-completed': { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  'status-skipped': { ios: 'arrow.uturn.left.circle', android: 'undo', web: 'undo' },
  'status-upcoming': { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' },

  // Exercises
  'exercise-strength': { ios: 'figure.strengthtraining.traditional', android: 'exercise', web: 'exercise' },
  'exercise-functional': { ios: 'figure.strengthtraining.functional', android: 'sports_gymnastics', web: 'sports_gymnastics' },
  'exercise-row': { ios: 'figure.rower', android: 'rowing', web: 'rowing' },
  'exercise-press': { ios: 'figure.arms.open', android: 'accessibility_new', web: 'accessibility_new' },
  'exercise-pulldown': { ios: 'figure.play', android: 'sports_martial_arts', web: 'sports_martial_arts' },
  'exercise-walk': { ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' },
  'exercise-stand': { ios: 'figure.stand', android: 'man', web: 'man' },
  'exercise-core': { ios: 'figure.core.training', android: 'sports_gymnastics', web: 'sports_gymnastics' },
} as const satisfies Record<string, PlatformIconNames>;

export type AppIconName = keyof typeof appIcons;

/** Records persisted before the semantic refactor stored raw SF Symbol names. */
const legacyIosLookup = new Map<string, PlatformIconNames>(
  Object.values(appIcons).map((mapping) => [mapping.ios, mapping]),
);

const FALLBACK_ICON: PlatformIconNames = appIcons.personal;

/**
 * Resolves a semantic icon name (or a legacy persisted SF Symbol name) to
 * the platform-name object required for cross-platform rendering.
 */
export function resolveAppIcon(name: AppIconName | (string & {})): PlatformIconNames {
  if (name in appIcons) return appIcons[name as AppIconName];
  return legacyIosLookup.get(name) ?? FALLBACK_ICON;
}
