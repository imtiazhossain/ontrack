import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type ApiUrlFailureReason = 'missing' | 'insecure';

export type ResolveApiUrlOptions = {
  /** Explicit public base URL from env (no trailing slash). */
  configuredBaseUrl?: string;
  /**
   * When true, use configuredBaseUrl before the web relative path / Expo host.
   * Nutrition and recipe clients prefer a dedicated API host when set.
   */
  preferConfiguredFirst?: boolean;
  /** Reject non-HTTPS bases outside __DEV__ (flight search). */
  requireHttpsInProduction?: boolean;
  createNotConfiguredError: (reason: ApiUrlFailureReason) => Error;
};

/**
 * Resolve an Expo Router API path for native, web, and configured remote hosts.
 * Shared by nutrition, plants, recipes, movies, and travel clients.
 */
export function resolveExpoApiUrl(path: string, options: ResolveApiUrlOptions): string {
  const configured = options.configuredBaseUrl?.replace(/\/$/, '');
  if (options.preferConfiguredFirst && configured) {
    return assertHttpsIfNeeded(`${configured}${path}`, options);
  }
  if (Platform.OS === 'web') return path;
  const developmentHost = __DEV__ ? Constants.expoConfig?.hostUri : undefined;
  const baseUrl = developmentHost
    ? `http://${developmentHost}`
    : configured;
  if (!baseUrl) throw options.createNotConfiguredError('missing');
  return assertHttpsIfNeeded(`${baseUrl}${path}`, options);
}

function assertHttpsIfNeeded(url: string, options: ResolveApiUrlOptions): string {
  if (
    options.requireHttpsInProduction &&
    !__DEV__ &&
    !url.startsWith('https://')
  ) {
    throw options.createNotConfiguredError('insecure');
  }
  return url;
}
