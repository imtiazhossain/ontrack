import { resolve4, resolve6 } from 'node:dns/promises';

import { isPrivateHostname, isPrivateIpAddress } from './url-safety';

/**
 * Server-only: resolves the hostname and rejects when any address is private.
 * Resolves twice in quick succession and requires at least one overlapping
 * public address to shrink (not eliminate) DNS-rebinding windows before fetch.
 * Keep this module out of client bundles — it imports Node DNS APIs.
 */
export async function assertPublicDns(hostname: string): Promise<string[]> {
  if (isPrivateHostname(hostname)) throw new Error('BLOCKED_LINK');

  async function resolveOnce(): Promise<string[]> {
    const settled = await Promise.allSettled([resolve4(hostname), resolve6(hostname)]);
    return settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  }

  const first = await resolveOnce();
  if (!first.length || first.some(isPrivateIpAddress)) throw new Error('BLOCKED_LINK');

  const second = await resolveOnce();
  if (!second.length || second.some(isPrivateIpAddress)) throw new Error('BLOCKED_LINK');

  const stable = second.filter((address) => first.includes(address));
  if (!stable.length) throw new Error('BLOCKED_LINK');
  return stable;
}
