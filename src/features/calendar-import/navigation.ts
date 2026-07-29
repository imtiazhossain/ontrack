export function redirectIncomingSystemPath(path: string): string {
  try {
    const url = new URL(path, 'ontrack://app');
    if (url.hostname === 'expo-sharing') return '/share-event';
  } catch {
    return '/';
  }
  return path;
}
