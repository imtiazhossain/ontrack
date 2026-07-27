import { File } from 'expo-file-system';

import { getSupabaseClient } from './supabase';

const BUCKET = 'app-media';
const MARKER_PREFIX = 'ontrack-media:';
const localUploadCache = new Map<string, string>();
const signedUrlCache = new Map<string, string>();

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

async function uploadLocalUri(userId: string, domain: string, uri: string) {
  const cached = localUploadCache.get(uri);
  if (cached) return cached;
  const client = getSupabaseClient();
  if (!client) return uri;

  const path = `${userId}/${domain}/${stableHash(uri)}${extension(uri)}`;
  const file = new File(uri);
  const bytes = await file.arrayBuffer();
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
    if (value.startsWith('file://')) return uploadLocalUri(userId, domain, value);
    return value;
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => prepareValue(userId, domain, item)));
  }
  if (value && typeof value === 'object') {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, item]) => [
        key,
        await prepareValue(userId, domain, item),
      ] as const),
    );
    return Object.fromEntries(entries);
  }
  return value;
}

async function resolveMarker(marker: string) {
  const cached = signedUrlCache.get(marker);
  if (cached) return cached;
  const client = getSupabaseClient();
  if (!client) return marker;
  const path = marker.slice(MARKER_PREFIX.length);
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 30);
  if (error) throw error;
  signedUrlCache.set(marker, data.signedUrl);
  return data.signedUrl;
}

async function resolveValue(value: unknown): Promise<unknown> {
  if (typeof value === 'string' && value.startsWith(MARKER_PREFIX)) {
    return resolveMarker(value);
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
