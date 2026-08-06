/**
 * Hero place title from destination: last comma segment when multi-part
 * (`Reykjavík, Iceland` → `Iceland`), else the full destination; title fallback.
 */
export function tripHeroPlaceName(destination: string, title: string): string {
  const dest = destination.trim();
  if (!dest) return title.trim();
  const parts = dest
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length > 1) return parts[parts.length - 1]!;
  return dest;
}
