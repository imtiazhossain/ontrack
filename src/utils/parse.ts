/** Exact string values (including whitespace-only). */
export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Trimmed non-empty string. */
export function asTrimmedString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Truthy trimmed string without normalizing internal whitespace. */
export function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function asFiniteNonNegative(value: unknown): number | undefined {
  const number = asFiniteNumber(value);
  return number !== undefined && number >= 0 ? number : undefined;
}

export function asPositiveNumber(value: unknown): number | undefined {
  const number = asFiniteNumber(value);
  return number !== undefined && number > 0 ? number : undefined;
}

/** Compact display for quantities (1, 1.5, 1.25). */
export function formatCompactNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
