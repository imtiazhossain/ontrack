export type EntitlementSource = 'included' | 'testing' | 'purchase' | 'bundle' | 'admin';

export interface Entitlement {
  active: boolean;
  source: EntitlementSource;
  expiresAt?: string;
}

export type EntitlementState<Id extends string> = Record<Id, Entitlement>;
