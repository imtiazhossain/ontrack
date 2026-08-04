import { Directory, File, Paths } from 'expo-file-system';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import TravelDocumentReader from '../../../modules/travel-document-reader';

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif)$/i;
const CONFIRMATIONS_MARKER = '/Documents/travel-confirmations/';

export function isImageConfirmationUri(uri: string): boolean {
  const path = uri.split('?')[0] ?? uri;
  return IMAGE_EXT.test(path);
}

export function normalizeConfirmationUris(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const uris = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith('file://') || entry.startsWith('content://'));
  return uris.length ? uris : undefined;
}

/** Resolve stored confirmation URIs against the current app Documents container. */
export function resolveConfirmationUris(uris?: string[]): string[] {
  if (!uris?.length) return [];
  const resolved: string[] = [];
  for (const uri of uris) {
    const next = resolveConfirmationUri(uri);
    if (next) resolved.push(next);
  }
  return resolved;
}

function resolveConfirmationUri(uri: string): string | undefined {
  try {
    if (new File(uri).exists) return uri;
  } catch {
    // Fall through to Documents-relative remap.
  }

  if (Platform.OS === 'web' || !uri.startsWith('file://')) return undefined;

  const markerIndex = uri.indexOf(CONFIRMATIONS_MARKER);
  if (markerIndex < 0) return undefined;
  const relative = uri
    .slice(markerIndex + '/Documents/'.length)
    .split('?')[0]
    ?.replace(/^\/+/, '');
  if (!relative) return undefined;

  try {
    const remapped = new File(Paths.document, ...relative.split('/').filter(Boolean));
    return remapped.exists ? remapped.uri : undefined;
  } catch {
    return undefined;
  }
}

function extensionForAsset(fileName: string, uri: string): string {
  const fromName = /\.([a-z0-9]+)$/i.exec(fileName)?.[1];
  if (fromName) return `.${fromName.toLowerCase()}`;
  const fromUri = /\.([a-z0-9]+)$/i.exec(uri.split('?')[0] ?? '')?.[1];
  if (fromUri) return `.${fromUri.toLowerCase()}`;
  return '.bin';
}

/**
 * Copy picker/cache confirmation files into durable app documents storage.
 * Temporary OS cache URIs must not be persisted in store state.
 */
export async function persistConfirmationAssets(
  assets: { uri: string; fileName: string }[],
  kind: 'flight' | 'rental' | 'stay' | 'transport',
): Promise<string[]> {
  if (Platform.OS === 'web') {
    return assets.map((asset) => asset.uri).filter(Boolean);
  }
  const directory = new Directory(Paths.document, 'travel-confirmations', kind);
  directory.create({ idempotent: true, intermediates: true });
  const uris: string[] = [];
  const stamp = Date.now();
  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    if (!asset.uri) continue;
    const extension = extensionForAsset(asset.fileName, asset.uri);
    const safeStem = (asset.fileName || `${kind}-confirmation`)
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 40);
    const destination = new File(
      directory,
      `${safeStem || kind}-${stamp}-${index}${extension}`,
    );
    try {
      const source = new File(asset.uri);
      await source.copy(destination);
      uris.push(destination.uri);
    } catch {
      // Fall back to the source URI when copy fails (e.g. content:// on some Android builds).
      if (asset.uri.startsWith('file://') || asset.uri.startsWith('content://')) {
        uris.push(asset.uri);
      }
    }
  }
  return uris;
}

/** List confirmation files currently on disk for a travel kind. */
export function listConfirmationUris(kind: 'flight' | 'rental' | 'stay' | 'transport'): string[] {
  if (Platform.OS === 'web') return [];
  try {
    const directory = new Directory(Paths.document, 'travel-confirmations', kind);
    if (!directory.exists) return [];
    return directory
      .list()
      .flatMap((entry) => {
        try {
          if (entry instanceof File && entry.exists) return [entry.uri];
        } catch {
          return [];
        }
        return [];
      });
  } catch {
    return [];
  }
}

/**
 * Resolve confirmation URIs for display/open: prefer stored paths (remapped to the
 * current Documents container), then fall back to files already on disk.
 */
export function confirmationUrisForDisplay(
  stored: string[] | undefined,
  kind: 'flight' | 'rental' | 'stay' | 'transport',
): string[] {
  const resolved = resolveConfirmationUris(stored);
  if (resolved.length) return resolved;
  const normalized = normalizeConfirmationUris(stored);
  if (normalized?.length) return normalized;
  return listConfirmationUris(kind);
}

/** Open confirmations in the system document preview (Quick Look / viewer). */
export async function openConfirmationAttachments(uris: string[]): Promise<void> {
  const existing = resolveConfirmationUris(uris);
  const openable = existing.length ? existing : uris.filter((uri) => uri.startsWith('file://'));
  if (!openable.length) return;

  try {
    if (TravelDocumentReader?.previewDocumentsAsync) {
      await TravelDocumentReader.previewDocumentsAsync(openable);
      return;
    }
  } catch (error) {
    if (__DEV__) console.warn('[openConfirmationAttachments] preview failed', error);
  }

  await Linking.openURL(openable[0]);
}
