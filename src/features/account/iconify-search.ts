import { asNonEmptyString } from '@/utils/parse';

import { CURATED_ICONIFY_IDS, normalizeIconifyId } from './profile-avatar-model';

type IconifySearchResponse = {
  icons?: unknown;
};

/** Live Iconify search; falls back to curated set when query is empty. */
export async function searchIconifyIcons(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [...CURATED_ICONIFY_IDS];
  }
  try {
    const url = `https://api.iconify.design/search?query=${encodeURIComponent(trimmed)}&limit=64`;
    const response = await fetch(url);
    if (!response.ok) return [...CURATED_ICONIFY_IDS];
    const payload = (await response.json()) as IconifySearchResponse;
    if (!Array.isArray(payload.icons)) return [...CURATED_ICONIFY_IDS];
    const ids = payload.icons
      .map((item) => normalizeIconifyId(item))
      .filter((item): item is string => Boolean(item));
    return ids.length > 0 ? ids : [...CURATED_ICONIFY_IDS];
  } catch {
    return [...CURATED_ICONIFY_IDS];
  }
}

export function iconifyLabel(iconId: string): string {
  const id = asNonEmptyString(iconId) ?? '';
  const name = id.includes(':') ? id.slice(id.indexOf(':') + 1) : id;
  return name.replace(/[-_]/g, ' ');
}
