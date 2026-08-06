/**
 * Map rental company display names → brand domains for logo lookup.
 */

const RENTAL_COMPANY_DOMAINS: Array<{ match: RegExp; domain: string }> = [
  { match: /\bhertz\b/i, domain: 'hertz.com' },
  { match: /\benterprise\b/i, domain: 'enterprise.com' },
  { match: /\bavis\b/i, domain: 'avis.com' },
  { match: /\bbudget\b/i, domain: 'budget.com' },
  { match: /\bnational\b/i, domain: 'nationalcar.com' },
  { match: /\balamo\b/i, domain: 'alamo.com' },
  { match: /\bsixt\b/i, domain: 'sixt.com' },
  { match: /\beuropcar\b/i, domain: 'europcar.com' },
  { match: /\bthrifty\b/i, domain: 'thrifty.com' },
  { match: /\bdollar\b/i, domain: 'dollar.com' },
  { match: /\bturo\b/i, domain: 'turo.com' },
  { match: /\bpayless\b/i, domain: 'paylesscar.com' },
  { match: /\bfox\b/i, domain: 'foxrentacar.com' },
  { match: /\bace\b/i, domain: 'acerentacar.com' },
  { match: /\bkeddy\b/i, domain: 'keddy.com' },
];

/** Brand homepage domain for a rental company name, when known. */
export function rentalCompanyDomain(company?: string): string | undefined {
  const value = company?.trim();
  if (!value) return undefined;
  for (const entry of RENTAL_COMPANY_DOMAINS) {
    if (entry.match.test(value)) return entry.domain;
  }
  return undefined;
}
