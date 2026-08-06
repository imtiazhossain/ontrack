/**
 * Canonical design-element catalog + feature usage map.
 * Usage is maintained from app/feature imports (see design-system-gallery).
 */

export type DesignCatalogGroup =
  | 'Layout'
  | 'Actions'
  | 'Forms'
  | 'Feedback'
  | 'Content'
  | 'Shared';

export type DesignFeatureId =
  | 'account'
  | 'auth'
  | 'daily-tracking'
  | 'calendar'
  | 'games'
  | 'health'
  | 'nutrition'
  | 'plants'
  | 'social'
  | 'todos'
  | 'travel'
  | 'vehicles'
  | 'vision-board'
  | 'workouts'
  | 'agents';

export type DesignCatalogElement = {
  id: string;
  name: string;
  group: DesignCatalogGroup;
  description: string;
  /** Gallery tab that demos this element. */
  demo: 'components' | 'forms' | 'colors' | 'fonts' | 'icons';
  /** Feature areas that import/use this element. Empty = gallery / infra only. */
  usedBy: readonly DesignFeatureId[];
};

export const DESIGN_FEATURE_LABELS: Record<DesignFeatureId, string> = {
  account: 'Account',
  auth: 'Auth',
  'daily-tracking': 'Today',
  calendar: 'Calendar',
  games: 'Games',
  health: 'Health',
  nutrition: 'Nutrition',
  plants: 'Plants',
  social: 'Social',
  todos: 'Todos',
  travel: 'Travel',
  vehicles: 'Vehicles',
  'vision-board': 'Vision Board',
  workouts: 'Workouts',
  agents: 'Agents',
};

export const DESIGN_CATALOG_GROUPS: readonly DesignCatalogGroup[] = [
  'Layout',
  'Actions',
  'Forms',
  'Feedback',
  'Content',
  'Shared',
] as const;

