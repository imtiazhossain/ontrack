import {
  DEFAULT_ADDON_ENTITLEMENTS,
} from '@/addons/registry';
import { AGENTS, defaultAgentEntitlements } from '@/agents/registry';
import type { AgentEntitlementState } from '@/agents/types';
import type {
  AddonEntitlementState,
  AddonId,
} from '@/addons/types';
import type { Entitlement, EntitlementSource } from '@/entitlements/types';
import { useAddons } from '@/store/addons';
import { useAgents } from '@/store/agents';

import { getSupabaseClient } from './supabase';

const ADDON_IDS: AddonId[] = ['food', 'fitness', 'plants', 'travel', 'vision-board'];
const SOURCES: EntitlementSource[] = ['included', 'testing', 'purchase', 'bundle', 'admin'];

interface EntitlementRow {
  id: string;
  source?: string;
  status?: string;
  expiresAt?: string;
}

function parseEntitlements<Id extends string>(
  ids: readonly Id[],
  rows: readonly EntitlementRow[],
  fallback: Record<string, Entitlement>,
): Record<Id, Entitlement> {
  const now = Date.now();
  return Object.fromEntries(
    ids.map((id) => {
      const row = rows.find((item) => item.id === id);
      if (!row) return [id, fallback[id] ?? { active: false, source: 'included' }];
      const source = SOURCES.includes(row.source as EntitlementSource)
        ? (row.source as EntitlementSource)
        : 'included';
      return [
        id,
        {
          active:
            row.status === 'active' &&
            (!row.expiresAt || new Date(row.expiresAt).valueOf() > now),
          source,
          expiresAt: row.expiresAt,
        },
      ];
    }),
  ) as Record<Id, Entitlement>;
}

export async function loadAddonEntitlements(userId: string) {
  if (process.env.EXPO_PUBLIC_APP_ENV === 'testflight') {
    useAddons.getState().replaceEntitlements(
      Object.fromEntries(
        ADDON_IDS.map((id) => [id, { active: true, source: 'testing' }]),
      ) as AddonEntitlementState,
    );
    return;
  }

  const client = getSupabaseClient();
  if (!client) return;
  const { data, error } = await client
    .from('addon_entitlements')
    .select('addon_id,source,status,expires_at')
    .eq('user_id', userId);
  if (error) {
    // The beta remains usable before the optional entitlement migration is deployed.
    return;
  }
  if (!data?.length) {
    useAddons.getState().replaceEntitlements(DEFAULT_ADDON_ENTITLEMENTS);
    return;
  }
  const entitlements = parseEntitlements(
    ADDON_IDS,
    data.map((row) => ({
      id: row.addon_id,
      source: row.source,
      status: row.status,
      expiresAt: row.expires_at ?? undefined,
    })),
    DEFAULT_ADDON_ENTITLEMENTS,
  ) as AddonEntitlementState;
  useAddons.getState().replaceEntitlements(entitlements);
}

export async function loadAgentEntitlements(userId: string) {
  if (process.env.EXPO_PUBLIC_APP_ENV === 'testflight') {
    useAgents.getState().replaceEntitlements(
      Object.fromEntries(
        AGENTS.map((definition) => [
          definition.id,
          { active: true, source: 'testing' },
        ]),
      ),
    );
    return;
  }

  const client = getSupabaseClient();
  if (!client) return;
  const fallback = defaultAgentEntitlements();
  const { data, error } = await client
    .from('agent_entitlements')
    .select('agent_id,source,status,expires_at')
    .eq('user_id', userId);
  if (error || !data?.length) {
    useAgents.getState().replaceEntitlements(fallback);
    return;
  }
  useAgents.getState().replaceEntitlements(
    parseEntitlements(
      AGENTS.map((definition) => definition.id),
      data.map((row) => ({
        id: row.agent_id,
        source: row.source,
        status: row.status,
        expiresAt: row.expires_at ?? undefined,
      })),
      fallback,
    ) as AgentEntitlementState,
  );
}

export async function loadEntitlements(userId: string) {
  await Promise.all([
    loadAddonEntitlements(userId),
    loadAgentEntitlements(userId),
  ]);
}
