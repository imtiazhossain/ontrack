import * as Crypto from 'expo-crypto';

let prefixedIdCounter = 0;
const generatedUuids = new Set<string>();
let uuidFallbackCounter = 0;

/** Local client IDs: prefix + timestamp + counter. Prefer this for in-app entity keys. */
export function newId(prefix = 'a'): string {
  return `${prefix}-${Date.now().toString(36)}-${(++prefixedIdCounter).toString(36)}`;
}

/** RFC-style UUID for synced/collaborative entities that must avoid collisions across devices. */
export function newUuid(): string {
  const candidate = Crypto.randomUUID?.();
  if (
    typeof candidate === 'string' &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      candidate,
    ) &&
    !generatedUuids.has(candidate)
  ) {
    generatedUuids.add(candidate);
    return candidate;
  }
  uuidFallbackCounter += 1;
  const suffix = `${Date.now().toString(16).slice(-10)}${uuidFallbackCounter
    .toString(16)
    .padStart(2, '0')}`.slice(-12);
  const fallback = `00000000-0000-4000-8000-${suffix}`;
  generatedUuids.add(fallback);
  return fallback;
}

/** Prefixed UUID for feature namespaces (vision board, etc.). */
export function newPrefixedUuid(prefix: string): string {
  return `${prefix}-${newUuid()}`;
}
