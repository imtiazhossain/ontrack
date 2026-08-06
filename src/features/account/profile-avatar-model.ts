import { asNonEmptyString, asString } from '@/utils/parse';

export type ProfileAvatarKind = 'initials' | 'icon' | 'photo';

export type ProfileAvatarMeta = {
  kind: ProfileAvatarKind;
  /** `#RRGGBB` when set. */
  color?: string;
  /** Iconify id (`prefix:name`) when kind is `icon`. */
  iconId?: string;
  /** Private storage path when kind is `photo`. */
  photoPath?: string;
  /** Local durable file URI for self / offline preview. */
  localPhotoUri?: string;
};

export const DEFAULT_AVATAR_COLOR = '#9A7654';

const ICONIFY_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}:[a-z0-9][a-z0-9._-]{0,127}$/;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export const CURATED_ICONIFY_IDS = [
  'mdi:account',
  'mdi:account-circle',
  'mdi:emoticon-happy-outline',
  'mdi:airplane',
  'mdi:map-marker',
  'mdi:home-heart',
  'mdi:leaf',
  'mdi:dumbbell',
  'mdi:camera',
  'mdi:star-outline',
  'mdi:paw',
  'mdi:bike',
  'lucide:smile',
  'ph:user-circle',
  'tabler:mood-smile',
  'solar:user-bold',
] as const;

export function isProfileAvatarKind(value: unknown): value is ProfileAvatarKind {
  return value === 'initials' || value === 'icon' || value === 'photo';
}

export function normalizeAvatarColor(value: unknown): string | undefined {
  const raw = asNonEmptyString(asString(value));
  if (!raw) return undefined;
  let color = raw.startsWith('#') ? raw : `#${raw}`;
  // Color pickers may return #RRGGBBAA — avatars store opaque hex only.
  if (/^#[0-9A-Fa-f]{8}$/.test(color)) color = color.slice(0, 7);
  if (!HEX_COLOR_RE.test(color)) return undefined;
  return color.toUpperCase();
}

export function normalizeIconifyId(value: unknown): string | undefined {
  const id = asNonEmptyString(asString(value))?.toLowerCase();
  if (!id || !ICONIFY_ID_RE.test(id)) return undefined;
  return id;
}

export function iconifySvgUrl(iconId: string, color?: string): string | undefined {
  const id = normalizeIconifyId(iconId);
  if (!id) return undefined;
  const [prefix, name] = id.split(':');
  if (!prefix || !name) return undefined;
  const tint = normalizeAvatarColor(color) ?? DEFAULT_AVATAR_COLOR;
  const encoded = encodeURIComponent(tint);
  return `https://api.iconify.design/${prefix}/${name}.svg?color=${encoded}`;
}

export function initialsFromName(name: string, maxLetters = 2): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, Math.max(1, maxLetters))
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Diameter fraction for initials — never use AppText `fit` inside the circle. */
export const AVATAR_INITIALS_SIZE_RATIO = 0.48;
export const AVATAR_INITIALS_MIN_FONT = 16;
export const AVATAR_ICON_SIZE_RATIO = 0.55;
export const AVATAR_ICON_MIN_SIZE = 14;

/** Fixed initials type size from avatar diameter (no shrink-to-fit). */
export function avatarInitialsFontSize(diameter: number): number {
  const size = Number.isFinite(diameter) ? Math.max(0, diameter) : 0;
  // Keep two letters inside the circle — never exceed the diameter fraction.
  const byRatio = Math.round(size * (size >= 40 ? AVATAR_INITIALS_SIZE_RATIO : 0.5));
  const maxInCircle = Math.max(1, Math.floor(size * 0.6));
  const floor =
    size >= 40
      ? AVATAR_INITIALS_MIN_FONT
      : Math.max(size >= 20 ? 10 : 7, Math.round(size * 0.42));
  const preferred = Math.max(floor, byRatio);
  return Math.min(preferred, maxInCircle);
}

