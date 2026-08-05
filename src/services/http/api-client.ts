import { fetch } from 'expo/fetch';

import { authHeader } from '@/services/cloud/access-token';

export type ApiErrorBody = {
  error?: string;
  code?: string;
};

export type ApiRequestOptions<TError extends Error> = {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Abort the request after this many milliseconds. */
  timeoutMs?: number;
  /** Extra headers merged after auth (Content-Type is set automatically for JSON bodies). */
  headers?: Record<string, string>;
  offlineMessage: string;
  unavailableMessage: string;
  defaultErrorCode?: string;
  createError: (message: string, code?: string, status?: number) => TError;
  /** When false, skip attaching the cloud access token. Default true. */
  authenticate?: boolean;
};

/**
 * Authenticated JSON fetch with AbortError passthrough and offline/error mapping.
 * Resolve the URL before calling so domain NotConfigured errors stay outside this catch.
 */
export async function apiRequest<T, TError extends Error>(
  options: ApiRequestOptions<TError>,
): Promise<T> {
  const {
    url,
    method = options.body === undefined ? 'GET' : 'POST',
    body,
    signal,
    timeoutMs,
    headers = {},
    offlineMessage,
    unavailableMessage,
    defaultErrorCode,
    createError,
    authenticate = true,
  } = options;

  const controller = timeoutMs !== undefined ? new AbortController() : undefined;
  const timer =
    controller && timeoutMs !== undefined
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined;
  const onExternalAbort = () => controller?.abort();
  signal?.addEventListener('abort', onExternalAbort, { once: true });
  const requestSignal = controller?.signal ?? signal;

  let response: Response;
  try {
    const auth = authenticate ? await authHeader() : {};
    response = await fetch(url, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...auth,
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: requestSignal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw createError(
      offlineMessage,
      defaultErrorCode === undefined ? 'OFFLINE' : defaultErrorCode,
    );
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    signal?.removeEventListener('abort', onExternalAbort);
  }

  if (!response.ok) {
    const parsed = (await response.json().catch(() => undefined)) as
      | ApiErrorBody
      | undefined;
    throw createError(
      parsed?.error ?? unavailableMessage,
      parsed?.code ?? defaultErrorCode,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}
