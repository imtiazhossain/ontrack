/**
 * Shared HTTPS-only opener for untrusted URLs (AI sources, synced recipe links).
 * Blocks javascript:, custom schemes, and protocol-relative abuse.
 */
import * as Linking from 'expo-linking';

export function isHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function safeHttpsUrl(value: unknown): string | undefined {
  return typeof value === 'string' && isHttpsUrl(value.trim()) ? value.trim() : undefined;
}

export async function openHttpsUrl(value: unknown): Promise<boolean> {
  const url = safeHttpsUrl(value);
  if (!url) return false;
  await Linking.openURL(url);
  return true;
}