/** Icon glyph size from avatar diameter. */
export function avatarIconGlyphSize(diameter: number): number {
  const size = Number.isFinite(diameter) ? Math.max(0, diameter) : 0;
  return Math.max(AVATAR_ICON_MIN_SIZE, Math.round(size * AVATAR_ICON_SIZE_RATIO));
}

export function emptyAvatarMeta(): ProfileAvatarMeta {
  return { kind: 'initials' };
}

/** True when the profile row has no custom tint/icon/photo yet. */
export function isDefaultAvatarMeta(meta: ProfileAvatarMeta): boolean {
  return (
    meta.kind === 'initials' &&
    !meta.color &&
    !meta.iconId &&
    !meta.photoPath &&
    !meta.localPhotoUri
  );
}

/** True when the device has a customized self avatar worth keeping. */
export function isCustomAvatarMeta(meta: ProfileAvatarMeta): boolean {
  return (
    meta.kind === 'photo' ||
    meta.kind === 'icon' ||
    Boolean(meta.color) ||
    Boolean(meta.localPhotoUri)
  );
}

/**
 * On friends hydrate after sign-in, do not replace a customized local avatar
 * with a bare cloud initials row (common for new/guest upgrades).
 */
export function mergeAvatarOnHydrate(
  local: ProfileAvatarMeta,
  remote: ProfileAvatarMeta,
): ProfileAvatarMeta {
  if (isDefaultAvatarMeta(remote) && isCustomAvatarMeta(local)) {
    return normalizeAvatarMeta(local);
  }
  return normalizeAvatarMeta({
    ...remote,
    ...(remote.color || local.color
      ? { color: remote.color ?? local.color }
      : {}),
    // Keep a local preview only when the cloud row has no photo yet — otherwise
    // a stale guest file would mask the account photo in ProfileAvatar.
    ...(local.kind === 'photo' &&
    local.localPhotoUri &&
    !(remote.kind === 'photo' && remote.photoPath)
      ? { localPhotoUri: local.localPhotoUri }
      : {}),
  });
}

export function normalizeAvatarMeta(input: unknown): ProfileAvatarMeta {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return emptyAvatarMeta();
  }
  const row = input as Record<string, unknown>;
  const color = normalizeAvatarColor(row.color ?? row.avatarColor ?? row.avatar_color);
  const iconId = normalizeIconifyId(
    row.iconId ?? row.avatarIconId ?? row.avatar_icon_id,
  );
  const photoPath = asNonEmptyString(
    asString(row.photoPath ?? row.avatarPhotoPath ?? row.avatar_photo_path),
  );
  const localPhotoUri = asNonEmptyString(
    asString(row.localPhotoUri ?? row.local_photo_uri),
  );
  const kindRaw = row.kind ?? row.avatarKind ?? row.avatar_kind;
  let kind: ProfileAvatarKind = isProfileAvatarKind(kindRaw) ? kindRaw : 'initials';

  if (kind === 'icon' && !iconId) kind = 'initials';
  if (kind === 'photo' && !photoPath && !localPhotoUri) kind = 'initials';

  return {
    kind,
    ...(color ? { color } : {}),
    ...(kind === 'icon' && iconId ? { iconId } : {}),
    ...(kind === 'photo' && photoPath ? { photoPath } : {}),
    ...(kind === 'photo' && localPhotoUri ? { localPhotoUri } : {}),
  };
}

export function avatarMetaFromProfileRow(row: Record<string, unknown>): ProfileAvatarMeta {
  return normalizeAvatarMeta({
    kind: row.avatar_kind ?? row.avatarKind,
    color: row.avatar_color ?? row.avatarColor,
    iconId: row.avatar_icon_id ?? row.avatarIconId,
    photoPath: row.avatar_photo_path ?? row.avatarPhotoPath,
  });
}

export function resolveAvatarColor(
  meta: ProfileAvatarMeta | undefined,
  fallback: string = DEFAULT_AVATAR_COLOR,
): string {
  return normalizeAvatarColor(meta?.color) ?? fallback;
}
