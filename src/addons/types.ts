import type {
  Entitlement,
  EntitlementSource,
  EntitlementState,
} from '@/entitlements/types';

export type AddonId = 'food' | 'fitness' | 'plants' | 'travel';

export interface AddonDefinition {
  id: AddonId;
  name: string;
  description: string;
  categoryIds: readonly string[];
  tabRoute?: 'workouts' | 'plants' | 'travel';
}

export type AddonEnabledState = Record<AddonId, boolean>;

export type AddonEntitlementSource = EntitlementSource;
export type AddonEntitlement = Entitlement;
export type AddonEntitlementState = EntitlementState<AddonId>;
