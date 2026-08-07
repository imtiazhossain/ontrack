/**
 * Force a two-line atmosphere place caption when the label is long enough
 * that a single line crowds the tagline (e.g. "Brooklyn, New York, United States").
 *
 * Prefer an editorial break before the final comma segment (usually country).
 */
export const ATMOSPHERE_LOCATION_WRAP_MIN_CHARS = 28;

export function wrapAtmosphereLocationCaption(label: string): string {
  const caption = label.replace(/\s+/g, ' ').trim();
  if (!caption) return caption;
  if (caption.length < ATMOSPHERE_LOCATION_WRAP_MIN_CHARS) return caption;
  if (caption.includes('\n')) return caption;

  const parts = caption
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts.slice(0, -1).join(', ')}\n${parts[parts.length - 1]}`;
  }

  // No commas — break at the last space in the first half of the string.
  const mid = Math.floor(caption.length / 2);
  const space = caption.lastIndexOf(' ', mid);
  if (space > 0) {
    return `${caption.slice(0, space)}\n${caption.slice(space + 1)}`;
  }
  return caption;
}
