import { File } from 'expo-file-system';

import { getSupabaseClient } from './supabase';

const BUCKET = 'app-media';
const MARKER_PREFIX = 'ontrack-media:';
const MISSING_LOCAL_MEDIA = Symbol('missing-local-media');
/** Signed URLs are minted for 30 days; refresh from cache well before expiry. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30;
const SIGNED_URL_CACHE_MS = 60 * 60 * 24 * 7 * 1000;
const localUploadCache = new Map<string, string>();
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

function isNativeLocalMediaUri(value: string): boolean {
  return value.startsWith('file://') || value.startsWith('content://');
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function extension(uri: string) {
  const match = /\.([a-zA-Z0-9]{1,8})(?:[?#]|$)/.exec(uri);
  return match ? `.${match[1].toLowerCase()}` : '.jpg';
}

function contentType(uri: string) {
  const ext = extension(uri);
  if (ext === '.png') return 'image/png';
  if (ext === '.heic' || ext === '.heif') return 'image/heic';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function markerFromSignedUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    const prefix = `/storage/v1/object/sign/${BUCKET}/`;
    const index = url.pathname.indexOf(prefix);
    if (index < 0) return undefined;
    return `${MARKER_PREFIX}${decodeURIComponent(url.pathname.slice(index + prefix.length))}`;
  } catch {
    return undefined;
  }
}

function isImageItem(value: object): boolean {
  return (value as { kind?: unknown }).kind === 'image';
}

async function uploadLocalUri(userId: string, domain: string, uri: string) {
  const cached = localUploadCache.get(uri);
  if (cached) return cached;
  const client = getSupabaseClient();
  if (!client) return uri;

  const path = `${userId}/${domain}/${stableHash(uri)}${extension(uri)}`;
  const file = new File(uri);
  // Picker and camera results may live in an OS-managed cache. Older records
  // can therefore outlive their file; omit that broken media reference without
  // blocking the rest of the account promotion.
  if (!file.exists) return MISSING_LOCAL_MEDIA;
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch (error) {
    if (!file.exists) return MISSING_LOCAL_MEDIA;
    throw error;
  }
  const { error } = await client.storage.from(BUCKET).upload(path, bytes, {
    contentType: contentType(uri),
    upsert: true,
  });
  if (error) throw error;
  const marker = `${MARKER_PREFIX}${path}`;
  localUploadCache.set(uri, marker);
  return marker;
}

async function prepareValue(userId: string, domain: string, value: unknown): Promise<unknown> {
  if (typeof value === 'string') {
    if (value.startsWith(MARKER_PREFIX)) return value;
    const existingMarker = markerFromSignedUrl(value);
    if (existingMarker) return existingMarker;
    if (isNativeLocalMediaUri(value)) return uploadLocalUri(userId, domain, value);
    return value;
  }
  if (Array.isArray(value)) {
    const items = await Promise.all(value.map((item) => prepareValue(userId, domain, item)));
    return items.filter((item) => item !== MISSING_LOCAL_MEDIA);
  }
  if (value && typeof value === 'object') {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, item]) => [
        key,
        await prepareValue(userId, domain, item),
      ] as const),
    );
    // Vision-board image cards are useless without their media. Drop the whole
    // item instead of uploading a kind:'image' record with no uri.
    if (
      isImageItem(value) &&
      entries.some(([key, item]) => key === 'uri' && item === MISSING_LOCAL_MEDIA)
    ) {
      return MISSING_LOCAL_MEDIA;
    }
    return Object.fromEntries(entries.filter(([, item]) => item !== MISSING_LOCAL_MEDIA));
  }
  return value;
}

async function resolveMarker(marker: string) {
  const cached = signedUrlCache.get(marker);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const client = getSupabaseClient();
  if (!client) return marker;
  const path = marker.slice(MARKER_PREFIX.length);
  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  signedUrlCache.set(marker, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_CACHE_MS,
  });
  return data.signedUrl;
}

async function resolveValue(value: unknown): Promise<unknown> {
  if (typeof value === 'string') {
    if (value.startsWith(MARKER_PREFIX)) return resolveMarker(value);
    // Persisted board/meal state may still hold an older signed URL. Re-mint
    // from the embedded storage path so cold launches and long sessions stay valid.
    const marker = markerFromSignedUrl(value);
    if (marker) return resolveMarker(marker);
    return value;
  }
  if (Array.isArray(value)) return Promise.all(value.map(resolveValue));
  if (value && typeof value === 'object') {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, item]) => [key, await resolveValue(item)] as const),
    );
    return Object.fromEntries(entries);
  }
  return value;
}

export async function prepareCloudMedia(
  userId: string,
  domain: string,
  payload: Record<string, unknown>,
) {
  return (await prepareValue(userId, domain, payload)) as Record<string, unknown>;
}

export async function resolveCloudMedia(payload: Record<string, unknown>) {
  return (await resolveValue(payload)) as Record<string, unknown>;
}
