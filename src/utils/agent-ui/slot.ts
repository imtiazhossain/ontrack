/**
 * Agent device pool slot (1…N). Host stamps commands with the same slot so
 * parallel agents do not steal each other's daemon queue entries.
 */

let pinnedSlot: number | null = null;

export function setAgentUiSlot(slot: number | null): void {
  if (slot == null || !Number.isFinite(slot) || slot < 1) {
    pinnedSlot = null;
    return;
  }
  pinnedSlot = Math.floor(slot);
}

export function getAgentUiSlot(): number | null {
  return pinnedSlot;
}

/** Parse `slot` from a deep-link / request payload. */
export function applyAgentUiSlotFromUnknown(raw: unknown): void {
  if (raw == null) return;
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number.parseInt(raw, 10)
        : Array.isArray(raw)
          ? Number.parseInt(String(raw[0] ?? ''), 10)
          : NaN;
  if (Number.isFinite(n) && n >= 1) {
    setAgentUiSlot(n);
  }
}
