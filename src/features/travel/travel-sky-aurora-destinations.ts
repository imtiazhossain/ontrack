/**
 * Destinations where a night-sky aurora curtain is a meaningful place cue.
 * Leaf module — keep Reanimated/SVG aurora art out of chrome-color imports.
 */
export function destinationShowsAurora(destination: string): boolean {
  const d = destination.trim().toLowerCase();
  if (!d) return false;
  return /iceland|reykjav|akureyri|norway|troms|svalbard|lapland|fairbanks|yellowknife|icelandic/.test(
    d,
  );
}
