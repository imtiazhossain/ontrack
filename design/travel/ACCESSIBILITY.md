# Accessibility Contract

## Touch targets
- iOS minimum: 44×44 pt
- Android minimum: 48×48 dp

## Labels
- Add button: `Add trip`
- Edit button: `Edit <destination> trip`
- Itinerary: `View itinerary for <destination>`
- Carousel image: decorative if the destination is already conveyed in adjacent text; otherwise concise destination alt/label.
- Carousel paging dots are not independently focusable. Announce page changes, e.g. `Photo 2 of 3`, only when useful and non-spammy.

## Dynamic type / font scaling
Respect platform font scaling. At large sizes, allow layout to stack rather than clip, ellipsize critical data, or shrink tap targets.

## Contrast
Maintain WCAG-oriented contrast for essential text and controls. Photo overlays require scrims when needed.

## Reduced motion
When Reduce Motion / animator duration scale indicates reduced motion, remove hero crossfade or use a near-instant opacity swap and avoid card scaling.

## Screen readers
Reading order: hero title → subtitle → add trip → Your Trips/count → each trip destination → location → members → dates → duration → view itinerary → edit action (or place edit before content if app convention requires; keep it consistent).
