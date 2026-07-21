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

  // Navigation and actions
  'chevron-left': { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  'chevron-right': { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  'chevron-down': { ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  add: { ios: 'plus', android: 'add', web: 'add' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  delete: { ios: 'trash', android: 'delete', web: 'delete' },
  camera: { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' },
  'calendar-add': { ios: 'calendar.badge.plus', android: 'calendar_add_on', web: 'calendar_add_on' },
  health: { ios: 'heart.text.square.fill', android: 'monitor_heart', web: 'monitor_heart' },
  'nutrition-profiles': { ios: 'heart.text.clipboard', android: 'clinical_notes', web: 'clinical_notes' },

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