export const DESIGN_CATALOG: readonly DesignCatalogElement[] = [
  // Layout
  {
    id: 'screen',
    name: 'Screen',
    group: 'Layout',
    description: 'Route page shell with safe scroll and pull-to-refresh.',
    demo: 'components',
    usedBy: [
      'account',
      'agents',
      'auth',
      'calendar',
      'daily-tracking',
      'games',
      'health',
      'nutrition',
      'plants',
      'social',
      'todos',
      'travel',
      'vehicles',
      'vision-board',
      'workouts',
    ],
  },
  {
    id: 'screenHeader',
    name: 'ScreenHeader',
    group: 'Layout',
    description: 'Eyebrow, title, subtitle, leading/trailing chrome.',
    demo: 'components',
    usedBy: ['account', 'travel'],
  },
  {
    id: 'sectionHeader',
    name: 'SectionHeader',
    group: 'Layout',
    description: 'Section title with optional trailing action.',
    demo: 'components',
    usedBy: [
      'account',
      'agents',
      'daily-tracking',
      'games',
      'health',
      'nutrition',
      'plants',
      'todos',
      'travel',
      'vehicles',
      'workouts',
    ],
  },
  {
    id: 'card',
    name: 'Card',
    group: 'Layout',
    description: 'Raised or sunken surface for grouped content.',
    demo: 'components',
    usedBy: [
      'account',
      'agents',
      'daily-tracking',
      'games',
      'health',
      'plants',
      'todos',
      'travel',
      'vehicles',
      'workouts',
    ],
  },
  {
    id: 'formSection',
    name: 'FormSection',
    group: 'Layout',
    description: 'Grouped fields with title, description, and error.',
    demo: 'forms',
    usedBy: ['account'],
  },
  {
    id: 'collapsibleSection',
    name: 'CollapsibleSection',
    group: 'Layout',
    description: 'Expandable overline group with optional action.',
    demo: 'components',
    usedBy: ['account'],
  },
  {
    id: 'sheetScaffold',
    name: 'SheetScaffold',
    group: 'Layout',
    description: 'Modal sheet frame; dismiss with top-right X only.',
    demo: 'components',
    usedBy: ['travel'],
  },
  {
    id: 'panelTitle',
    name: 'PanelTitle',
    group: 'Layout',
    description: 'In-card title (auto title case).',
    demo: 'components',
    usedBy: ['account'],
  },
  // Actions
  {
    id: 'button',
    name: 'Button',
    group: 'Actions',
    description: 'primary · secondary · ghost · danger (+ loading/disabled).',
    demo: 'components',
    usedBy: [
      'account',
      'agents',
      'auth',
      'calendar',
      'daily-tracking',
      'games',
      'health',
      'nutrition',
      'plants',
      'social',
      'todos',
      'travel',
      'vehicles',
      'vision-board',
      'workouts',
    ],
  },
  {
    id: 'iconButton',
    name: 'IconButton',
    group: 'Actions',
    description: 'Icon-only control (≥44pt) with label + testID.',
    demo: 'components',
    usedBy: [
      'account',
      'calendar',
      'daily-tracking',
      'health',
      'social',
      'todos',
      'travel',
      'vehicles',
      'vision-board',
    ],
  },
  {
    id: 'headerBack',
    name: 'HeaderBackButton',
    group: 'Actions',
    description: 'Compact back on the ScreenHeader eyebrow row.',
    demo: 'components',
    usedBy: ['account', 'travel'],
  },
  {
    id: 'destructive',
    name: 'DestructiveSection',
    group: 'Actions',
    description: 'Separated delete/remove block + confirmDestructiveAction.',
    demo: 'components',
    usedBy: ['travel'],
  },
  {
    id: 'dangerZone',
    name: 'DangerZone',
    group: 'Actions',
    description: 'GitHub-style red-bordered panel for irreversible actions.',
    demo: 'components',
    usedBy: ['account'],
  },
  {
    id: 'actionChip',
    name: 'ActionChip / ActionChipRow',
    group: 'Actions',
    description: 'Compact secondary action chips in a wrap row.',
    demo: 'components',
    usedBy: ['account'],
  },
  {
    id: 'toolbarRow',
    name: 'ToolbarRow',
    group: 'Actions',
    description: 'Primary control + trailing action band (sort/filter).',
    demo: 'components',
    usedBy: [],
  },
  // Forms
  {
    id: 'input',
    name: 'Input',
    group: 'Forms',
    description: 'Labeled text field with stacked title case.',
    demo: 'forms',
    usedBy: [
      'account',
      'daily-tracking',
      'health',
      'nutrition',
      'plants',
      'social',
      'todos',
      'travel',
      'vehicles',
      'vision-board',
    ],
  },
  {
    id: 'dateField',
    name: 'DateField',
    group: 'Forms',
    description: 'Calendar date field; stores local YYYY-MM-DD.',
    demo: 'forms',
    usedBy: ['daily-tracking', 'nutrition', 'plants', 'travel', 'vehicles'],
  },
  {
    id: 'timeField',
    name: 'TimeField',
    group: 'Forms',
    description: 'Platform time picker field.',
    demo: 'forms',
    usedBy: ['daily-tracking', 'plants', 'travel'],
  },
  {
    id: 'segmented',
    name: 'SegmentedControl',
    group: 'Forms',
    description: 'Compact exclusive choices.',
    demo: 'forms',
    usedBy: ['account', 'daily-tracking', 'health', 'todos', 'travel'],
  },
  {
    id: 'dropdown',
    name: 'Dropdown',
    group: 'Forms',
    description: 'Overlay select — never pushes layout.',
    demo: 'forms',
    usedBy: ['account', 'travel', 'workouts'],
  },
  {
    id: 'settingsRow',
    name: 'SettingsRow family',
    group: 'Forms',
    description: 'SettingsRow · SettingsToggleRow · SettingsActionRow.',
    demo: 'forms',
    usedBy: ['account', 'agents'],
  },
  {
    id: 'fieldLeading',
    name: 'FieldLeadingIcon',
    group: 'Forms',
    description: 'Vertically centered leading glyph plate for fields.',
    demo: 'forms',
    usedBy: ['travel'],
  },
  // Feedback
  {
    id: 'empty',
    name: 'EmptyState',
    group: 'Feedback',
    description: 'Empty screen with icon, copy, and optional CTA.',
    demo: 'components',
    usedBy: [
      'agents',
      'daily-tracking',
      'health',
      'plants',
      'social',
      'travel',
      'vehicles',
      'vision-board',
    ],
  },
  {
    id: 'error',
    name: 'ErrorMessage',
    group: 'Feedback',
    description: 'Inline semantic danger treatment.',
    demo: 'components',
    usedBy: [
      'account',
      'auth',
      'daily-tracking',
      'health',
      'nutrition',
      'plants',
      'social',
      'todos',
      'travel',
      'vehicles',
      'vision-board',
    ],
  },
  {
    id: 'loading',
    name: 'LoadingBlock',
    group: 'Feedback',
    description: 'Centered or inline spinner block.',
    demo: 'components',
    usedBy: ['account', 'auth', 'daily-tracking', 'social', 'travel', 'workouts'],
  },
  {
    id: 'statusBadge',
    name: 'StatusBadge',
    group: 'Feedback',
    description: 'success · warning · danger · neutral pill.',
    demo: 'components',
    usedBy: ['account'],
  },
  {
    id: 'progress',
    name: 'ProgressRing',
    group: 'Feedback',
    description: 'Circular progress metric.',
    demo: 'components',
    usedBy: ['daily-tracking', 'todos', 'vision-board'],
  },
  {
    id: 'metaList',
    name: 'MetaList',
    group: 'Feedback',
    description: 'Diagnostic label / value rows.',
    demo: 'components',
    usedBy: ['account'],
  },
  {
    id: 'appPrompt',
    name: 'appPrompt',
    group: 'Feedback',
    description: 'Shared alerts and action sheets (never RN Alert).',
    demo: 'components',
    usedBy: [
      'account',
      'auth',
      'daily-tracking',
      'games',
      'health',
      'plants',
      'social',
      'todos',
      'travel',
      'vehicles',
      'vision-board',
      'workouts',
    ],
  },
  // Content
  {
    id: 'appText',
    name: 'AppText',
    group: 'Content',
    description: 'Typed text; chrome uses fit for one-line labels.',
    demo: 'fonts',
    usedBy: [
      'account',
      'agents',
      'auth',
      'calendar',
      'daily-tracking',
      'games',
      'health',
      'nutrition',
      'plants',
      'social',
      'todos',
      'travel',
      'vehicles',
      'vision-board',
      'workouts',
    ],
  },
  {
    id: 'symbol',
    name: 'Symbol',
    group: 'Content',
    description: 'Semantic appIcons glyph via Symbol.',
    demo: 'icons',
    usedBy: [
      'agents',
      'daily-tracking',
      'games',
      'social',
      'todos',
      'travel',
      'vehicles',
      'vision-board',
      'workouts',
    ],
  },
  {
    id: 'dragHandle',
    name: 'DragHandle',
    group: 'Content',
    description: 'Reorder affordance for list rows.',
    demo: 'components',
    usedBy: ['todos'],
  },
  // Shared (not primitives barrel, but reused across features)
  {
    id: 'chipRow',
    name: 'ChipRow',
    group: 'Shared',
    description: 'Selectable chip strip (forms / onboarding).',
    demo: 'components',
    usedBy: ['plants', 'vehicles'],
  },
  {
    id: 'categoryBadge',
    name: 'CategoryBadge',
    group: 'Shared',
    description: 'Category icon + label chip for schedule items.',
    demo: 'components',
    usedBy: ['daily-tracking'],
  },
  {
    id: 'metricDisplay',
    name: 'MetricDisplay',
    group: 'Shared',
    description: 'Large metric + caption pair.',
    demo: 'components',
    usedBy: ['daily-tracking', 'health', 'nutrition'],
  },
  {
    id: 'activityCard',
    name: 'ActivityCard',
    group: 'Shared',
    description: 'Day-timeline activity row card.',
    demo: 'components',
    usedBy: ['daily-tracking'],
  },
] as const;

export function catalogByGroup(): Record<DesignCatalogGroup, DesignCatalogElement[]> {
  const out = Object.fromEntries(
    DESIGN_CATALOG_GROUPS.map((g) => [g, [] as DesignCatalogElement[]]),
  ) as Record<DesignCatalogGroup, DesignCatalogElement[]>;
  for (const el of DESIGN_CATALOG) out[el.group].push(el);
  return out;
}

export function catalogByFeature(): Record<DesignFeatureId, DesignCatalogElement[]> {
  const out = Object.fromEntries(
    (Object.keys(DESIGN_FEATURE_LABELS) as DesignFeatureId[]).map((f) => [
      f,
      [] as DesignCatalogElement[],
    ]),
  ) as Record<DesignFeatureId, DesignCatalogElement[]>;
  for (const el of DESIGN_CATALOG) {
    for (const f of el.usedBy) out[f].push(el);
  }
  return out;
}
