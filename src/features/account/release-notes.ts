import Constants from 'expo-constants';

import { isDateKey } from '@/utils/date';

/**
 * Versioned ship notes. `npm run ship:push` patch-bumps `expo.version` and
 * prepends matching RELEASE_NOTES (user-facing) + CHANGELOG (technical) entries.
 * Newest first. Prefer editing via the push message; manual prepends are fine too.
 * Catalog `date` stays YYYY-MM-DD; UI shows MM/DD/YYYY via formatVersionNotesDate.
 */

export type VersionNotesEntry = {
  version: string;
  /** YYYY-MM-DD (display as MM/DD/YYYY). */
  date: string;
  notes: string[];
};

/** User-facing; plain language — what’s new for people using the app. */
export const RELEASE_NOTES: VersionNotesEntry[] = [
  {
    version: '1.0.4',
    date: '2026-08-07',
    notes: [
      'Polish travel home Your Trips band (search chrome, frost scoop, curated atmosphere) and developer release notes hub.',
    ],
  },
  {
    version: '1.0.3',
    date: '2026-08-07',
    notes: [
      'Polish travel home trip cards and landmark covers; add static destination sky and developer release notes.',
    ],
  },
  {
    version: '1.0.2',
    date: '2026-08-07',
    notes: [
      'Travel Home trip cards show clearer dates, location, and itinerary actions.',
      'Itinerary sky and destination covers feel more polished across devices.',
      'Profile now shows the app version at the bottom for support.',
    ],
  },
  {
    version: '1.0.1',
    date: '2026-07-15',
    notes: [
      'Stability and polish across Travel, checklists, and account screens.',
      'Faster refresh when switching between tabs on day-to-day devices.',
    ],
  },
];

/** Technical; modules, migrations, OTA/runtime, agent-ui, known constraints. */
export const CHANGELOG: VersionNotesEntry[] = [
  {
    version: '1.0.4',
    date: '2026-08-07',
    notes: [
      'Polish travel home Your Trips band (search chrome, frost scoop, curated atmosphere) and developer release notes hub.',
      'Touched: app routes, features/account.',
    ],
  },
  {
    version: '1.0.3',
    date: '2026-08-07',
    notes: [
      'Polish travel home trip cards and landmark covers; add static destination sky and developer release notes.',
      'Touched: design, app routes, features/account.',
    ],
  },
  {
    version: '1.0.2',
    date: '2026-08-07',
    notes: [
      'Travel sky quality tiers (full→static) + destination-cover landmark queries.',
      'Travel Home trip card frost scoop, date row, and agent-ui list asserts.',
      'Developer Tools: Release Notes / Changelog catalogs keyed to expo.version.',
      'Runtime version via expo-constants (nativeAppVersion ?? expoConfig.version).',
    ],
  },
  {
    version: '1.0.1',
    date: '2026-07-15',
    notes: [
      'EAS OTA on device channel; runtimeVersion policy remains appVersion.',
      'Agent-ui verify-both headless pool + Dev Mode release on close-out.',
    ],
  },
];

function safeLabel(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

/**
 * Marketing version from the running JS config (OTA-aware), falling back to the
 * native binary version when config is unavailable.
 */
export function getAppVersion(): string {
  return (
    safeLabel(Constants.expoConfig?.version) ??
    safeLabel(Constants.nativeAppVersion) ??
    '—'
  );
}

/** Native build number / versionCode when available. */
export function getAppBuild(): string | undefined {
  return (
    safeLabel(Constants.nativeBuildVersion) ??
    safeLabel(Constants.expoConfig?.ios?.buildNumber) ??
    safeLabel(Constants.expoConfig?.android?.versionCode)
  );
}

/** Profile footer label, e.g. `Version 1.0.2` or `Version 1.0.2 (42)`. */
export function formatAppVersionLabel(
  version: string = getAppVersion(),
  build: string | undefined = getAppBuild(),
): string {
  if (!version || version === '—') return 'Version —';
  return build ? `Version ${version} (${build})` : `Version ${version}`;
}

/** App Updates header, e.g. `Current Version: 1.0.2` or `Current Version: 1.0.2 (42)`. */
export function formatCurrentAppVersionLabel(
  version: string = getAppVersion(),
  build: string | undefined = getAppBuild(),
): string {
  if (!version || version === '—') return 'Current Version: —';
  return build
    ? `Current Version: ${version} (${build})`
    : `Current Version: ${version}`;
}

export function getReleaseNotes(): VersionNotesEntry[] {
  return RELEASE_NOTES;
}

export function getChangelog(): VersionNotesEntry[] {
  return CHANGELOG;
}

/** True when the newest catalog entry doesn’t match the running app version. */
export function catalogTopVersionDiffers(
  catalog: readonly VersionNotesEntry[],
  runtimeVersion: string = getAppVersion(),
): boolean {
  const top = catalog[0]?.version;
  if (!top || !runtimeVersion || runtimeVersion === '—') return false;
  return top !== runtimeVersion;
}

/** Display catalog dates as MM/DD/YYYY (catalog stores YYYY-MM-DD). */
export function formatVersionNotesDate(dateKey: string): string {
  if (!isDateKey(dateKey)) return dateKey;
  const [year, month, day] = dateKey.split('-');
  return `${month}/${day}/${year}`;
}

/** Version header line, e.g. `1.0.2 · 08/07/2026`. */
export function formatVersionNotesHeading(entry: Pick<VersionNotesEntry, 'version' | 'date'>): string {
  return `${entry.version} · ${formatVersionNotesDate(entry.date)}`;
}

export type VersionNotesDayGroup = {
  date: string;
  /** Newest first within the day. */
  entries: VersionNotesEntry[];
};

/**
 * Group catalog rows by ship date. Days and versions within a day stay newest-first
 * (assumes `entries` is already newest-first).
 */
export function groupVersionNotesByDate(
  entries: readonly VersionNotesEntry[],
): VersionNotesDayGroup[] {
  const groups: VersionNotesDayGroup[] = [];
  const indexByDate = new Map<string, number>();

  for (const entry of entries) {
    const existing = indexByDate.get(entry.date);
    if (existing === undefined) {
      indexByDate.set(entry.date, groups.length);
      groups.push({ date: entry.date, entries: [entry] });
      continue;
    }
    groups[existing]!.entries.push(entry);
  }

  return groups;
}
