let suppressionDepth = 0;

export function withoutGuestDirtyTracking<T>(operation: () => T): T {
  suppressionDepth += 1;
  try {
    return operation();
  } finally {
    suppressionDepth -= 1;
  }
}

export function isGuestDirtyTrackingSuppressed() {
  return suppressionDepth > 0;
}
