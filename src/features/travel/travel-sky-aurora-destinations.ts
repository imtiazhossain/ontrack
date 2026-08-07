/**
 * Destinations where a night-sky aurora curtain is a meaningful place cue.
 * Leaf module — keep Reanimated/SVG aurora art out of chrome-color imports.
 * Broader than nordic *ground* silhouettes (e.g. Fairbanks) and narrower
 * than all Nordic capitals (Stockholm is not an aurora cue).
 */

import { normalizeDestinationLabel } from '@/features/travel/travel-sky-destination-climate';

const AURORA_DESTINATION_RE =
  /iceland|reykjav|akureyri|norway|troms|svalbard|lapland|fairbanks|yellowknife|icelandic/;

export function destinationShowsAurora(destination: string): boolean {
  const d = normalizeDestinationLabel(destination);
  if (!d) return false;
  return AURORA_DESTINATION_RE.test(d);
}
